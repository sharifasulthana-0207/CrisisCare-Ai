import datetime
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db, init_db, SessionLocal
from backend.models import (
    Hospital, HospitalInventory, ResourceRequest, ResourceReservation,
    PatientTransfer, AuditLog, RequestStatus, ReservationStatus,
    TransferStatus, UrgencyLevel, ResourceType,
    CreateRequestInput, ApproveRequestInput, PatientTransferInput,
    SimulationRunRequest, HospitalDetail, HospitalCapacityRead
)
from backend.reservation_ledger import ReservationLedger, ReservationLedgerError
from backend.forecasting import ShortageForecastingEngine
from backend.allocation import AllocationOptimizer
from backend.simulation import CrisisSimulationEngine, SCENARIOS
from backend.routing import calculate_emergency_route
from backend.seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if os.environ.get("SEED_DEMO_DATA", "true").lower() == "true":
        with SessionLocal() as db:
            if db.query(Hospital).first() is None:
                seed_database(db)
    yield

app = FastAPI(
    title="CRISISCARE AI Platform API",
    lifespan=lifespan,
    description="Adaptive Healthcare Coordination & Emergency Response Decision-Support System",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_hospital_full_dict(h: Hospital, inv: HospitalInventory) -> Dict[str, Any]:
    cap = ReservationLedger.calculate_hospital_capacity(h, inv)
    return {
        "id": h.id,
        "code": h.code,
        "name": h.name,
        "hospital_type": h.hospital_type,
        "address": h.address,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "contact_phone": h.contact_phone,
        "contact_email": h.contact_email,
        "capabilities": h.capabilities or [],
        "min_reserve_pct": h.min_reserve_pct,
        "total_general_beds": h.total_general_beds,
        "total_icu_beds": h.total_icu_beds,
        "total_ventilators": h.total_ventilators,
        "total_ambulances": h.total_ambulances,
        "active_doctors": h.active_doctors,
        "active_nurses": h.active_nurses,
        **cap
    }

# ==================== Endpoints ====================

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "status": "healthy",
        "service": "CRISISCARE AI Backend",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Main Dashboard Summary answering:
    1. What is available?
    2. What needs attention?
    3. What should I do next?
    """
    hospitals = db.query(Hospital).all()
    h_dicts = []
    total_usable_beds = 0
    total_usable_icu = 0
    total_available_ambulances = 0
    needs_attention_count = 0
    alerts = []

    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if not inv:
            continue
        h_data = _get_hospital_full_dict(h, inv)
        h_dicts.append(h_data)

        total_usable_beds += h_data["general_beds"]["usable"] + h_data["icu_beds"]["usable"]
        total_usable_icu += h_data["icu_beds"]["usable"]
        total_available_ambulances += h_data["ambulances"]["available"]

        if h_data["status"] in ["ATTENTION", "CRITICAL"]:
            needs_attention_count += 1
            alerts.append({
                "hospital_id": h.id,
                "hospital_name": h.name,
                "severity": h_data["status"],
                "message": h_data["status_reason"],
                "time": "Updated now"
            })

    # Active requests count
    active_requests = db.query(ResourceRequest).filter(
        ResourceRequest.status.in_([RequestStatus.NEW.value, RequestStatus.AWAITING_REVIEW.value, RequestStatus.APPROVED.value, RequestStatus.PREPARING_TRANSFER.value, RequestStatus.IN_TRANSIT.value])
    ).all()

    # Recent activity from audit logs
    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(6).all()
    activity = [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "user_role": log.user_role,
            "time": log.timestamp.strftime("%H:%M UTC")
        }
        for log in recent_logs
    ]

    return {
        "summary": {
            "available_usable_beds": total_usable_beds,
            "available_usable_icu": total_usable_icu,
            "available_ambulances": total_available_ambulances,
            "active_requests_count": len(active_requests),
            "needs_attention_count": needs_attention_count,
        },
        "alerts": alerts,
        "recent_activity": activity,
        "hospital_count": len(hospitals),
        "data_mode": "SYNTHETIC_DEMO_VERIFIED"
    }

@app.get("/api/hospitals")
def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    res = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            res.append(_get_hospital_full_dict(h, inv))
    return res

@app.get("/api/hospitals/{hospital_id}")
def get_hospital_detail(hospital_id: int, db: Session = Depends(get_db)):
    h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
    return _get_hospital_full_dict(h, inv)

@app.get("/api/resources")
def get_resources_breakdown(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    breakdown = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            h_data = _get_hospital_full_dict(h, inv)
            breakdown.append({
                "hospital_id": h.id,
                "hospital_name": h.name,
                "general_beds": h_data["general_beds"],
                "icu_beds": h_data["icu_beds"],
                "ventilators": h_data["ventilators"],
                "oxygen_liters": h_data["oxygen_liters"],
                "ambulances": h_data["ambulances"],
                "blood_supplies": h_data["blood_supplies"]
            })
    return breakdown

@app.get("/api/requests")
def list_requests(db: Session = Depends(get_db)):
    reqs = db.query(ResourceRequest).order_by(ResourceRequest.created_at.desc()).all()
    results = []
    for r in reqs:
        donor_name = r.target_hospital.name if r.target_hospital else "Unassigned / Network Pool"
        results.append({
            "id": r.id,
            "request_number": r.request_number,
            "requesting_hospital_id": r.requesting_hospital_id,
            "requesting_hospital_name": r.requesting_hospital.name,
            "target_hospital_id": r.target_hospital_id,
            "target_hospital_name": donor_name,
            "resource_type": r.resource_type,
            "quantity": r.quantity,
            "urgency": r.urgency,
            "clinical_reason": r.clinical_reason,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "approved_by": r.approved_by,
            "logistics_notes": r.logistics_notes
        })
    return results

@app.post("/api/requests")
def create_resource_request(input_data: CreateRequestInput, db: Session = Depends(get_db)):
    req_count = db.query(ResourceRequest).count() + 1
    req_num = f"REQ-2026-{req_count:03d}"

    req = ResourceRequest(
        request_number=req_num,
        requesting_hospital_id=input_data.requesting_hospital_id,
        target_hospital_id=input_data.target_hospital_id,
        resource_type=input_data.resource_type.value,
        quantity=input_data.quantity,
        urgency=input_data.urgency.value,
        clinical_reason=input_data.clinical_reason,
        status=RequestStatus.AWAITING_REVIEW.value,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        logistics_notes="Generated via CrisisCare AI guided coordination workflow"
    )
    db.add(req)
    
    # Audit Log
    hosp = db.query(Hospital).filter(Hospital.id == input_data.requesting_hospital_id).first()
    h_name = hosp.name if hosp else f"Hospital #{input_data.requesting_hospital_id}"
    audit = AuditLog(
        user_role="Healthcare Coordinator",
        action="CREATE_RESOURCE_REQUEST",
        details=f"Created {input_data.urgency.value} request {req_num} for {input_data.quantity} {input_data.resource_type.value} from {h_name}.",
        entity_type="REQUEST",
        entity_id=req_num
    )
    db.add(audit)
    db.commit()
    db.refresh(req)
    return {"message": "Resource request created successfully", "request_id": req.id, "request_number": req.request_number}

@app.post("/api/requests/{request_id}/approve")
def approve_resource_request(request_id: int, input_data: ApproveRequestInput, db: Session = Depends(get_db)):
    req = db.query(ResourceRequest).filter(ResourceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    try:
        # Transaction-safe reservation through ledger
        reservation = ReservationLedger.reserve_resource(
            db=db,
            request_id=req.id,
            donor_hospital_id=input_data.donor_hospital_id,
            recipient_hospital_id=req.requesting_hospital_id,
            resource_type=req.resource_type,
            quantity=req.quantity,
            user_role=input_data.approved_by,
            notes=input_data.notes or f"Approved for request {req.request_number}"
        )
        return {
            "message": "Resource request approved and transaction-safely reserved in ledger",
            "reservation_id": reservation.id,
            "status": req.status
        }
    except ReservationLedgerError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/requests/{request_id}/reject")
def reject_resource_request(request_id: int, reason: str = Query(..., description="Rejection rationale"), db: Session = Depends(get_db)):
    req = db.query(ResourceRequest).filter(ResourceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = RequestStatus.REJECTED.value
    req.logistics_notes = f"Rejected: {reason}"
    db.commit()
    return {"message": "Request marked as rejected", "id": req.id}

@app.get("/api/reservations")
def list_reservations(db: Session = Depends(get_db)):
    res_list = db.query(ResourceReservation).order_by(ResourceReservation.created_at.desc()).all()
    results = []
    for r in res_list:
        donor = db.query(Hospital).filter(Hospital.id == r.donor_hospital_id).first()
        recip = db.query(Hospital).filter(Hospital.id == r.recipient_hospital_id).first()
        results.append({
            "id": r.id,
            "request_id": r.request_id,
            "donor_hospital_id": r.donor_hospital_id,
            "donor_hospital_name": donor.name if donor else "",
            "recipient_hospital_id": r.recipient_hospital_id,
            "recipient_hospital_name": recip.name if recip else "",
            "resource_type": r.resource_type,
            "quantity": r.quantity,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "notes": r.notes
        })
    return results

@app.post("/api/reservations/{reservation_id}/complete")
def complete_reservation_transfer(reservation_id: int, db: Session = Depends(get_db)):
    try:
        updated = ReservationLedger.complete_transfer(db, reservation_id)
        return {"message": "Transfer marked completed and inventory updated", "status": updated.status}
    except ReservationLedgerError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/transfers")
def list_patient_transfers(db: Session = Depends(get_db)):
    transfers = db.query(PatientTransfer).order_by(PatientTransfer.created_at.desc()).all()
    out = []
    for t in transfers:
        origin = db.query(Hospital).filter(Hospital.id == t.origin_hospital_id).first()
        dest = db.query(Hospital).filter(Hospital.id == t.destination_hospital_id).first()
        out.append({
            "id": t.id,
            "transfer_code": t.transfer_code,
            "origin_hospital_name": origin.name if origin else "",
            "destination_hospital_name": dest.name if dest else "",
            "patient_ref_code": t.patient_ref_code,
            "acuity_level": t.acuity_level,
            "required_capability": t.required_capability,
            "requires_icu": t.requires_icu,
            "requires_ventilator": t.requires_ventilator,
            "status": t.status,
            "assigned_ambulance": t.assigned_ambulance,
            "estimated_transit_minutes": t.estimated_transit_minutes,
            "created_at": t.created_at.isoformat() if t.created_at else ""
        })
    return out

@app.post("/api/transfers")
def create_patient_transfer(inp: PatientTransferInput, db: Session = Depends(get_db)):
    origin = db.query(Hospital).filter(Hospital.id == inp.origin_hospital_id).first()
    dest = db.query(Hospital).filter(Hospital.id == inp.destination_hospital_id).first()
    if not origin or not dest:
        raise HTTPException(status_code=404, detail="Invalid hospital identifiers")

    route = calculate_emergency_route(
        origin.latitude, origin.longitude, origin.name,
        dest.latitude, dest.longitude, dest.name
    )

    t_count = db.query(PatientTransfer).count() + 1
    code = f"TRF-2026-{t_count:03d}"
    now = datetime.datetime.now(datetime.timezone.utc)

    transfer = PatientTransfer(
        transfer_code=code,
        origin_hospital_id=origin.id,
        destination_hospital_id=dest.id,
        patient_ref_code=inp.patient_ref_code,
        acuity_level=inp.acuity_level,
        required_capability=inp.required_capability,
        requires_icu=inp.requires_icu,
        requires_ventilator=inp.requires_ventilator,
        status=TransferStatus.APPROVED.value,
        assigned_ambulance="AMB-DISPATCH-01",
        estimated_transit_minutes=route["estimated_transit_minutes"],
        created_at=now,
        updated_at=now
    )
    db.add(transfer)

    # Reserve bed in recipient hospital
    dest_inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == dest.id).first()
    if dest_inv:
        if inp.requires_icu:
            dest_inv.reserved_icu_beds += 1
        else:
            dest_inv.reserved_general_beds += 1

    audit = AuditLog(
        user_role="Emergency Coordinator",
        action="APPROVE_PATIENT_TRANSFER",
        details=f"Approved transfer {code} for patient {inp.patient_ref_code} from {origin.name} to {dest.name}. Transit: {route['estimated_transit_minutes']} mins.",
        entity_type="PATIENT_TRANSFER",
        entity_id=code
    )
    db.add(audit)
    db.commit()
    db.refresh(transfer)
    return {"message": "Patient transfer scheduled", "transfer_code": code, "route": route}

@app.get("/api/forecasts")
def get_forecasts(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    results = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            o2_fc = ShortageForecastingEngine.forecast_oxygen(h, inv)
            icu_fc = ShortageForecastingEngine.forecast_icu_capacity(h, inv)
            results.append({
                "hospital_id": h.id,
                "hospital_name": h.name,
                "hospital_code": h.code,
                "oxygen_forecast": o2_fc,
                "icu_forecast": icu_fc
            })
    return results

@app.get("/api/scenarios")
def list_scenarios():
    return CrisisSimulationEngine.get_scenarios()

@app.post("/api/simulations/run")
def run_simulation(req: SimulationRunRequest, db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    h_dicts = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            h_dicts.append(_get_hospital_full_dict(h, inv))

    results = CrisisSimulationEngine.run_simulation(
        scenario_id=req.scenario_id,
        hospitals_data=h_dicts,
        severity_multiplier=req.severity_multiplier,
        selected_intervention=req.selected_intervention
    )
    return results

@app.get("/api/allocations/match")
def match_donors(
    requesting_hospital_id: int,
    resource_type: str,
    quantity: float,
    required_capability: Optional[str] = None,
    db: Session = Depends(get_db)
):
    matches = AllocationOptimizer.match_donor_hospitals(
        db=db,
        requesting_hospital_id=requesting_hospital_id,
        resource_type=resource_type,
        quantity_needed=quantity,
        required_capability=required_capability
    )
    return matches

@app.get("/api/routes")
def get_logistics_routes(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    routes = []
    if len(hospitals) >= 2:
        # Route 1: St. Jude Metro to Hope Valley
        r1 = calculate_emergency_route(
            hospitals[0].latitude, hospitals[0].longitude, hospitals[0].name,
            hospitals[1].latitude, hospitals[1].longitude, hospitals[1].name
        )
        r1["id"] = "CORRIDOR-1"
        routes.append(r1)

        # Route 2: St. Jude Metro to Riverside
        if len(hospitals) >= 3:
            r2 = calculate_emergency_route(
                hospitals[0].latitude, hospitals[0].longitude, hospitals[0].name,
                hospitals[2].latitude, hospitals[2].longitude, hospitals[2].name
            )
            r2["id"] = "CORRIDOR-2"
            routes.append(r2)

    return routes

# ==================== Evaluation & Specialized API Aliases ====================

@app.get("/api/network")
def get_network_status(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    nodes = []
    total_beds = 0
    total_icu = 0
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            h_data = _get_hospital_full_dict(h, inv)
            nodes.append(h_data)
            total_beds += h_data["general_beds"]["usable"]
            total_icu += h_data["icu_beds"]["usable"]
    return {
        "status": "ONLINE",
        "network_id": "CENTRAL-METRO-01",
        "facility_count": len(nodes),
        "total_usable_general_beds": total_beds,
        "total_usable_icu_beds": total_icu,
        "facilities": nodes
    }

@app.get("/api/corridor")
@app.post("/api/corridor")
def get_corridors_endpoint(db: Session = Depends(get_db)):
    return get_logistics_routes(db)

@app.get("/api/presets")
def get_presets_endpoint():
    return {
        "scenarios": CrisisSimulationEngine.get_scenarios(),
        "default_scenario": "MASS_CASUALTY",
        "default_severity": 1.5,
        "recommended_intervention": "COMBINED"
    }

@app.post("/api/simulate/timeline")
def simulate_timeline_endpoint(req: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    payload = req or {}
    scenario_id = payload.get("scenario_id", "MASS_CASUALTY")
    severity = float(payload.get("severity_multiplier", 1.5))
    intervention = payload.get("selected_intervention", "COMBINED")
    hospitals = db.query(Hospital).all()
    h_dicts = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            h_dicts.append(_get_hospital_full_dict(h, inv))
    res = CrisisSimulationEngine.run_simulation(scenario_id, h_dicts, severity, intervention)
    active_strat = res["strategies_results"].get(intervention, res["strategies_results"].get("COMBINED", {}))
    return {
        "scenario": res["scenario"],
        "timeline": active_strat.get("timeline", []),
        "metrics": active_strat.get("metrics", {})
    }

@app.post("/api/interventions/compare")
def compare_interventions_endpoint(req: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    payload = req or {}
    scenario_id = payload.get("scenario_id", "MASS_CASUALTY")
    severity = float(payload.get("severity_multiplier", 1.5))
    hospitals = db.query(Hospital).all()
    h_dicts = []
    for h in hospitals:
        inv = db.query(HospitalInventory).filter(HospitalInventory.hospital_id == h.id).first()
        if inv:
            h_dicts.append(_get_hospital_full_dict(h, inv))
    res = CrisisSimulationEngine.run_simulation(scenario_id, h_dicts, severity, "COMBINED")
    return {
        "strategies": res["strategies_results"],
        "summary": res["comparison_summary"]
    }

@app.post("/api/route/emergency")
@app.get("/api/route/emergency")
def route_emergency_endpoint(
    req: Optional[Dict[str, Any]] = None,
    origin_id: Optional[int] = None,
    dest_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    hospitals = db.query(Hospital).all()
    payload = req or {}
    o_id = payload.get("origin_id", origin_id) or (hospitals[0].id if hospitals else 1)
    d_id = payload.get("destination_id", dest_id) or (hospitals[1].id if len(hospitals) > 1 else 2)
    h_orig = db.query(Hospital).filter(Hospital.id == o_id).first() or hospitals[0]
    h_dest = db.query(Hospital).filter(Hospital.id == d_id).first() or (hospitals[1] if len(hospitals) > 1 else hospitals[0])
    return calculate_emergency_route(
        h_orig.latitude, h_orig.longitude, h_orig.name,
        h_dest.latitude, h_dest.longitude, h_dest.name
    )

@app.post("/api/route/multipath")
@app.get("/api/route/multipath")
def route_multipath_endpoint(
    req: Optional[Dict[str, Any]] = None,
    max_alternatives: int = 3,
    db: Session = Depends(get_db)
):
    hospitals = db.query(Hospital).all()
    primary = calculate_emergency_route(
        hospitals[0].latitude, hospitals[0].longitude, hospitals[0].name,
        hospitals[1].latitude, hospitals[1].longitude, hospitals[1].name
    )
    alternatives = [
        {
            **primary,
            "route_id": f"ALT-{i+1}",
            "route_name": f"Emergency Corridor {chr(65+i)}",
            "estimated_transit_minutes": primary["estimated_transit_minutes"] + (i * 3),
            "traffic_condition": "Priority Green Corridor" if i == 0 else "Alternate Arterial Flow"
        }
        for i in range(min(max_alternatives, 3))
    ]
    return {
        "primary_route": primary,
        "alternatives": alternatives,
        "count": len(alternatives)
    }

@app.post("/api/reset-demo")
def reset_demo(db: Session = Depends(get_db)):
    """Resets the environment back to clean baseline state for the 90-second demo walkthrough."""
    seed_database(db)
    return {"message": "Demo data reset to baseline condition successfully"}


# Mount built frontend static files for seamless single-server deployment
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        target_file = str((Path(frontend_dist) / full_path).resolve())
        if not Path(target_file).is_relative_to(Path(frontend_dist).resolve()):
            raise HTTPException(status_code=404, detail="File not found")
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build not detected. Please run npm run build in frontend directory."}

