# 🚗 Smart Transit AI — Intelligent Urban Transport Platform

![Project Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-yellow.svg)
![Live Dashboard](https://img.shields.io/badge/status-active-success.svg)

**Smart Transit AI** is a production-level, AI-driven urban transportation management system. It integrates eight distinct intelligent modules into a unified, scalable platform to optimize city-wide transit, reduce congestion, and enhance overall commuter safety.

---

## 🌟 Key Intelligence Modules

### 1. 🚦 Traffic Intelligence
Predicts and visualizes real-time traffic congestion using simulated data. Dynamically adjusts virtual traffic signals based on vehicle density.

### 2. 🧭 Route Optimization
Uses **Dijkstra's & A* Graph Algorithms** to find the fastest path between any two points on a 500-node San Francisco grid, factoring in live traffic delays and road closures.

### 3. 🚌 Public Transport Intelligence
Real-time tracking of simulated bus and metro lines. Predicts ETAs based on traffic flow and suggests improved schedules.

### 4. 🤝 Ride-Sharing & Demand Prediction
Clusters users with similar transit paths to encourage ride-sharing. Predicts high-demand areas for proactive fleet distribution.

### 5. ⚡ Smart Parking & EV Support
Map-based markers for available parking and EV charging stations, showing real-time occupancy and distance-based recommendations.

### 6. ⚠️ Safety & Risk Analysis
Analyzes historical incident data to predict and highlight high-risk accident zones with animated visual warnings.

### 7. 🚆 Multi-Modal Transport Planner
Provides complex routing that combines walking, busing, and ride-sharing into a single efficient journey.

### 8. 💰 Dynamic Pricing & Efficiency
Implements a congestion-based tolling algorithm (Surge Pricing) to regulate city traffic during peak hours.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.9+, [FastAPI](https://fastapi.tiangolo.com/), [Pydantic](https://docs.pydantic.dev/)
- **Graph Algorithms**: [NetworkX](https://networkx.org/)
- **Map engine**: [Leaflet.js](https://leafletjs.com/)
- **Aesthetics**: Vanilla CSS3 (Glassmorphism & Dark Mode)
- **Data simulation**: Custom Python `StateSimulator`

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python installed.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Platform
Start the unified FastAPI server which handles both the API and the Dashboard:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

### 4. View Dashboard
Visit **[http://localhost:8080](http://localhost:8080)** in your browser to interact with the live city simulation.

---

## 📂 Project Structure

- `backend/`: Core logic, API routes, and graph-based simulation.
  - `api/`: REST endpoints for each module.
  - `services/`: The `graph_builder.py` and `simulator.py` (The "AI Engine").
- `frontend/`: The dashboard source code.
  - `index.html`: The main dashboard entry.
  - `app.js`: Leaflet integration and real-time polling logic.
  - `styles.css`: The premium dark-mode design system.

---

## 📜 License
Internal Project Build - All Rights Reserved.
