from fastapi import APIRouter
from pydantic import BaseModel
import random

from backend.services.graph_builder import city_graph
from backend.services.simulator import simulator_instance

api_router = APIRouter()

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    prioritize_safety: bool = False
    avoid_tolls: bool = False

@api_router.get("/traffic")
def get_traffic():
    """Predicts traffic congestion (Simulated ML) and dynamic signals."""
    # Force a traffic update locally
    simulator_instance.update_traffic()
    
    # We will just return the top congested edges as "predictions"
    congested_edges = []
    for u, v, data in city_graph.graph.edges(data=True):
        if data['traffic_multiplier'] > 1.5:
            congested_edges.append({
                "start": city_graph.node_positions[u],
                "end": city_graph.node_positions[v],
                "severity": data['traffic_multiplier']
            })
    return {"congestion": congested_edges[:20]} # Return top 20 for UI

@api_router.post("/route")
def calculate_route(req: RouteRequest):
    """Provides shortest/fastest route using Dijkstra considering live traffic."""
    # ML route optimization heuristic here
    start_node = list(city_graph.node_positions.keys())[0] # Temporary fallback
    end_node = list(city_graph.node_positions.keys())[-1]
    
    # Simple nearest neighbor approximation
    min_start_dist = float('inf')
    min_end_dist = float('inf')
    for node, coords in city_graph.node_positions.items():
        start_dist = (coords['lat'] - req.start_lat)**2 + (coords['lon'] - req.start_lon)**2
        end_dist = (coords['lat'] - req.end_lat)**2 + (coords['lon'] - req.end_lon)**2
        
        if start_dist < min_start_dist:
            min_start_dist = start_dist
            start_node = node
            
        if end_dist < min_end_dist:
            min_end_dist = end_dist
            end_node = node
            
    path = city_graph.find_shortest_path(start_node, end_node, req.prioritize_safety, req.avoid_tolls)
    
    if not path:
        return {"error": "No route found."}
        
    coordinates = [city_graph.node_positions[n] for n in path]
    
    # Calculate ETA and Tolls
    eta = 0
    tolls = 0
    for i in range(len(path)-1):
        u, v = path[i], path[i+1]
        edge = city_graph.graph[u][v]
        eta += edge['base_time'] * edge['traffic_multiplier']
        tolls += edge.get('toll_price', 0)
        
    return {
        "path": coordinates,
        "eta_mins": round(eta, 2),
        "total_tolls": round(tolls, 2)
    }

@api_router.get("/transit")
def get_public_transport():
    """Bus predictions and improved routes."""
    return {"buses": simulator_instance.get_public_transit()}

class RideShareRequest(BaseModel):
    user_lat: float
    user_lon: float

@api_router.post("/rideshare")
def find_rideshare(req: RideShareRequest):
    """Match users with similar routes using simulated clustering."""
    # Find active simulated riders near this loc
    riders = []
    for _ in range(random.randint(0, 3)):
        dist_lat = random.uniform(-0.01, 0.01)
        dist_lon = random.uniform(-0.01, 0.01)
        riders.append({
            "rider_id": f"User_{random.randint(1000, 9999)}",
            "lat": req.user_lat + dist_lat,
            "lon": req.user_lon + dist_lon,
            "match_score": round(random.uniform(70, 99), 1)
        })
    return {"potential_matches": riders}

@api_router.get("/parking")
def get_smart_parking():
    """Nearest available parking spots and EV charging."""
    return {"ev_stations": list(simulator_instance.ev_stations.values())}

@api_router.get("/safety")
def get_safety_risks():
    """Accident prone areas analysis."""
    return {"accidents": simulator_instance.accidents}

@api_router.post("/multimodal")
def plan_multimodal(req: RouteRequest):
    """Combine walking, transit, rideshare."""
    # For prototype, returns a combined dummy multi-modal split
    return {
        "legs": [
            {"mode": "Walking", "duration_mins": 5, "coords": [{"lat": req.start_lat, "lon": req.start_lon}]},
            {"mode": "Bus", "duration_mins": 15, "coords": []}, # UI would draw a dotted line
            {"mode": "Walking", "duration_mins": 2, "coords": [{"lat": req.end_lat, "lon": req.end_lon}]}
        ],
        "total_eta": 22
    }

@api_router.get("/pricing")
def get_dynamic_pricing():
    """Toll pricing based on congestion."""
    congested_nodes = len([1 for u, v, d in city_graph.graph.edges(data=True) if d['traffic_multiplier'] > 2.0])
    base = 2.0
    surge = 1.0 + (congested_nodes * 0.05)
    return {"current_surge_multiplier": round(surge, 2), "base_toll": base, "surge_toll": round(base * surge, 2)}
