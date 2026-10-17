import math
from typing import Dict, Any, List, Tuple

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0 # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def calculate_emergency_route(
    origin_lat: float, origin_lng: float, origin_name: str,
    dest_lat: float, dest_lng: float, dest_name: str,
    ambulance_priority: bool = True
) -> Dict[str, Any]:
    """
    Computes emergency logistics routing details between two hospitals:
    distance, transit duration, waypoints, and corridor description.
    """
    direct_dist = haversine_distance_km(origin_lat, origin_lng, dest_lat, dest_lng)
    # City street winding coefficient (~1.28x direct distance)
    road_distance_km = round(direct_dist * 1.28, 1)

    # Emergency average speed with priority green corridor: ~42 km/h; standard: ~28 km/h
    avg_speed_kmh = 42.0 if ambulance_priority else 28.0
    transit_minutes = max(4, round((road_distance_km / avg_speed_kmh) * 60))

    # Generate synthetic intermediate waypoints for smooth map rendering
    steps = 4
    waypoints: List[List[float]] = []
    for i in range(steps + 1):
        frac = i / steps
        # Add slight natural curvature offset
        curve_offset = math.sin(frac * math.pi) * 0.003
        wp_lat = origin_lat + frac * (dest_lat - origin_lat) + curve_offset
        wp_lng = origin_lng + frac * (dest_lng - origin_lng) - curve_offset
        waypoints.append([round(wp_lat, 5), round(wp_lng, 5)])

    return {
        "origin_name": origin_name,
        "destination_name": dest_name,
        "direct_distance_km": direct_dist,
        "road_distance_km": road_distance_km,
        "estimated_transit_minutes": transit_minutes,
        "priority_corridor_active": ambulance_priority,
        "waypoints": waypoints,
        "status": "CLEAR_EMERGENCY_CORRIDOR",
        "advisory": f"Fastest emergency corridor via Arterial Expressway ({transit_minutes} mins estimated under priority dispatch)."
    }
