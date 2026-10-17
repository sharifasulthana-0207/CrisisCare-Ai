import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.models import Base, Hospital, HospitalInventory, ResourceType
from backend.seed_data import seed_database
from backend.reservation_ledger import ReservationLedger, ReservationLedgerError
from backend.forecasting import ShortageForecastingEngine
from backend.simulation import CrisisSimulationEngine
from backend.main import app, get_db

# Use StaticPool so all threads/sessions share the same in-memory DB during tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_usable_capacity_constraint_awareness(db_session):
    """Test that usable capacity accounts for staffing and equipment, not just empty beds."""
    metro = db_session.query(Hospital).filter(Hospital.code == "METRO-CENTRAL").first()
    inv = db_session.query(HospitalInventory).filter(HospitalInventory.hospital_id == metro.id).first()
    
    cap = ReservationLedger.calculate_hospital_capacity(metro, inv)
    # Physical available ICU beds: 35 total - 30 occupied - 2 reserved = 3
    # Staffed capacity: 18 ICU nurses * 2 = 36 max staffed beds - 30 occupied = 6
    # Usable ICU beds should be min(3, 6) = 3
    assert cap["icu_beds"]["usable"] == 3
    assert cap["icu_beds"]["total"] == 35
    assert cap["icu_beds"]["occupied"] == 30

def test_protected_reserve_enforcement(db_session):
    """Test that donor hospitals cannot commit resources below their protected reserve (20%)."""
    hope = db_session.query(Hospital).filter(Hospital.code == "HOPE-VALLEY").first()
    inv = db_session.query(HospitalInventory).filter(HospitalInventory.hospital_id == hope.id).first()
    
    # Hope Valley: 22 total ventilators, min reserve 20% = 4.4 -> 4 units protected
    # 10 in use -> 12 free. Surplus above reserve = 12 - 4 = 8 ventilators.
    surplus = ReservationLedger.get_transferable_surplus(hope, inv, ResourceType.VENTILATORS.value)
    assert surplus == 8.0

    metro = db_session.query(Hospital).filter(Hospital.code == "METRO-CENTRAL").first()
    
    # Reserving 5 should succeed (5 <= 8)
    res = ReservationLedger.reserve_resource(
        db=db_session,
        request_id=None,
        donor_hospital_id=hope.id,
        recipient_hospital_id=metro.id,
        resource_type=ResourceType.VENTILATORS.value,
        quantity=5.0
    )
    assert res.status == "RESERVED"
    assert res.quantity == 5.0

    # Surplus is now 8 - 5 = 3
    new_surplus = ReservationLedger.get_transferable_surplus(hope, inv, ResourceType.VENTILATORS.value)
    assert new_surplus == 3.0

    # Requesting 4 should be rejected because it exceeds the remaining 3 units above reserve!
    with pytest.raises(ReservationLedgerError) as exc_info:
        ReservationLedger.reserve_resource(
            db=db_session,
            request_id=None,
            donor_hospital_id=hope.id,
            recipient_hospital_id=metro.id,
            resource_type=ResourceType.VENTILATORS.value,
            quantity=4.0
        )
    assert "Safety Constraint Violated" in str(exc_info.value)

def test_oxygen_forecasting_calculation(db_session):
    """Test mathematical forecasting of time to breach protected oxygen reserve."""
    metro = db_session.query(Hospital).filter(Hospital.code == "METRO-CENTRAL").first()
    inv = db_session.query(HospitalInventory).filter(HospitalInventory.hospital_id == metro.id).first()
    
    # St. Jude Metro: Current O2 = 3800 - 200 = 3600. Capacity = 10000. 20% reserve = 2000.
    # Usable O2 above reserve = 3600 - 2000 = 1600.
    # Rate = 58 L/h -> 1600 / 58 = 27.6 hours.
    fc = ShortageForecastingEngine.forecast_oxygen(metro, inv, surge_multiplier=1.0)
    assert fc["hours_to_reserve_breach"] == pytest.approx(27.6, abs=0.5)

    # Under 4x surge: 1600 / (58 * 4) = 6.9 hours -> should trigger warning
    surge_fc = ShortageForecastingEngine.forecast_oxygen(metro, inv, surge_multiplier=4.0)
    assert surge_fc["hours_to_reserve_breach"] == pytest.approx(6.9, abs=0.5)
    assert surge_fc["status"] == "ATTENTION"

def test_crisis_mode_simulation_engine():
    """Test reproducible simulation across all 4 intervention strategies."""
    mock_hospitals = [
        {
            "code": "METRO-CENTRAL",
            "name": "St. Jude Metro Hospital",
            "icu_beds": {"usable": 3, "total": 35},
            "general_beds": {"usable": 26, "total": 220}
        },
        {
            "code": "HOPE-VALLEY",
            "name": "Hope Valley Medical Center",
            "icu_beds": {"usable": 11, "total": 20},
            "general_beds": {"usable": 58, "total": 140}
        },
        {
            "code": "RIVERSIDE-REG",
            "name": "Riverside Regional Clinic",
            "icu_beds": {"usable": 8, "total": 12},
            "general_beds": {"usable": 46, "total": 90}
        }
    ]

    result = CrisisSimulationEngine.run_simulation(
        scenario_id="MASS_CASUALTY",
        hospitals_data=mock_hospitals,
        severity_multiplier=1.0,
        selected_intervention="COMBINED"
    )

    strategies = result["strategies_results"]
    assert "NO_ACTION" in strategies
    assert "PATIENT_TRANSFER" in strategies
    assert "RESOURCE_SHARING" in strategies
    assert "COMBINED" in strategies

    # Verified: Combined strategy reduces unmet demand compared to No Action
    no_action_unmet = strategies["NO_ACTION"]["metrics"]["unmet_patient_demand"]
    combined_unmet = strategies["COMBINED"]["metrics"]["unmet_patient_demand"]
    assert combined_unmet < no_action_unmet
    assert result["comparison_summary"]["unmet_patients_averted"] > 0
    assert result["comparison_summary"]["reserve_violations"] == 0

def test_api_overview_endpoint(client):
    """Test the overview summary endpoint returns correct fields."""
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "available_usable_beds" in data["summary"]
    assert "available_ambulances" in data["summary"]
    assert "active_requests_count" in data["summary"]
    assert "needs_attention_count" in data["summary"]
    assert "alerts" in data
    assert data["hospital_count"] == 3

def test_api_guided_request_workflow(client):
    """Test creating a resource request via the 5-step guided workflow."""
    # Step 1: Create request
    create_payload = {
        "requesting_hospital_id": 1,
        "target_hospital_id": 2,
        "resource_type": "VENTILATORS",
        "quantity": 3.0,
        "urgency": "URGENT",
        "clinical_reason": "Acute respiratory distress unit surge"
    }
    create_res = client.post("/api/requests", json=create_payload)
    assert create_res.status_code == 200
    req_id = create_res.json()["request_id"]

    # Step 2: Approve request (triggers transaction-safe reservation in ledger)
    approve_payload = {
        "donor_hospital_id": 2,
        "approved_by": "Senior Emergency Coordinator",
        "notes": "Verified Hope Valley reserve is maintained"
    }
    appr_res = client.post(f"/api/requests/{req_id}/approve", json=approve_payload)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"
