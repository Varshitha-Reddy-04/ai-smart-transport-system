// API Configuration - Using relative paths since we serve from the same origin
const API_BASE = "/api";

// State Management
const state = {
    activeLayers: { 
        traffic: true, 
        transit: false, 
        parking: false, 
        safety: false 
    },
    waypoints: [],
    routeMode: false,
    pollingInterval: null,
    sidebarCollapsed: false
};

// Initialize Map - Dark style localized to San Francisco
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([37.7749, -122.4194], 13);

// Premium Dark Theme CartoDB Maps
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Layer Groups
const layers = {
    traffic: L.layerGroup().addTo(map),
    transit: L.layerGroup(),
    parking: L.layerGroup(),
    safety: L.layerGroup(),
    route: L.layerGroup().addTo(map),
    clicks: L.layerGroup().addTo(map)
};

// Custom Icons
const createIcon = (emoji, color) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="font-size: 24px; filter: drop-shadow(0 0 4px ${color});">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const icons = {
    bus: createIcon('🚌', 'rgba(78, 168, 240, 0.5)'),
    ev: createIcon('⚡', 'rgba(29, 209, 126, 0.5)'),
    accident: L.divIcon({
        className: 'custom-div-icon accident-marker',
        html: `<div style="font-size: 24px;">⚠️</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    })
};

// UI Elements
const els = {
    loading: document.getElementById('loading-screen'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    planBtn: document.getElementById('planRouteBtn'),
    clearBtn: document.getElementById('clearRouteBtn'),
    routeStats: document.getElementById('route-stats'),
    matchPanel: document.getElementById('rideshare-panel'),
    matchList: document.getElementById('match-list'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg'),
    congestionVal: document.getElementById('congestion-value'),
    congestionBar: document.getElementById('congestion-bar'),
    tollVal: document.getElementById('toll-value'),
    tollBar: document.getElementById('toll-bar'),
    busCount: document.getElementById('bus-count'),
    evCount: document.getElementById('ev-count')
};

// Toast notification system
function showToast(message, duration = 3000) {
    els.toastMsg.innerText = message;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), duration);
}

// Sidebar logic
els.sidebarToggle.onclick = () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    els.sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    // Trigger map resize after sidebar transition
    setTimeout(() => map.invalidateSize(), 400);
};

// Data Fetching Functions
async function fetchTraffic() {
    try {
        const [trafficRes, pricingRes] = await Promise.all([
            fetch(`${API_BASE}/traffic`),
            fetch(`${API_BASE}/pricing`)
        ]);
        const trafficData = await trafficRes.json();
        const pricingData = await pricingRes.json();

        // Update UI logic
        const congestionLevel = trafficData.congestion.length;
        els.congestionVal.innerText = congestionLevel > 15 ? 'Critical' : (congestionLevel > 8 ? 'Moderate' : 'Low');
        const congPercent = Math.min(100, (congestionLevel / 20) * 100);
        els.congestionBar.style.width = `${congPercent}%`;
        els.congestionBar.className = `stat-bar-fill ${congPercent > 70 ? 'danger' : ''}`;

        els.tollVal.innerText = `${pricingData.current_surge_multiplier}x`;
        const tollPercent = Math.min(100, (pricingData.current_surge_multiplier / 3) * 100);
        els.tollBar.style.width = `${tollPercent}%`;

        // Update Layer
        layers.traffic.clearLayers();
        if (state.activeLayers.traffic) {
            trafficData.congestion.forEach(edge => {
                const latlngs = [[edge.start.lat, edge.start.lon], [edge.end.lat, edge.end.lon]];
                const color = edge.severity > 3.0 ? '#f04e4e' : '#f5a623';
                L.polyline(latlngs, {
                    color: color, 
                    weight: 4 + (edge.severity), 
                    opacity: 0.7,
                    lineJoin: 'round'
                }).addTo(layers.traffic);
            });
        }
    } catch (e) { console.error("Traffic refresh failed", e); }
}

async function fetchTransit() {
    if (!state.activeLayers.transit) return;
    try {
        const res = await fetch(`${API_BASE}/transit`);
        const data = await res.json();
        layers.transit.clearLayers();
        els.busCount.innerText = data.buses.length;
        data.buses.forEach(bus => {
            L.marker([bus.lat, bus.lon], { icon: icons.bus })
             .bindPopup(`<strong>Bus ${bus.id}</strong><br>ETA to next stop: ${bus.eta} min`)
             .addTo(layers.transit);
        });
    } catch (e) { console.error("Transit refresh failed", e); }
}

async function fetchParking() {
    if (!state.activeLayers.parking) return;
    try {
        const res = await fetch(`${API_BASE}/parking`);
        const data = await res.json();
        layers.parking.clearLayers();
        els.evCount.innerText = data.ev_stations.length;
        data.ev_stations.forEach(st => {
            const color = st.available > 0 ? '#1dd17e' : '#f04e4e';
            L.circleMarker([st.coords.lat, st.coords.lon], {
                radius: 8,
                color: '#fff',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9
            }).bindPopup(`<strong>EV Charging Station</strong><br>Available: ${st.available}/${st.total} spots`)
              .addTo(layers.parking);
        });
    } catch (e) { console.error("Parking refresh failed", e); }
}

async function fetchSafety() {
    if (!state.activeLayers.safety) return;
    try {
        const res = await fetch(`${API_BASE}/safety`);
        const data = await res.json();
        layers.safety.clearLayers();
        data.accidents.forEach(acc => {
            L.marker([acc.origin.lat, acc.origin.lon], { icon: icons.accident })
             .bindPopup(`<strong>Accident Hazard</strong><br>Severity: ${acc.severity}<br>Status: Investigating`)
             .addTo(layers.safety);
        });
    } catch (e) { console.error("Safety refresh failed", e); }
}

// Layer Toggle logic
window.toggleLayer = function(name) {
    state.activeLayers[name] = !state.activeLayers[name];
    const btn = document.getElementById(`btn-${name}`);
    
    if (state.activeLayers[name]) {
        btn.classList.add('active');
        map.addLayer(layers[name]);
        if (name === 'transit') fetchTransit();
        if (name === 'parking') fetchParking();
        if (name === 'safety') fetchSafety();
    } else {
        btn.classList.remove('active');
        map.removeLayer(layers[name]);
    }
};

// Route Planning logic
els.planBtn.onclick = () => {
    state.routeMode = true;
    state.waypoints = [];
    layers.clicks.clearLayers();
    layers.route.clearLayers();
    
    els.planBtn.classList.add('selecting');
    els.planBtn.innerHTML = '<span class="btn-icon">📍</span> Select Start Point';
    els.clearBtn.style.display = 'flex';
    els.routeStats.classList.add('hidden');
    els.matchPanel.style.display = 'none';
    
    showToast("Click on the map to set your starting location");
};

els.clearBtn.onclick = () => {
    resetRouteUI();
    layers.clicks.clearLayers();
    layers.route.clearLayers();
    els.matchPanel.style.display = 'none';
};

function resetRouteUI() {
    state.routeMode = false;
    els.planBtn.classList.remove('selecting', 'computed');
    els.planBtn.innerHTML = '<span class="btn-icon">🗺️</span> Plan Route';
    els.clearBtn.style.display = 'none';
}

map.on('click', async (e) => {
    if (!state.routeMode) return;
    
    state.waypoints.push({ lat: e.latlng.lat, lon: e.latlng.lng });
    
    L.circleMarker(e.latlng, {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#7c6cf0',
        fillOpacity: 1
    }).addTo(layers.clicks);
    
    if (state.waypoints.length === 1) {
        els.planBtn.innerHTML = '<span class="btn-icon">🏁</span> Select End Point';
        showToast("Now click for your destination");
        fetchRideshare(state.waypoints[0].lat, state.waypoints[0].lon);
    } else if (state.waypoints.length === 2) {
        state.routeMode = false;
        els.planBtn.innerHTML = '<span class="btn-icon">⚙️</span> Calculating...';
        
        try {
            const req = {
                start_lat: state.waypoints[0].lat,
                start_lon: state.waypoints[0].lon,
                end_lat: state.waypoints[1].lat,
                end_lon: state.waypoints[1].lon,
                prioritize_safety: document.getElementById('opt-safety').checked,
                avoid_tolls: document.getElementById('opt-tolls').checked
            };
            
            const res = await fetch(`${API_BASE}/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            const result = await res.json();
            
            if (result.path) {
                const latlngs = result.path.map(p => [p.lat, p.lon]);
                
                // Glow effect polyline
                L.polyline(latlngs, { color: '#7c6cf0', weight: 10, opacity: 0.3 }).addTo(layers.route);
                L.polyline(latlngs, { color: '#fff', weight: 4, opacity: 0.8 }).addTo(layers.route);
                L.polyline(latlngs, { color: '#7c6cf0', weight: 3, opacity: 1 }).addTo(layers.route);
                
                map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [50, 50] });
                
                els.planBtn.classList.remove('selecting');
                els.planBtn.classList.add('computed');
                els.planBtn.innerHTML = '<span class="btn-icon">✅</span> Route Found';
                
                els.routeStats.innerHTML = `
                    <div class="result-row">
                        <span class="result-label">Est. Travel Time</span>
                        <span class="result-value eta">${result.eta_mins} mins</span>
                    </div>
                    <div class="result-row">
                        <span class="result-label">congestion Factor</span>
                        <span class="result-value">${(result.eta_mins > 10 ? 'High' : 'Low')}</span>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Total Tolls</span>
                        <span class="result-value toll">$${result.total_tolls}</span>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Safety Bias</span>
                        <span class="result-value ${req.prioritize_safety ? 'safe-on' : 'safe-off'}">${req.prioritize_safety ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                `;
                els.routeStats.classList.remove('hidden');
                showToast("Optimal route calculated based on live conditions");
            } else {
                showToast("Error: No route could be found");
                resetRouteUI();
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to connect to AI engine");
            resetRouteUI();
        }
    }
});

async function fetchRideshare(lat, lon) {
    try {
        const res = await fetch(`${API_BASE}/rideshare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_lat: lat, user_lon: lon })
        });
        const data = await res.json();
        if (data.potential_matches && data.potential_matches.length > 0) {
            els.matchList.innerHTML = data.potential_matches.map(m => `
                <li class="match-item">
                    <span class="match-name">${m.rider_id}</span>
                    <span class="match-score">${m.match_score}% Match</span>
                </li>
            `).join('');
            els.matchPanel.style.display = 'block';
        }
    } catch (e) { console.error("Rideshare failed", e); }
}

// Initial Sequence
async function init() {
    // Reveal app after short delay for effect
    await fetchTraffic();
    await fetchTransit();
    await fetchParking();
    await fetchSafety();
    
    setTimeout(() => {
        els.loading.classList.add('fade-out');
        showToast("City transport simulation online");
    }, 1500);
    
    // Polling interval
    state.pollingInterval = setInterval(() => {
        fetchTraffic();
        fetchTransit();
        fetchParking();
        fetchSafety();
    }, 6000);
}

document.addEventListener('DOMContentLoaded', init);
