import axios from 'axios';

// For native (Expo) builds we pick up the key from env; for web we call the local proxy which uses the server key
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY'; // Replace or set in .env

export const getPlacePredictions = async (input: string) => {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_API_KEY}`;
  const res = await axios.get(url);
  return res.data.predictions.map((p: any) => ({ place_id: p.place_id, description: p.description }));
};

export const getPlaceDetails = async (placeId: string) => {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}`;
  const res = await axios.get(url);
  const r = res.data.result;
  return {
    name: r.name,
    location: { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng },
    address: r.formatted_address,
    rating: r.rating,
    opening_hours: r.opening_hours,
    types: r.types,
  };
};

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000; // meters
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sin1 = Math.sin(dLat/2);
  const sin2 = Math.sin(dLon/2);
  const aVal = sin1*sin1 + sin2*sin2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
  return R * c;
}

export const getNearbyPlaces = async (location: { latitude: number; longitude: number }, type: string, radius: number = 1500) => {
  try {
    const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    if (isWeb) {
      const url = `/api/places/nearby?location=${location.latitude},${location.longitude}&radius=${radius}${type ? `&type=${encodeURIComponent(type)}` : ''}`;
      const res = await axios.get(url);
      if (res.data.status !== 'OK') throw new Error(res.data.status || 'error');
      return res.data.results.map((place: any) => ({ id: place.place_id, name: place.name, location: place.geometry.location, vicinity: place.vicinity, opening_hours: place.opening_hours, rating: place.rating, price_level: place.price_level }));
    }
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await axios.get(url);
    if (res.data.status !== 'OK') throw new Error(res.data.status);
    return res.data.results.map((place: any) => ({ id: place.place_id, name: place.name, location: place.geometry.location, vicinity: place.vicinity, opening_hours: place.opening_hours, rating: place.rating, price_level: place.price_level }));
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw error;
  }
};

export const getGlobalPlaces = async (query: string) => {
  try {
    const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    if (isWeb) {
      const res = await axios.get(`/api/places/textsearch?query=${encodeURIComponent(query)}`);
      if (res.data.status !== 'OK') throw new Error(res.data.status || 'error');
      return res.data.results.map((place: any) => ({ id: place.place_id, name: place.name, location: place.geometry.location, vicinity: place.formatted_address, opening_hours: place.opening_hours, rating: place.rating, price_level: place.price_level }));
    }
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await axios.get(url);
    if (res.data.status !== 'OK') throw new Error(res.data.status);
    return res.data.results.map((place: any) => ({ id: place.place_id, name: place.name, location: place.geometry.location, vicinity: place.formatted_address, opening_hours: place.opening_hours, rating: place.rating, price_level: place.price_level }));
  } catch (error) {
    console.error('Error fetching global places:', error);
    throw error;
  }
};

export const getDirections = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }, mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving') => {
  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;
  // In web builds, call local proxy to avoid Google CORS restrictions
  const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const url = isWeb ? `/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&mode=${mode}` : `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&mode=${mode}&key=${GOOGLE_PLACES_API_KEY}`;
  let res;
  try {
    res = await axios.get(url);
  } catch (e: any) {
    console.warn('directions request failed', e?.message || e);
    throw new Error('directions_request_failed');
  }

  // Google may return an error status inside the JSON payload (e.g., REQUEST_DENIED)
  if (res.data && res.data.status && res.data.status !== 'OK') {
    const s = res.data.status;
    console.warn('directions service returned non-OK status', s, res.data.error_message);
    throw new Error(s || 'directions_service_error');
  }

  const route = res.data.routes && res.data.routes[0];
  if (!route) {
    throw new Error('no_route_found');
  }
  const leg = route.legs[0];
  // Decode polyline (simple implementation)
  const points = route.overview_polyline && route.overview_polyline.points ? decodePolyline(route.overview_polyline.points) : [];
  const steps = leg.steps.map((s: any) => ({ instruction: s.html_instructions.replace(/<[^>]+>/g, ''), distance: s.distance.text, duration: s.duration.text, start_location: s.start_location, end_location: s.end_location }));
  return { points, steps, distance: leg.distance.text, duration: leg.duration.text };
};

// Polyline decode (Google polyline algorithm)
export function decodePolyline(encoded: string) {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
