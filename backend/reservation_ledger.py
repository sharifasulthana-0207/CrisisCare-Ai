import datetime
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.models import (
    Hospital, HospitalInventory, ResourceReservation, ResourceRequest,
    AuditLog, ReservationStatus, RequestStatus, ResourceType
)

class ReservationLedgerError(Exception):
    """Custom exception raised when reservation constraints are violated."""
    pass

class ReservationLedger:
    @staticmethod
    def calculate_hospital_capacity(hospital: Hospital, inv: HospitalInventory) -> Dict[str, Any]:
        """
        Calculates constraint-aware capacity:
        Total, Occupied, Reserved, Available, and USABLE capacity.
        Usable capacity accounts for staffing ratios and essential equipment.
        """
        # General Beds: requires nursing ratio (e.g. 1 nurse per 4 general beds)
        gen_total = hospital.total_general_beds
        gen_occupied = inv.occupied_general_beds
        gen_reserved = inv.reserved_general_beds
        gen_physical_available = max(0, gen_total - gen_occupied - gen_reserved)
        # Staffing constraint: total nurses on duty minus ICU nurses
        ward_nurses = max(0, inv.nurses_on_duty - inv.icu_nurses_on_duty)
        staffed_gen_beds = ward_nurses * 4
        # Usable general beds is min of physical available and staffed unassigned
        gen_usable = max(0, min(gen_physical_available, staffed_gen_beds - gen_occupied))

        # ICU Beds: requires 1:2 ICU nurse ratio AND ventilator/monitor availability
        icu_total = hospital.total_icu_beds
        icu_occupied = inv.occupied_icu_beds
        icu_reserved = inv.reserved_icu_beds
        icu_physical_available = max(0, icu_total - icu_occupied - icu_reserved)
        staffed_icu_beds = inv.icu_nurses_on_duty * 2
        icu_usable = max(0, min(icu_physical_available, staffed_icu_beds - icu_occupied))

        # Ventilators
        vent_total = hospital.total_ventilators
        vent_occupied = inv.in_use_ventilators
        vent_reserved = inv.reserved_ventilators
        vent_available = max(0, vent_total - vent_occupied - vent_reserved)

        # Oxygen
        o2_current = inv.current_oxygen_liters
        o2_reserved = inv.reserved_oxygen_liters
        o2_available = max(0.0, o2_current - o2_reserved)
        o2_protected_reserve = hospital.total_oxygen_capacity * hospital.min_reserve_pct
        o2_transferable_surplus = max(0.0, o2_available - o2_protected_reserve)

        # Blood & Meds
        blood_neg_avail = max(0, inv.blood_o_neg_units - inv.reserved_blood_units)
        blood_neg_reserve = int(inv.blood_o_neg_units * hospital.min_reserve_pct)
        blood_neg_surplus = max(0, blood_neg_avail - blood_neg_reserve)

        # Ambulances
        amb_avail = max(0, inv.ambulances_available - inv.reserved_ambulances)

        # Status Assessment
        is_critical = False
        is_attention = False
        reasons = []

        if icu_usable <= 2:
            is_critical = True
            reasons.append(f"ICU critical: only {icu_usable} usable bed(s) remaining.")
        elif icu_usable <= 5:
            is_attention = True
            reasons.append(f"ICU under pressure: {icu_usable} usable bed(s).")

        hours_to_o2_reserve = 999.0
        if inv.hourly_consumption_rate > 0:
            usable_o2 = max(0.0, o2_available - o2_protected_reserve)
            hours_to_o2_reserve = round(usable_o2 / inv.hourly_consumption_rate, 1)
            if hours_to_o2_reserve <= 6:
                is_critical = True
                reasons.append(f"Oxygen supply: may breach protected reserve in {hours_to_o2_reserve}h.")
            elif hours_to_o2_reserve <= 18:
                is_attention = True
                reasons.append(f"Oxygen supply: reserve breach projected in {hours_to_o2_reserve}h.")

        status = "CRITICAL" if is_critical else ("ATTENTION" if is_attention else "HEALTHY")
        status_reason = "; ".join(reasons) if reasons else "Resources operating safely above protected reserve thresholds."

        return {
            "general_beds": {
                "total": gen_total,
                "occupied": gen_occupied,
                "available": gen_physical_available,
                "reserved": gen_reserved,
                "usable": gen_usable,
                "occupancy_pct": round((gen_occupied / gen_total) * 100, 1) if gen_total else 0.0,
            },
            "icu_beds": {
                "total": icu_total,
                "occupied": icu_occupied,
                "available": icu_physical_available,
                "reserved": icu_reserved,
                "usable": icu_usable,
                "occupancy_pct": round((icu_occupied / icu_total) * 100, 1) if icu_total else 0.0,
            },
            "ventilators": {
                "total": vent_total,
                "occupied": vent_occupied,
                "available": vent_available,
                "reserved": vent_reserved,
                "usable": vent_available,
                "occupancy_pct": round((vent_occupied / vent_total) * 100, 1) if vent_total else 0.0,
            },
            "oxygen_liters": {
                "capacity": hospital.total_oxygen_capacity,
                "current": o2_current,
                "reserved": o2_reserved,
                "available": o2_available,
                "protected_reserve": o2_protected_reserve,
                "transferable_surplus": o2_transferable_surplus,
                "hourly_rate": inv.hourly_consumption_rate,
                "hours_to_reserve": hours_to_o2_reserve,
            },
            "blood_supplies": {
                "o_neg_units": inv.blood_o_neg_units,
                "o_pos_units": inv.blood_o_pos_units,
                "transferable_o_neg": blood_neg_surplus,
            },
            "ambulances": {
                "total": hospital.total_ambulances,
                "available": amb_avail,
                "reserved": inv.reserved_ambulances,
            },
            "status": status,
            "status_reason": status_reason,
        }

    @staticmethod
    def get_transferable_surplus(hospital: Hospital, inv: HospitalInventory, resource_type: str) -> float:
        """
        Determines how many units of a resource a hospital can donate
        WITHOUT violating its protected operational reserve.
        """
        min_reserve = hospital.min_reserve_pct

        if resource_type == ResourceType.VENTILATORS.value:
            # Protected reserve of total ventilators
            protected = int(hospital.total_ventilators * min_reserve)
            current_free = max(0, hospital.total_ventilators - inv.in_use_ventilators - inv.reserved_ventilators)
            return max(0.0, float(current_free - protected))

        elif resource_type == ResourceType.ICU_BEDS.value:
            protected = int(hospital.total_icu_beds * min_reserve)
            current_usable = max(0, hospital.total_icu_beds - inv.occupied_icu_beds - inv.reserved_icu_beds)
            return max(0.0, float(current_usable - protected))

        elif resource_type == ResourceType.GENERAL_BEDS.value:
            protected = int(hospital.total_general_beds * min_reserve)
            current_free = max(0, hospital.total_general_beds - inv.occupied_general_beds - inv.reserved_general_beds)
            return max(0.0, float(current_free - protected))

        elif resource_type == ResourceType.OXYGEN_LITERS.value:
            protected = hospital.total_oxygen_capacity * min_reserve
            current_free = max(0.0, inv.current_oxygen_liters - inv.reserved_oxygen_liters)
            return max(0.0, float(current_free - protected))

        elif resource_type == ResourceType.AMBULANCES.value:
            protected = max(1, int(hospital.total_ambulances * min_reserve))
            current_free = max(0, inv.ambulances_available - inv.reserved_ambulances)
            return max(0.0, float(current_free - protected))

        elif resource_type == ResourceType.BLOOD_O_NEG.value:
            protected = int(inv.blood_o_neg_units * min_reserve)
            current_free = max(0, inv.blood_o_neg_units - inv.reserved_blood_units)
            return max(0.0, float(current_free - protected))

        return 0.0

    @staticmethod
    def reserve_resource(
        db: Session,
        request_id: Optional[int],
        donor_hospital_id: int,
        recipient_hospital_id: int,
        resource_type: str,
        quantity: float,
        user_role: str = "Authorized Emergency Coordinator",
        notes: str = ""
    ) -> ResourceReservation:
        """
        Transaction-safe reservation creation with strict protected reserve checks.
        Prevents duplicate allocation by locking and committing atomically.
        """
        # Fetch donor hospital and inventory with row lock where supported
        donor = db.query(Hospital).filter(Hospital.id == donor_hospital_id).first()
        recipient = db.query(Hospital).filter(Hospital.id == recipient_hospital_id).first()
        if not donor or not recipient:
            raise ReservationLedgerError("Invalid donor or recipient hospital identifier.")

        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == donor_hospital_id).first()
        if not inv:
            raise ReservationLedgerError("Donor hospital inventory record not found.")

        # Check transferable surplus
        surplus = ReservationLedger.get_transferable_surplus(donor, inv, resource_type)
        if quantity > surplus:
            raise ReservationLedgerError(
                f"Safety Constraint Violated: Donor {donor.name} only has {surplus} transferable units of {resource_type} "
                f"above its protected {int(donor.min_reserve_pct * 100)}% reserve. Requested: {quantity}."
            )

        # Apply reservation to inventory
        if resource_type == ResourceType.VENTILATORS.value:
            inv.reserved_ventilators += int(quantity)
        elif resource_type == ResourceType.ICU_BEDS.value:
            inv.reserved_icu_beds += int(quantity)
        elif resource_type == ResourceType.GENERAL_BEDS.value:
            inv.reserved_general_beds += int(quantity)
        elif resource_type == ResourceType.OXYGEN_LITERS.value:
            inv.reserved_oxygen_liters += float(quantity)
        elif resource_type == ResourceType.AMBULANCES.value:
            inv.reserved_ambulances += int(quantity)
        elif resource_type == ResourceType.BLOOD_O_NEG.value:
            inv.reserved_blood_units += int(quantity)

        # Create Ledger Entry
        now = datetime.datetime.now(datetime.timezone.utc)
        reservation = ResourceReservation(
            request_id=request_id,
            donor_hospital_id=donor_hospital_id,
            recipient_hospital_id=recipient_hospital_id,
            resource_type=resource_type,
            quantity=quantity,
            status=ReservationStatus.RESERVED.value,
            created_at=now,
            expires_at=now + datetime.timedelta(hours=6),
            notes=notes or f"Reserved by {user_role} to prevent duplicate allocation."
        )
        db.add(reservation)

        # If linked to a request, update request status
        if request_id:
            req = db.query(ResourceRequest).filter(ResourceRequest.id == request_id).first()
            if req:
                req.status = RequestStatus.APPROVED.value
                req.target_hospital_id = donor_hospital_id
                req.approved_by = user_role
                req.logistics_notes = f"Reserved from {donor.name}. Safe reserve maintained."

        # Audit Log
        audit = AuditLog(
            user_role=user_role,
            action="RESERVE_RESOURCE",
            details=f"Reserved {quantity} {resource_type} from {donor.name} to {recipient.name}. Protected reserve verified.",
            entity_type="RESERVATION",
            entity_id=str(request_id or "DIRECT")
        )
        db.add(audit)
        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def complete_transfer(db: Session, reservation_id: int, user_role: str = "Authorized Coordinator") -> ResourceReservation:
        """
        Transition reservation to RECEIVED, permanently updating recipient inventory and releasing donor reservation.
        """
        res = db.query(ResourceReservation).filter(ResourceReservation.id == reservation_id).first()
        if not res:
            raise ReservationLedgerError("Reservation not found.")

        if res.status == ReservationStatus.RECEIVED.value:
            return res

        donor_inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == res.donor_hospital_id).first()
        recip_inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == res.recipient_hospital_id).first()

        # Deduct from donor reserved & total physical counts
        qty = res.quantity
        rtype = res.resource_type

        if rtype == ResourceType.VENTILATORS.value:
            donor_inv.reserved_ventilators = max(0, donor_inv.reserved_ventilators - int(qty))
            donor_inv.hospital.total_ventilators = max(0, donor_inv.hospital.total_ventilators - int(qty))
            recip_inv.hospital.total_ventilators += int(qty)
        elif rtype == ResourceType.OXYGEN_LITERS.value:
            donor_inv.reserved_oxygen_liters = max(0.0, donor_inv.reserved_oxygen_liters - qty)
            donor_inv.current_oxygen_liters = max(0.0, donor_inv.current_oxygen_liters - qty)
            recip_inv.current_oxygen_liters += qty
        elif rtype == ResourceType.BLOOD_O_NEG.value:
            donor_inv.reserved_blood_units = max(0, donor_inv.reserved_blood_units - int(qty))
            donor_inv.blood_o_neg_units = max(0, donor_inv.blood_o_neg_units - int(qty))
            recip_inv.blood_o_neg_units += int(qty)
        elif rtype == ResourceType.AMBULANCES.value:
            donor_inv.reserved_ambulances = max(0, donor_inv.reserved_ambulances - int(qty))

        res.status = ReservationStatus.RECEIVED.value
        if res.request_id:
            req = db.query(ResourceRequest).filter(ResourceRequest.id == res.request_id).first()
            if req:
                req.status = RequestStatus.DELIVERED.value

        audit = AuditLog(
            user_role=user_role,
            action="TRANSFER_COMPLETED",
            details=f"Transfer completed: {res.quantity} {res.resource_type} delivered to {recip_inv.hospital.name}.",
            entity_type="RESERVATION",
            entity_id=str(reservation_id)
        )
        db.add(audit)
        db.commit()
        db.refresh(res)
        return res
