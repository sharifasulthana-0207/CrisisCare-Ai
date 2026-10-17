import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal, init_db
from backend.models import (
    Hospital, HospitalInventory, ResourceRequest, ResourceReservation,
    PatientTransfer, AuditLog, RequestStatus, ReservationStatus, UrgencyLevel, ResourceType
)

def seed_database(db: Session = None):
    should_close = False
    if db is None:
        init_db()
        db = SessionLocal()
        should_close = True

    try:
        # Clear existing data safely
        db.query(AuditLog).delete()
        db.query(PatientTransfer).delete()
        db.query(ResourceReservation).delete()
        db.query(ResourceRequest).delete()
        db.query(HospitalInventory).delete()
        db.query(Hospital).delete()
        db.commit()

        # 1. St. Jude Metro Hospital (High load, downtown center)
        h1 = Hospital(
            code="METRO-CENTRAL",
            name="St. Jude Metro Hospital",
            hospital_type="Tertiary Care & Trauma Center",
            address="450 Central Ave, Metro Core",
            latitude=12.9716,
            longitude=77.5946,
            contact_phone="+1 (555) 019-4820",
            contact_email="coordination@stjudemetro.health",
            min_reserve_pct=0.20,
            capabilities=[
                "Trauma Level 1",
                "Cardiology",
                "Burn Unit",
                "Critical Care",
                "Infectious Disease",
                "Neurosurgery"
            ],
            total_general_beds=220,
            total_icu_beds=35,
            total_ventilators=32,
            total_oxygen_capacity=10000.0,
            total_ambulances=8,
            active_doctors=42,
            active_nurses=110,
        )

        # 2. Hope Valley Medical Center (Surplus capacity, pulmonary hub)
        h2 = Hospital(
            code="HOPE-VALLEY",
            name="Hope Valley Medical Center",
            hospital_type="Community & Specialist Hospital",
            address="128 Valley Ridge Blvd, East District",
            latitude=12.9930,
            longitude=77.6250,
            contact_phone="+1 (555) 019-7311",
            contact_email="resources@hopevalley.health",
            min_reserve_pct=0.20,
            capabilities=[
                "Trauma Level 2",
                "Pulmonary Medicine",
                "Stroke Center",
                "Critical Care",
                "Pediatrics"
            ],
            total_general_beds=140,
            total_icu_beds=20,
            total_ventilators=22,
            total_oxygen_capacity=8000.0,
            total_ambulances=5,
            active_doctors=28,
            active_nurses=75,
        )

        # 3. Riverside Regional Clinic (Agile regional facility)
        h3 = Hospital(
            code="RIVERSIDE-REG",
            name="Riverside Regional Clinic",
            hospital_type="Regional Emergency Clinic",
            address="88 North Riverway, North District",
            latitude=12.9420,
            longitude=77.5750,
            contact_phone="+1 (555) 019-3544",
            contact_email="emergency@riversideregional.health",
            min_reserve_pct=0.20,
            capabilities=[
                "Emergency Medicine",
                "General Surgery",
                "Infectious Disease",
                "Triage Center",
                "Critical Care"
            ],
            total_general_beds=90,
            total_icu_beds=12,
            total_ventilators=16,
            total_oxygen_capacity=6000.0,
            total_ambulances=4,
            active_doctors=18,
            active_nurses=45,
        )

        db.add_all([h1, h2, h3])
        db.flush()

        # Inventories with constraint-aware parameters
        inv1 = HospitalInventory(
            hospital_id=h1.id,
            occupied_general_beds=188,
            reserved_general_beds=6,
            occupied_icu_beds=30,      # High ICU occupancy (30 / 35)
            reserved_icu_beds=2,
            in_use_ventilators=26,     # 26 in use / 32
            reserved_ventilators=1,
            current_oxygen_liters=3800.0,
            hourly_consumption_rate=58.0,
            reserved_oxygen_liters=200.0,
            blood_o_neg_units=14,
            blood_o_pos_units=38,
            medicine_kits=95,
            ambulances_available=3,
            nurses_on_duty=96,
            icu_nurses_on_duty=18,     # 1:1.6 ICU nurse-to-patient ratio
        )

        inv2 = HospitalInventory(
            hospital_id=h2.id,
            occupied_general_beds=82,
            reserved_general_beds=0,
            occupied_icu_beds=9,       # 9 / 20 occupied -> Healthy surplus
            reserved_icu_beds=0,
            in_use_ventilators=10,     # 10 / 22 in use -> 12 free (well above 20% reserve of 5)
            reserved_ventilators=0,
            current_oxygen_liters=6800.0,
            hourly_consumption_rate=28.0,
            reserved_oxygen_liters=0.0,
            blood_o_neg_units=24,
            blood_o_pos_units=62,
            medicine_kits=190,
            ambulances_available=3,
            nurses_on_duty=68,
            icu_nurses_on_duty=14,
        )

        inv3 = HospitalInventory(
            hospital_id=h3.id,
            occupied_general_beds=44,
            reserved_general_beds=0,
            occupied_icu_beds=4,       # 4 / 12 occupied
            reserved_icu_beds=0,
            in_use_ventilators=5,      # 5 / 16 in use -> 11 free (well above reserve of 4)
            reserved_ventilators=0,
            current_oxygen_liters=4900.0,
            hourly_consumption_rate=19.0,
            reserved_oxygen_liters=0.0,
            blood_o_neg_units=18,
            blood_o_pos_units=40,
            medicine_kits=120,
            ambulances_available=2,
            nurses_on_duty=42,
            icu_nurses_on_duty=10,
        )

        db.add_all([inv1, inv2, inv3])
        db.flush()

        # Seed initial routine request
        req1 = ResourceRequest(
            request_number="REQ-2026-001",
            requesting_hospital_id=h1.id,
            target_hospital_id=h2.id,
            resource_type=ResourceType.OXYGEN_LITERS.value,
            quantity=500.0,
            urgency=UrgencyLevel.URGENT.value,
            clinical_reason="Anticipating evening respiratory triage peak",
            status=RequestStatus.AWAITING_REVIEW.value,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=35),
            logistics_notes="Pending medical coordinator sign-off"
        )
        db.add(req1)
        db.flush()

        # Seed initial completed transfer record for audit trail
        transfer1 = PatientTransfer(
            transfer_code="TRF-2026-089",
            origin_hospital_id=h1.id,
            destination_hospital_id=h2.id,
            patient_ref_code="PT-8821 (Fictional Demo)",
            acuity_level="MODERATE",
            required_capability="Pulmonary Medicine",
            requires_icu=False,
            requires_ventilator=False,
            status="COMPLETED",
            assigned_ambulance="AMB-02",
            estimated_transit_minutes=14,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            updated_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1, minutes=20)
        )
        db.add(transfer1)

        # Audit Log entries
        audit1 = AuditLog(
            user_role="Emergency Coordinator",
            action="INITIALIZE_NETWORK",
            details="CrisisCare AI initialized 3 regional hospitals for regional coordination network.",
            entity_type="SYSTEM",
            entity_id="ALL"
        )
        db.add(audit1)

        db.commit()
        print("Database successfully seeded with realistic, labeled synthetic healthcare data.")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_database()
