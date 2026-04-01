import random
import time
from backend.services.graph_builder import city_graph

class StateSimulator:
    def __init__(self):
        self.buses = {}
        self.ev_stations = {}
        self.accidents = []
        self.initialize_state()

    def initialize_state(self):
        # 1. Initialize random EV stations
        for _ in range(10):
            node = random.choice(list(city_graph.node_positions.keys()))
            self.ev_stations[f"EV_{_}"] = {
                "node": f"{node[0]},{node[1]}",
                "coords": city_graph.node_positions[node],
                "available": random.randint(0, 10),
                "total": 10
            }
            
        # 2. Add some random initial traffic
        self.update_traffic()
        
    def get_closest_node(self, lat, lon):
        min_dist = float('inf')
        closest = None
        for node, coords in city_graph.node_positions.items():
            dist = (coords['lat'] - lat)**2 + (coords['lon'] - lon)**2
            if dist < min_dist:
                min_dist = dist
                closest = node
        return closest

    def update_traffic(self):
        # Every cycle, modify edge traffic weights
        nodes = list(city_graph.graph.nodes())
        
        # Reset a bit towards 1.0 occasionally
        for u, v in city_graph.graph.edges():
            city_graph.graph[u][v]['traffic_multiplier'] = max(1.0, city_graph.graph[u][v]['traffic_multiplier'] - 0.1)
            city_graph.graph[u][v]['safety_score'] = 1.0
            city_graph.graph[u][v]['toll_price'] = random.choices([0.0, 2.5, 5.0], weights=[80, 15, 5])[0] # Dynamic pricing

        # Simulate 20 random heavy congestion spots
        for _ in range(20):
            u = random.choice(nodes)
            neighbors = list(city_graph.graph.neighbors(u))
            if not neighbors: continue
            v = random.choice(neighbors)
            # Add heavy traffic
            city_graph.graph[u][v]['traffic_multiplier'] = random.uniform(1.5, 4.0)
            
        # Simulate Accidents (Risk analysis)
        self.accidents = []
        for _ in range(5):
            u = random.choice(nodes)
            neighbors = list(city_graph.graph.neighbors(u))
            if not neighbors: continue
            v = random.choice(neighbors)
            city_graph.graph[u][v]['safety_score'] = 5.0 # Very unsafe
            city_graph.graph[u][v]['traffic_multiplier'] = 10.0 # Stalled traffic
            
            self.accidents.append({
                "origin": city_graph.node_positions[u],
                "end": city_graph.node_positions[v],
                "severity": "High"
            })

    def get_public_transit(self):
        # Dummy buses moving semi-randomly
        if not self.buses:
            for i in range(5):
                n = random.choice(list(city_graph.node_positions.keys()))
                self.buses[f"Bus_{i}"] = {"node": n, "route": [], "next_stop_eta": random.randint(2, 10)}
        else:
            for bus_id, bus_info in self.buses.items():
                u = bus_info["node"]
                neighbors = list(city_graph.graph.neighbors(u))
                if neighbors:
                    # Bus moves to next node
                    bus_info["node"] = random.choice(neighbors)
                    bus_info["next_stop_eta"] = random.randint(2, 10)
        
        return [{
            "id": k, 
            "lat": city_graph.node_positions[v["node"]]["lat"], 
            "lon": city_graph.node_positions[v["node"]]["lon"], 
            "eta": v["next_stop_eta"]
        } for k, v in self.buses.items()]

simulator_instance = StateSimulator()
