export interface CapacityDetail {
  total: number;
  occupied: number;
  available: number;
  reserved: number;
  usable: number;
  occupancy_pct: number;
}

export interface OxygenDetail {
  capacity: number;
  current: number;
  reserved: number;
  available: number;
  protected_reserve: number;
  transferable_surplus: number;
  hourly_rate: number;
  hours_to_reserve: number;
}

export interface Hospital {
  id: number;
  code: string;
  name: string;
  hospital_type: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string;
  contact_email: string;
  capabilities: string[];
  min_reserve_pct: number;
  total_general_beds: number;
  total_icu_beds: number;
  total_ventilators: number;
  total_ambulances: number;
  active_doctors: number;
  active_nurses: number;
  general_beds: CapacityDetail;
  icu_beds: CapacityDetail;
  ventilators: CapacityDetail;
  oxygen_liters: OxygenDetail;
  blood_supplies: {
    o_neg_units: number;
    o_pos_units: number;
    transferable_o_neg: number;
  };
  ambulances: {
    total: number;
    available: number;
    reserved: number;
  };
  status: "HEALTHY" | "ATTENTION" | "CRITICAL";
  status_reason: string;
}

export interface ResourceRequest {
  id: number;
  request_number: string;
  requesting_hospital_id: number;
  requesting_hospital_name: string;
  target_hospital_id: number | null;
  target_hospital_name: string;
  resource_type: string;
  quantity: number;
  urgency: "ROUTINE" | "URGENT" | "CRITICAL_EMERGENCY";
  clinical_reason: string;
  status: string;
  created_at: string;
  approved_by: string | null;
  logistics_notes: string | null;
}

export interface ResourceReservation {
  id: number;
  request_id: number | null;
  donor_hospital_id: number;
  donor_hospital_name: string;
  recipient_hospital_id: number;
  recipient_hospital_name: string;
  resource_type: string;
  quantity: number;
  status: string;
  created_at: string;
  notes: string;
}

export interface PatientTransfer {
  id: number;
  transfer_code: string;
  origin_hospital_name: string;
  destination_hospital_name: string;
  patient_ref_code: string;
  acuity_level: string;
  required_capability: string | null;
  requires_icu: boolean;
  requires_ventilator: boolean;
  status: string;
  assigned_ambulance: string | null;
  estimated_transit_minutes: number;
  created_at: string;
}

export interface CrisisScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  primary_hospital_code: string;
  incoming_general_patients: number;
  incoming_icu_patients: number;
  oxygen_surge_factor: number;
  duration_hours: number;
}

export interface SimulationTimelinePoint {
  hour: number;
  unmet_icu: number;
  unmet_general: number;
  total_unmet: number;
  metro_strain_pct: number;
  hope_strain_pct: number;
  river_strain_pct: number;
  active_transfers: number;
  estimated_delay_mins: number;
}

export interface SimulationResult {
  scenario: CrisisScenario;
  severity_multiplier: number;
  selected_intervention: string;
  timesteps: number[];
  strategies_results: {
    [key: string]: {
      strategy: string;
      timeline: SimulationTimelinePoint[];
      metrics: {
        unmet_patient_demand: number;
        metro_peak_strain_pct: number;
        network_strain_index: number;
        average_response_delay_mins: number;
        reserve_violations: number;
        resources_redistributed: number;
      };
    };
  };
  comparison_summary: {
    baseline_unmet: number;
    active_unmet: number;
    unmet_patients_averted: number;
    baseline_delay_mins: number;
    active_delay_mins: number;
    reserve_violations: number;
    overall_strain_index: number;
    explanation: string;
  };
  disclaimer: string;
}

export interface DonorMatch {
  hospital_id: number;
  hospital_name: string;
  hospital_code: string;
  hospital_type: string;
  distance_km: number;
  estimated_minutes: number;
  transferable_surplus: number;
  quantity_can_provide: number;
  has_required_capability: boolean;
  capability_note: string;
  is_feasible: boolean;
  fairness_score: number;
  explanation: string;
  donor_protected_reserve_pct: number;
  ambulances_available: number;
}
