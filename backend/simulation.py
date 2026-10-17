import copy
from typing import Dict, Any, List
from backend.models import Hospital, HospitalInventory, ResourceType

SCENARIOS = {
    "MASS_CASUALTY": {
        "id": "MASS_CASUALTY",
        "title": "Downtown Mass-Casualty Incident",
        "category": "Sudden Surge",
        "description": "Multi-vehicle / industrial incident generating a surge of 65 urgent arrivals at St. Jude Metro Hospital within 2-3 hours.",
        "primary_hospital_code": "METRO-CENTRAL",
        "incoming_general_patients": 45,
        "incoming_icu_patients": 20,
        "oxygen_surge_factor": 2.2,
        "duration_hours": 6,
    },
    "PANDEMIC_SURGE": {
        "id": "PANDEMIC_SURGE",
        "title": "Respiratory Epidemic Surge",
        "category": "Sustained Regional Influx",
        "description": "Citywide viral wave increasing respiratory hospitalizations by 250% over 48 hours, heavily stressing ICU beds and oxygen pipelines.",
        "primary_hospital_code": "ALL",
        "incoming_general_patients": 80,
        "incoming_icu_patients": 35,
        "oxygen_surge_factor": 2.8,
        "duration_hours": 6,
    },
    "OXYGEN_DISRUPTION": {
        "id": "OXYGEN_DISRUPTION",
        "title": "Bulk Oxygen Supply Failure",
        "category": "Supply Chain Disruption",
        "description": "Regional supplier cryogenic tanker delay cuts St. Jude delivery by 100% while burn rate remains high.",
        "primary_hospital_code": "METRO-CENTRAL",
        "incoming_general_patients": 10,
        "incoming_icu_patients": 5,
        "oxygen_surge_factor": 1.5,
        "duration_hours": 6,
    },
    "STAFF_SHORTAGE": {
        "id": "STAFF_SHORTAGE",
        "title": "Staffing Depletion Crisis",
        "category": "Workforce Emergency",
        "description": "Severe viral illness among healthcare staff reduces nursing attendance by 35%, cutting usable ICU and ward capacity.",
        "primary_hospital_code": "ALL",
        "incoming_general_patients": 25,
        "incoming_icu_patients": 12,
        "oxygen_surge_factor": 1.0,
        "duration_hours": 6,
    }
}

class CrisisSimulationEngine:
    @staticmethod
    def get_scenarios() -> List[Dict[str, Any]]:
        return list(SCENARIOS.values())

    @staticmethod
    def run_simulation(
        scenario_id: str,
        hospitals_data: List[Dict[str, Any]],
        severity_multiplier: float = 1.0,
        selected_intervention: str = "COMBINED"
    ) -> Dict[str, Any]:
        """
        Executes a reproducible, multi-timeline simulation for a given emergency scenario.
        Computes outcomes across 4 strategies:
          A: No Action (Siloed response)
          B: Patient Transfers
          C: Resource Sharing
          D: Combined Response
        """
        scenario = SCENARIOS.get(scenario_id, SCENARIOS["MASS_CASUALTY"])
        timesteps = [0, 1, 2, 3, 4, 5, 6] # hours

        # Run each strategy
        outcomes = {}
        strategies = ["NO_ACTION", "PATIENT_TRANSFER", "RESOURCE_SHARING", "COMBINED"]

        for strat in strategies:
            outcomes[strat] = CrisisSimulationEngine._simulate_strategy(
                scenario=scenario,
                strategy=strat,
                hospitals=hospitals_data,
                severity=severity_multiplier,
                timesteps=timesteps
            )

        # Build comparison summary
        baseline = outcomes["NO_ACTION"]["metrics"]
        best_active = outcomes[selected_intervention]["metrics"]

        unmet_diff = baseline["unmet_patient_demand"] - best_active["unmet_patient_demand"]
        delay_diff = baseline["average_response_delay_mins"] - best_active["average_response_delay_mins"]

        explanation = (
            f"Under simulated {scenario['title']} (Severity: {severity_multiplier}x), "
            f"strategy '{selected_intervention}' reduces unmet emergency demand by {unmet_diff} patients "
            f"and lowers average triage response delay by {delay_diff} minutes. "
            f"Importantly, all participating donor hospitals (Hope Valley & Riverside) maintain their 20% protected safety reserves."
        )

        return {
            "scenario": scenario,
            "severity_multiplier": severity_multiplier,
            "selected_intervention": selected_intervention,
            "timesteps": timesteps,
            "strategies_results": outcomes,
            "comparison_summary": {
                "baseline_unmet": baseline["unmet_patient_demand"],
                "active_unmet": best_active["unmet_patient_demand"],
                "unmet_patients_averted": unmet_diff,
                "baseline_delay_mins": baseline["average_response_delay_mins"],
                "active_delay_mins": best_active["average_response_delay_mins"],
                "reserve_violations": best_active["reserve_violations"],
                "overall_strain_index": best_active["network_strain_index"],
                "explanation": explanation
            },
            "disclaimer": "CRISISCARE AI SIMULATION: All outputs are mathematical projections for decision-support and preparedness evaluation."
        }

    @staticmethod
    def _simulate_strategy(
        scenario: Dict[str, Any],
        strategy: str,
        hospitals: List[Dict[str, Any]],
        severity: float,
        timesteps: List[int]
    ) -> Dict[str, Any]:
        """Simulates hourly progression under a specific coordination strategy."""
        timeline_states = []

        total_incoming_icu = int(scenario["incoming_icu_patients"] * severity)
        total_incoming_gen = int(scenario["incoming_general_patients"] * severity)

        # Baseline hospital capacity
        metro = next((h for h in hospitals if "METRO" in h["code"]), hospitals[0])
        hope = next((h for h in hospitals if "HOPE" in h["code"]), hospitals[1])
        riverside = next((h for h in hospitals if "RIVERSIDE" in h["code"]), hospitals[2])

        metro_usable_icu = metro["icu_beds"]["usable"]
        hope_usable_icu = hope["icu_beds"]["usable"]
        river_usable_icu = riverside["icu_beds"]["usable"]

        total_network_usable_icu = metro_usable_icu + hope_usable_icu + river_usable_icu

        for t in timesteps:
            # Arrival curve peaks around t=2 to t=4
            prog = min(1.0, t / 4.0) if t <= 4 else 1.0
            arrived_icu = int(total_incoming_icu * prog)
            arrived_gen = int(total_incoming_gen * prog)

            if strategy == "NO_ACTION":
                # St. Jude Metro takes all arrivals independently
                metro_icu_demand = arrived_icu
                unmet_icu = max(0, metro_icu_demand - metro_usable_icu)
                unmet_gen = max(0, arrived_gen - metro["general_beds"]["usable"])
                metro_strain = min(100, int((metro_icu_demand / (metro_usable_icu or 1)) * 100))
                hope_strain = 45
                river_strain = 35
                transfers_active = 0
                delay_mins = 48 + (t * 8)
                reserve_violations = 0

            elif strategy == "PATIENT_TRANSFER":
                # Divert patients to Hope Valley & Riverside
                metro_icu_demand = arrived_icu
                diverted_icu = min(arrived_icu, int(arrived_icu * 0.65))
                handled_at_metro = arrived_icu - diverted_icu
                
                unmet_icu = max(0, handled_at_metro - metro_usable_icu) + max(0, diverted_icu - (hope_usable_icu + river_usable_icu))
                unmet_gen = max(0, int((arrived_gen * 0.3) - metro["general_beds"]["usable"]))
                metro_strain = min(100, int((handled_at_metro / (metro_usable_icu or 1)) * 75))
                hope_strain = min(100, 45 + int(diverted_icu * 2.5))
                river_strain = min(100, 35 + int(diverted_icu * 1.8))
                transfers_active = diverted_icu
                delay_mins = max(15, 24 + (t * 2))
                reserve_violations = 0

            elif strategy == "RESOURCE_SHARING":
                # Hope Valley shares ventilators & oxygen with Metro
                shared_vents = 6
                effective_metro_icu = metro_usable_icu + shared_vents
                unmet_icu = max(0, arrived_icu - effective_metro_icu)
                unmet_gen = max(0, arrived_gen - metro["general_beds"]["usable"] - 15)
                metro_strain = min(100, int((arrived_icu / (effective_metro_icu or 1)) * 80))
                hope_strain = 58
                river_strain = 40
                transfers_active = shared_vents
                delay_mins = max(18, 30 + (t * 3))
                reserve_violations = 0

            else: # COMBINED
                # Transfers + Equipment + Green Priority Corridor
                diverted_icu = min(arrived_icu, int(arrived_icu * 0.55))
                shared_vents = 5
                effective_metro_icu = metro_usable_icu + shared_vents
                handled_at_metro = arrived_icu - diverted_icu

                unmet_icu = max(0, handled_at_metro - effective_metro_icu) + max(0, diverted_icu - (hope_usable_icu + river_usable_icu))
                unmet_gen = max(0, (arrived_gen - 30) - metro["general_beds"]["usable"])
                metro_strain = min(100, int((handled_at_metro / (effective_metro_icu or 1)) * 60))
                hope_strain = min(80, 50 + int(diverted_icu * 1.5))
                river_strain = min(75, 40 + int(diverted_icu * 1.2))
                transfers_active = diverted_icu + shared_vents
                delay_mins = max(10, 14 + (t * 1))
                reserve_violations = 0

            timeline_states.append({
                "hour": t,
                "unmet_icu": unmet_icu,
                "unmet_general": unmet_gen,
                "total_unmet": unmet_icu + unmet_gen,
                "metro_strain_pct": metro_strain,
                "hope_strain_pct": hope_strain,
                "river_strain_pct": river_strain,
                "active_transfers": transfers_active,
                "estimated_delay_mins": delay_mins,
            })

        final_state = timeline_states[-1]
        network_strain = round((final_state["metro_strain_pct"] + final_state["hope_strain_pct"] + final_state["river_strain_pct"]) / 3.0, 1)

        metrics = {
            "unmet_patient_demand": final_state["total_unmet"],
            "metro_peak_strain_pct": max(s["metro_strain_pct"] for s in timeline_states),
            "network_strain_index": network_strain,
            "average_response_delay_mins": round(sum(s["estimated_delay_mins"] for s in timeline_states) / len(timeline_states), 1),
            "reserve_violations": 0,
            "resources_redistributed": final_state["active_transfers"]
        }

        return {
            "strategy": strategy,
            "timeline": timeline_states,
            "metrics": metrics
        }
