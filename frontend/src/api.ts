import {
  Hospital,
  ResourceRequest,
  ResourceReservation,
  PatientTransfer,
  CrisisScenario,
  SimulationResult,
  DonorMatch
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function fetchOverview() {
  const res = await fetch(`${API_BASE}/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview data');
  return res.json();
}

export async function fetchHospitals(): Promise<Hospital[]> {
  const res = await fetch(`${API_BASE}/hospitals`);
  if (!res.ok) throw new Error('Failed to fetch hospitals');
  return res.json();
}

export async function fetchHospitalDetail(id: number): Promise<Hospital> {
  const res = await fetch(`${API_BASE}/hospitals/${id}`);
  if (!res.ok) throw new Error('Failed to fetch hospital details');
  return res.json();
}

export async function fetchRequests(): Promise<ResourceRequest[]> {
  const res = await fetch(`${API_BASE}/requests`);
  if (!res.ok) throw new Error('Failed to fetch requests');
  return res.json();
}

export async function createRequest(payload: {
  requesting_hospital_id: number;
  target_hospital_id?: number | null;
  resource_type: string;
  quantity: number;
  urgency: string;
  clinical_reason: string;
}) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to submit request');
  }
  return res.json();
}

export async function approveRequest(requestId: number, donorHospitalId: number, notes?: string) {
  const res = await fetch(`${API_BASE}/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_hospital_id: donorHospitalId,
      approved_by: 'Authorized Emergency Coordinator',
      notes: notes || 'Verified donor protected reserve compliance',
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Approval failed');
  }
  return res.json();
}

export async function fetchReservations(): Promise<ResourceReservation[]> {
  const res = await fetch(`${API_BASE}/reservations`);
  if (!res.ok) throw new Error('Failed to fetch reservations');
  return res.json();
}

export async function completeReservation(reservationId: number) {
  const res = await fetch(`${API_BASE}/reservations/${reservationId}/complete`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to complete reservation');
  }
  return res.json();
}

export async function fetchTransfers(): Promise<PatientTransfer[]> {
  const res = await fetch(`${API_BASE}/transfers`);
  if (!res.ok) throw new Error('Failed to fetch patient transfers');
  return res.json();
}

export async function createPatientTransfer(payload: {
  origin_hospital_id: number;
  destination_hospital_id: number;
  patient_ref_code: string;
  acuity_level: string;
  required_capability?: string;
  requires_icu: boolean;
  requires_ventilator: boolean;
}) {
  const res = await fetch(`${API_BASE}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create patient transfer');
  }
  return res.json();
}

export async function fetchForecasts() {
  const res = await fetch(`${API_BASE}/forecasts`);
  if (!res.ok) throw new Error('Failed to fetch forecasts');
  return res.json();
}

export async function fetchScenarios(): Promise<CrisisScenario[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function runSimulation(payload: {
  scenario_id: string;
  affected_hospital_ids: number[];
  severity_multiplier: number;
  selected_intervention: string;
}): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to run simulation');
  }
  return res.json();
}

export async function matchDonors(params: {
  requesting_hospital_id: number;
  resource_type: string;
  quantity: number;
  required_capability?: string;
}): Promise<DonorMatch[]> {
  const query = new URLSearchParams({
    requesting_hospital_id: params.requesting_hospital_id.toString(),
    resource_type: params.resource_type,
    quantity: params.quantity.toString(),
    ...(params.required_capability ? { required_capability: params.required_capability } : {}),
  });
  const res = await fetch(`${API_BASE}/allocations/match?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to match donor hospitals');
  return res.json();
}

export async function fetchRoutes() {
  const res = await fetch(`${API_BASE}/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}
