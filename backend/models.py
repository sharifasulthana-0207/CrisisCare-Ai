import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
)
from sqlalchemy.orm import declarative_base, relationship
from pydantic import BaseModel, Field

Base = declarative_base()

class ResourceType(str, Enum):
    GENERAL_BEDS = "GENERAL_BEDS"
    ICU_BEDS = "ICU_BEDS"
    VENTILATORS = "VENTILATORS"
    OXYGEN_LITERS = "OXYGEN_LITERS"
    BLOOD_O_NEG = "BLOOD_O_NEG"
    BLOOD_O_POS = "BLOOD_O_POS"
    AMBULANCES = "AMBULANCES"
    MEDICINE_KITS = "MEDICINE_KITS"
    NURSING_STAFF = "NURSING_STAFF"

class UrgencyLevel(str, Enum):
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    CRITICAL_EMERGENCY = "CRITICAL_EMERGENCY"

class RequestStatus(str, Enum):
    NEW = "NEW"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    APPROVED = "APPROVED"
    PREPARING_TRANSFER = "PREPARING_TRANSFER"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class ReservationStatus(str, Enum):
    RESERVED = "RESERVED"
    ALLOCATED = "ALLOCATED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    RELEASED = "RELEASED"

class TransferStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

# ==================== SQLAlchemy Models ====================

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(100), nullable=False)
    hospital_type = Column(String(50), default="General Hospital")
    address = Column(String(200))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(50))
    contact_email = Column(String(100))
    min_reserve_pct = Column(Float, default=0.20)  # 20% protected operational reserve
    capabilities = Column(JSON, default=list)       # ["Trauma Level 1", "Cardiology", ...]
    
    # Capacity baselines
    total_general_beds = Column(Integer, default=100)
    total_icu_beds = Column(Integer, default=20)
    total_ventilators = Column(Integer, default=25)
    total_oxygen_capacity = Column(Float, default=10000.0) # liters
    total_ambulances = Column(Integer, default=5)
    active_doctors = Column(Integer, default=25)
    active_nurses = Column(Integer, default=80)

    # Relationships
    inventory = relationship("HospitalInventory", back_populates="hospital", uselist=False, cascade="all, delete-orphan")
    outgoing_requests = relationship("ResourceRequest", foreign_keys="ResourceRequest.requesting_hospital_id", back_populates="requesting_hospital")
    incoming_requests = relationship("ResourceRequest", foreign_keys="ResourceRequest.target_hospital_id", back_populates="target_hospital")

class HospitalInventory(Base):
    __tablename__ = "hospital_inventories"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), unique=True, nullable=False)
    
    # General Beds
    occupied_general_beds = Column(Integer, default=60)
    reserved_general_beds = Column(Integer, default=0)

    # ICU Beds
    occupied_icu_beds = Column(Integer, default=12)
    reserved_icu_beds = Column(Integer, default=0)

    # Ventilators
    in_use_ventilators = Column(Integer, default=10)
    reserved_ventilators = Column(Integer, default=0)

    # Oxygen
    current_oxygen_liters = Column(Float, default=6500.0)
    hourly_consumption_rate = Column(Float, default=45.0)  # L/hour
    reserved_oxygen_liters = Column(Float, default=0.0)

    # Blood & Meds
    blood_o_neg_units = Column(Integer, default=18)
    blood_o_pos_units = Column(Integer, default=45)
    reserved_blood_units = Column(Integer, default=0)
    medicine_kits = Column(Integer, default=150)
    reserved_medicine_kits = Column(Integer, default=0)

    # Ambulances & Staff
    ambulances_available = Column(Integer, default=3)
    reserved_ambulances = Column(Integer, default=0)
    nurses_on_duty = Column(Integer, default=70)
    icu_nurses_on_duty = Column(Integer, default=16)

    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="inventory")

class ResourceReservation(Base):
    __tablename__ = "resource_reservations"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("resource_requests.id"), nullable=True)
    donor_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    recipient_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    resource_type = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String(50), default=ReservationStatus.RESERVED.value)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

class ResourceRequest(Base):
    __tablename__ = "resource_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, index=True)
    requesting_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    target_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    resource_type = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    urgency = Column(String(50), default=UrgencyLevel.URGENT.value)
    clinical_reason = Column(Text, nullable=True)
    status = Column(String(50), default=RequestStatus.NEW.value)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    approved_by = Column(String(100), nullable=True)
    logistics_notes = Column(Text, nullable=True)

    requesting_hospital = relationship("Hospital", foreign_keys=[requesting_hospital_id], back_populates="outgoing_requests")
    target_hospital = relationship("Hospital", foreign_keys=[target_hospital_id], back_populates="incoming_requests")
    reservations = relationship("ResourceReservation", backref="request", cascade="all, delete-orphan")

class PatientTransfer(Base):
    __tablename__ = "patient_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_code = Column(String(50), unique=True, index=True)
    origin_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    destination_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_ref_code = Column(String(50), nullable=False) # e.g. PT-4091 (fictional)
    acuity_level = Column(String(50), default="URGENT")
    required_capability = Column(String(100), nullable=True)
    requires_icu = Column(Boolean, default=False)
    requires_ventilator = Column(Boolean, default=False)
    status = Column(String(50), default=TransferStatus.PENDING_APPROVAL.value)
    assigned_ambulance = Column(String(50), nullable=True)
    estimated_transit_minutes = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_role = Column(String(50), default="Emergency Coordinator")
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(50), nullable=True)

# ==================== Pydantic Schemas ====================

class HospitalCapacityRead(BaseModel):
    total: int
    occupied: int
    available: int
    reserved: int
    usable: int  # constraint-aware: takes staffing & equipment into account
    occupancy_pct: float

class HospitalDetail(BaseModel):
    id: int
    code: str
    name: str
    hospital_type: str
    address: str
    latitude: float
    longitude: float
    contact_phone: str
    contact_email: str
    capabilities: List[str]
    min_reserve_pct: float
    
    general_beds: HospitalCapacityRead
    icu_beds: HospitalCapacityRead
    ventilators: HospitalCapacityRead
    oxygen_liters: Dict[str, Any]
    blood_supplies: Dict[str, Any]
    ambulances: Dict[str, Any]
    status: str # "HEALTHY", "ATTENTION", "CRITICAL"
    status_reason: Optional[str] = None

class CreateRequestInput(BaseModel):
    requesting_hospital_id: int
    target_hospital_id: Optional[int] = None
    resource_type: ResourceType
    quantity: float
    urgency: UrgencyLevel = UrgencyLevel.URGENT
    clinical_reason: str

class ApproveRequestInput(BaseModel):
    donor_hospital_id: int
    approved_by: str = "Authorized Emergency Coordinator"
    notes: Optional[str] = None

class PatientTransferInput(BaseModel):
    origin_hospital_id: int
    destination_hospital_id: int
    patient_ref_code: str = "PT-DEMO"
    acuity_level: str = "URGENT"
    required_capability: Optional[str] = None
    requires_icu: bool = False
    requires_ventilator: bool = False

class SimulationRunRequest(BaseModel):
    scenario_id: str
    affected_hospital_ids: List[int]
    severity_multiplier: float = 1.5
    selected_intervention: str = "COMBINED" # "NONE", "PATIENT_TRANSFER", "RESOURCE_SHARING", "COMBINED"
