import networkx as nx
import math
import random

CITY_WIDTH = 25
CITY_HEIGHT = 20
BASE_LAT = 37.7749 # San Francisco Coordinates
BASE_LON = -122.4194
GRID_STEP = 0.003 # Approximate block distance

class SmartCityGraph:
    def __init__(self):
        self.graph = nx.grid_2d_graph(CITY_WIDTH, CITY_HEIGHT)
        self.node_positions = {}
        self._initialize_graph()

    def _initialize_graph(self):
        # Assign GPS coordinates and realistic weights
        for node in self.graph.nodes():
            x, y = node
            lat = BASE_LAT + (y - CITY_HEIGHT / 2) * GRID_STEP
            lon = BASE_LON + (x - CITY_WIDTH / 2) * GRID_STEP
            self.node_positions[node] = {"lat": lat, "lon": lon}
            self.graph.nodes[node]['metadata'] = {"lat": lat, "lon": lon}

        for u, v in self.graph.edges():
            # Randomize base edge distance slightly to simulate actual blocks
            dist = 1.0 + random.uniform(-0.1, 0.1)
            base_time = dist / 30.0 # 30 mph
            self.graph[u][v]['dist'] = dist
            self.graph[u][v]['base_time'] = base_time
            self.graph[u][v]['traffic_multiplier'] = 1.0
            self.graph[u][v]['safety_score'] = 1.0 # 1.0 is safest
            self.graph[u][v]['toll_price'] = 0.0 # Optional base toll

    def get_live_weight(self, u, v, prioritize_safety=False, avoid_tolls=False):
        edge = self.graph[u][v]
        weight = edge['base_time'] * edge['traffic_multiplier']
        
        if prioritize_safety:
            weight = weight * edge['safety_score']
            
        if avoid_tolls and edge['toll_price'] > 0:
            weight += edge['toll_price'] * 10.0 # Heavy penalty for tolls
            
        return weight
        
    def find_shortest_path(self, start_node, end_node, prioritize_safety=False, avoid_tolls=False):
        # Using Dijkstra via NetworkX with a custom weight function
        try:
            path = nx.shortest_path(
                self.graph, 
                source=start_node, 
                target=end_node, 
                weight=lambda u, v, d: self.get_live_weight(u, v, prioritize_safety, avoid_tolls)
            )
            return path
        except nx.NetworkXNoPath:
            return None

# Singleton graphic instance
city_graph = SmartCityGraph()
