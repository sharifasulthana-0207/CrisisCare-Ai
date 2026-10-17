import math
from typing import Dict, Any, List
from backend.models import Hospital, HospitalInventory, ResourceType

class ShortageForecastingEngine:
    @staticmethod
    def forecast_oxygen(hospital: Hospital, inv: HospitalInventory, surge_multiplier: float = 1.0) -> Dict[str, Any]:
        """
        Calculates projected oxygen stock trajectory, time to reserve breach,
        and provides plain-language advisory.
        """
        current_liters = inv.current_oxygen_liters - inv.reserved_oxygen_liters
        capacity = hospital.total_oxygen_capacity
        protected_reserve = capacity * hospital.min_reserve_pct
        effective_hourly_rate = inv.hourly_consumption_rate * surge_multiplier

        if effective_hourly_rate <= 0:
            return {
                "current_liters": current_liters,
                "burn_rate_lh": 0.0,
                "hours_to_reserve_breach": 999.0,
                "hours_to_depletion": 999.0,
                "status": "HEALTHY",
                "plain_advisory": "Oxygen consumption is negligible. Supplies fully secure.",
                "timeline_points": []
            }

        liters_above_reserve = max(0.0, current_liters - protected_reserve)
        hours_to_reserve = round(liters_above_reserve / effective_hourly_rate, 1)
        hours_to_depletion = round(current_liters / effective_hourly_rate, 1)

        # Generate 12-hour projection timeline
        timeline = []
        for h in range(0, 13, 2):
            proj = max(0.0, round(current_liters - (effective_hourly_rate * h), 1))
            is_breached = proj < protected_reserve
            timeline.append({
                "hour": h,
                "projected_liters": proj,
                "below_reserve": is_breached
            })

        if hours_to_reserve <= 4.0:
            status = "CRITICAL"
            advisory = f"Critical alert: Oxygen projected to breach protected reserve ({int(protected_reserve)} L) in {hours_to_reserve} hours."
        elif hours_to_reserve <= 12.0:
            status = "ATTENTION"
            advisory = f"Warning: Oxygen consumption ({round(effective_hourly_rate, 1)} L/h) will reach reserve threshold in {hours_to_reserve} hours."
        else:
            status = "HEALTHY"
            advisory = f"Oxygen reserves sufficient for at least {hours_to_reserve} hours under current assumptions."

        return {
            "current_liters": round(current_liters, 1),
            "protected_reserve_liters": round(protected_reserve, 1),
            "burn_rate_lh": round(effective_hourly_rate, 1),
            "hours_to_reserve_breach": hours_to_reserve,
            "hours_to_depletion": hours_to_depletion,
            "status": status,
            "plain_advisory": advisory,
            "timeline_points": timeline
        }

    @staticmethod
    def forecast_icu_capacity(hospital: Hospital, inv: HospitalInventory, surge_arrivals_per_hr: float = 0.0) -> Dict[str, Any]:
        """
        Forecasts ICU bed and ventilator availability accounting for incoming arrivals and average length of stay.
        """
        total_icu = hospital.total_icu_beds
        occupied_icu = inv.occupied_icu_beds
        reserved_icu = inv.reserved_icu_beds
        icu_nurses = inv.icu_nurses_on_duty
        staffed_limit = icu_nurses * 2
        
        usable_now = max(0, min(total_icu - occupied_icu - reserved_icu, staffed_limit - occupied_icu))
        net_arrivals = max(0.0, surge_arrivals_per_hr - 0.4) # 0.4 avg discharges/hr

        if net_arrivals <= 0 or usable_now > 10:
            hours_to_full = 999.0
            status = "HEALTHY" if usable_now > 4 else "ATTENTION"
        else:
            hours_to_full = round(usable_now / net_arrivals, 1)
            status = "CRITICAL" if hours_to_full <= 3.0 else ("ATTENTION" if hours_to_full <= 8.0 else "HEALTHY")

        timeline = []
        cur_occ = occupied_icu
        for h in range(0, 13, 2):
            proj_occ = min(total_icu, round(cur_occ + (net_arrivals * h)))
            timeline.append({
                "hour": h,
                "projected_occupied": proj_occ,
                "capacity": total_icu,
                "overflow": max(0, round((cur_occ + net_arrivals * h) - total_icu))
            })

        advisory = (
            f"ICU capacity exhaustion projected in {hours_to_full} hours without patient diversion."
            if hours_to_full <= 8.0
            else f"ICU capacity stable with {usable_now} staffed usable bed(s)."
        )

        return {
            "total_capacity": total_icu,
            "usable_beds_now": usable_now,
            "staffing_ceiling": staffed_limit,
            "hours_to_full": hours_to_full,
            "status": status,
            "plain_advisory": advisory,
            "timeline_points": timeline
        }
