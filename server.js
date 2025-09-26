const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PROXY_PORT || 3001;
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

app.use(cors());
app.use(express.json());

// Store active users and their locations
const activeUsers = new Map();
const userLocations = new Map();

// Simple polyline encoder (Google algorithm)
function encodePolyline(points) {
  let encoded = '';
  let prevLat = 0, prevLng = 0;
  for (let point of points) {
    const lat = Math.round(point[1] * 1e5);
    const lng = Math.round(point[0] * 1e5);
    encoded += encodeNumber(lat - prevLat);
    encoded += encodeNumber(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return encoded;
}

function encodeNumber(num) {
  num = num << 1;
  if (num < 0) num = ~num;
  let encoded = '';
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encoded += String.fromCharCode(num + 63);
  return encoded;
}

app.get('/api/directions', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.query;
    if (!origin || !destination) return res.status(400).json({ error: 'origin and destination required' });
    const profile = mode === 'walking' ? 'walking' : mode === 'bicycling' ? 'cycling' : 'driving';
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${encodeURIComponent(origin)};${encodeURIComponent(destination)}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const r = await fetch(url);
    const json = await r.json();
    // Transform to similar format as Google
    if (json.routes && json.routes.length > 0) {
      const route = json.routes[0];
      const leg = {
        distance: { text: `${Math.round(route.distance / 1000)} km` },
        duration: { text: `${Math.round(route.duration / 60)} mins` },
        steps: route.legs[0].steps.map((s) => ({
          html_instructions: s.maneuver.instruction,
          distance: { text: `${Math.round(s.distance)} m` },
          duration: { text: `${Math.round(s.duration)} s` },
          start_location: s.maneuver.location,
          end_location: s.geometry.coordinates[s.geometry.coordinates.length - 1]
        }))
      };
      res.json({
        status: 'OK',
        routes: [{
          overview_polyline: { points: encodePolyline(route.geometry.coordinates) },
          legs: [leg]
        }]
      });
    } else {
      res.json({ status: 'ZERO_RESULTS' });
    }
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'proxy failed' });
  }
});

// Proxy for Places Autocomplete
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ error: 'input required' });
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=10`;
    const r = await fetch(url);
    const json = await r.json();
    // Transform to Google-like format
    res.json({
      status: 'OK',
      predictions: json.map((p) => ({
        place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + p.osm_id,
        description: p.display_name,
        types: [p.type]
      }))
    });
  } catch (err) {
    console.error('autocomplete proxy error', err);
    res.status(500).json({ error: 'proxy failed' });
  }
});

// Proxy for Places Details
app.get('/api/places/details', async (req, res) => {
  try {
    const { place_id } = req.query;
    if (!place_id) return res.status(400).json({ error: 'place_id required' });
    const url = `https://nominatim.openstreetmap.org/lookup?format=json&osm_ids=${encodeURIComponent(place_id)}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.length > 0) {
      const p = json[0];
      res.json({
        status: 'OK',
        result: {
          place_id: place_id,
          name: p.display_name.split(',')[0],
          formatted_address: p.display_name,
          geometry: { location: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) } },
          opening_hours: null,
          rating: null,
          price_level: null,
          types: [p.type]
        }
      });
    } else {
      res.json({ status: 'NOT_FOUND' });
    }
  } catch (err) {
    console.error('details proxy error', err);
    res.status(500).json({ error: 'proxy failed' });
  }
});

// Proxy for Nearby Search
app.get('/api/places/nearby', async (req, res) => {
  try {
    const { location, radius = 1500, type } = req.query;
    if (!location) return res.status(400).json({ error: 'location required' });
    const [lat, lng] = location.split(',').map(Number);
    const delta = 0.01; // approx 1km
    const viewbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const q = type ? `${type}` : '';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=${viewbox}&bounded=1&limit=20`;
    const r = await fetch(url);
    const json = await r.json();
    // Transform to Google-like format
    res.json({
      status: 'OK',
      results: json.map((p) => ({
        place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + p.osm_id,
        name: p.display_name.split(',')[0],
        geometry: { location: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) } },
        vicinity: p.display_name,
        opening_hours: null,
        rating: null,
        price_level: null
      }))
    });
  } catch (err) {
    console.error('nearby proxy error', err);
    res.status(500).json({ error: 'proxy failed' });
  }
});

// Proxy for Text Search
app.get('/api/places/textsearch', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query required' });
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20`;
    const r = await fetch(url);
    const json = await r.json();
    // Transform to Google-like format
    res.json({
      status: 'OK',
      results: json.map((p) => ({
        place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + p.osm_id,
        name: p.display_name.split(',')[0],
        geometry: { location: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) } },
        formatted_address: p.display_name,
        opening_hours: null,
        rating: null,
        price_level: null
      }))
    });
  } catch (err) {
    console.error('textsearch proxy error', err);
    res.status(500).json({ error: 'proxy failed' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userData) => {
    const { userId, userName } = userData;
    activeUsers.set(socket.id, { userId, userName, socketId: socket.id });
    console.log(`User ${userName} (${userId}) joined`);

    // Send current online users count
    io.emit('userCount', activeUsers.size);
  });

  // Real-time location sharing
  socket.on('locationUpdate', (locationData) => {
    const { latitude, longitude, userId, userName } = locationData;
    userLocations.set(userId, {
      latitude,
      longitude,
      userId,
      userName,
      timestamp: Date.now(),
      socketId: socket.id
    });

    // Broadcast location to other users (for live tracking)
    socket.broadcast.emit('userLocationUpdate', {
      userId,
      userName,
      latitude,
      longitude,
      timestamp: Date.now()
    });
  });

  // Real-time search sharing (for collaborative features)
  socket.on('searchQuery', (searchData) => {
    const { query, userId, userName } = searchData;
    // Could implement collaborative search suggestions here
    console.log(`User ${userName} searching: ${query}`);
  });

  // Route sharing for social features
  socket.on('shareRoute', (routeData) => {
    const { route, userId, userName } = routeData;
    socket.broadcast.emit('routeShared', {
      route,
      userId,
      userName,
      timestamp: Date.now()
    });
  });

  // Emergency/SOS feature
  socket.on('emergency', (emergencyData) => {
    const { location, userId, userName, type } = emergencyData;
    console.log(`🚨 EMERGENCY: ${userName} needs help at ${location.latitude}, ${location.longitude}`);

    // Broadcast emergency to all users
    io.emit('emergencyAlert', {
      location,
      userId,
      userName,
      type,
      timestamp: Date.now()
    });
  });

  // Live traffic updates simulation
  socket.on('requestTraffic', (bounds) => {
    // Simulate live traffic data
    const trafficData = generateTrafficData(bounds);
    socket.emit('trafficUpdate', trafficData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      userLocations.delete(user.userId);
      console.log(`User ${user.userName} disconnected`);

      // Notify others
      io.emit('userCount', activeUsers.size);
      socket.broadcast.emit('userDisconnected', user.userId);
    }
  });
});

// Generate simulated traffic data
function generateTrafficData(bounds) {
  const trafficIncidents = [];
  const numIncidents = Math.floor(Math.random() * 5) + 1;

  for (let i = 0; i < numIncidents; i++) {
    trafficIncidents.push({
      id: `traffic_${Date.now()}_${i}`,
      type: ['accident', 'construction', 'congestion'][Math.floor(Math.random() * 3)],
      severity: Math.floor(Math.random() * 3) + 1, // 1-3
      location: {
        latitude: bounds.lat + (Math.random() - 0.5) * 0.1,
        longitude: bounds.lng + (Math.random() - 0.5) * 0.1
      },
      description: 'Live traffic update',
      timestamp: Date.now()
    });
  }

  return trafficIncidents;
}

// Real-time API endpoints
app.get('/api/realtime/users', (req, res) => {
  const users = Array.from(activeUsers.values()).map(user => ({
    userId: user.userId,
    userName: user.userName,
    online: true
  }));
  res.json({ users, count: users.length });
});

app.get('/api/realtime/locations', (req, res) => {
  const locations = Array.from(userLocations.values());
  res.json({ locations });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    server: 'zulu-navigation-realtime-backend'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Real-time navigation server listening on port ${PORT}`);
  console.log(`📍 WebSocket enabled for live features`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
