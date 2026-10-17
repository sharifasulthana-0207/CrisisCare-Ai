from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Hospital, HospitalInventory, ResourceType
from backend.reservation_ledger import ReservationLedger
from backend.routing import haversine_distance_km

class AllocationOptimizer:
    @staticmethod
    def match_donor_hospitals(
        db: Session,
        requesting_hospital_id: int,
        resource_type: str,
        quantity_needed: float,
        required_capability: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fairness-aware hospital capability matching engine.
        Evaluates all candidate hospitals against non-negotiable constraints,
        calculates surplus margins, and ranks feasible donors with explainable rationale.
        """
        requestor = db.query(Hospital).filter(Hospital.id == requesting_hospital_id).first()
        if not requestor:
            return []

        candidates = db.query(Hospital).filter(Hospital.id != requesting_hospital_id).all()
        results = []

        for cand in candidates:
            cand_inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == cand.id).first()
            if not cand_inv:
                continue

            # 1. Capability check
            has_capability = True
            capability_note = "Capabilities compatible."
            if required_capability:
                caps = cand.capabilities or []
                if required_capability not in caps and not any(required_capability.lower() in c.lower() for c in caps):
                    has_capability = False
                    capability_note = f"Lacks specific capability: {required_capability}"

            # 2. Transferable surplus check (strictly respecting protected reserve)
            surplus = ReservationLedger.get_transferable_surplus(cand, cand_inv, resource_type)
            is_feasible = (surplus >= quantity_needed) and has_capability

            # 3. Distance calculation
            dist_km = haversine_distance_km(
                requestor.latitude, requestor.longitude,
                cand.latitude, cand.longitude
            )
            est_minutes = max(5, round((dist_km * 1.28 / 42.0) * 60))

            # 4. Fairness Score (Higher is better)
            # Combines: Surplus buffer (40%), Proximity (40%), Ambulances ready (20%)
            surplus_buffer_ratio = min(2.0, (surplus / (quantity_needed if quantity_needed > 0 else 1.0)))
            dist_score = max(0.0, 1.0 - (dist_km / 25.0))
            amb_ready = min(1.0, cand_inv.ambulances_available / 3.0)

            composite_score = round((surplus_buffer_ratio * 0.45 + dist_score * 0.35 + amb_ready * 0.20) * 100, 1)

            # Plain-language explanation
            if not has_capability:
                explanation = f"Ineligible: {cand.name} does not have certified {required_capability} department."
            elif surplus < quantity_needed:
                explanation = (
                    f"Insufficient transferable surplus: Has {surplus} available above protected reserve of "
                    f"{int(cand.min_reserve_pct * 100)}% ({quantity_needed} needed). Committing would compromise donor safety."
                )
            else:
                remaining_after = surplus - quantity_needed
                explanation = (
                    f"Recommended donor: Has {surplus} transferable units available. Can provide {quantity_needed} "
                    f"while retaining {remaining_after} surplus above its {int(cand.min_reserve_pct * 100)}% safety reserve. "
                    f"Transit corridor: {est_minutes} mins ({dist_km} km)."
                )

            results.append({
                "hospital_id": cand.id,
                "hospital_name": cand.name,
                "hospital_code": cand.code,
                "hospital_type": cand.hospital_type,
                "distance_km": dist_km,
                "estimated_minutes": est_minutes,
                "transferable_surplus": surplus,
                "quantity_can_provide": min(surplus, quantity_needed),
                "has_required_capability": has_capability,
                "capability_note": capability_note,
                "is_feasible": is_feasible,
                "fairness_score": composite_score if is_feasible else 0.0,
                "explanation": explanation,
                "donor_protected_reserve_pct": int(cand.min_reserve_pct * 100),
                "ambulances_available": cand_inv.ambulances_available
            })

        # Sort feasible first, then by highest fairness score, then shortest distance
        results.sort(key=lambda x: (x["is_feasible"], x["fairness_score"], -x["distance_km"]), reverse=True)
        return results
