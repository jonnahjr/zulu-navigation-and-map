import axios from 'axios';

// Use free APIs: Nominatim for places, Mapbox for directions
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

export const getPlacePredictions = async (input: string) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=10`;
  const res = await axios.get(url);
  return res.data.map((p: any) => ({ place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + p.osm_id, description: p.display_name }));
};

export const getPlaceDetails = async (placeId: string) => {
  const url = `https://nominatim.openstreetmap.org/lookup?format=json&osm_ids=${encodeURIComponent(placeId)}`;
  const res = await axios.get(url);
  if (res.data.length > 0) {
    const r = res.data[0];
    return {
      name: r.display_name.split(',')[0],
      location: { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) },
      address: r.display_name,
      rating: null,
      opening_hours: null,
      types: [r.type],
    };
  }
  throw new Error('Place not found');
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
    const delta = radius / 111000; // approx degrees for radius in meters
    const viewbox = `${location.longitude - delta},${location.latitude - delta},${location.longitude + delta},${location.latitude + delta}`;
    const q = type ? `${type}` : '';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=${viewbox}&bounded=1&limit=20`;
    const res = await axios.get(url);
    return res.data.map((place: any) => ({
      id: (place.osm_type ? place.osm_type[0].toUpperCase() : 'N') + place.osm_id,
      name: place.display_name.split(',')[0],
      location: { lat: parseFloat(place.lat), lng: parseFloat(place.lon) },
      vicinity: place.display_name,
      opening_hours: null,
      rating: null,
      price_level: null
    }));
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw error;
  }
};

export const getGlobalPlaces = async (query: string) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20`;
    const res = await axios.get(url);
    return res.data.map((place: any) => ({
      id: (place.osm_type ? place.osm_type[0].toUpperCase() : 'N') + place.osm_id,
      name: place.display_name.split(',')[0],
      location: { lat: parseFloat(place.lat), lng: parseFloat(place.lon) },
      vicinity: place.display_name,
      opening_hours: null,
      rating: null,
      price_level: null
    }));
  } catch (error) {
    console.error('Error fetching global places:', error);
    throw error;
  }
};

export const getDirections = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }, mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving') => {
  const originStr = `${origin.longitude},${origin.latitude}`;
  const destStr = `${destination.longitude},${destination.latitude}`;
  const profile = mode === 'walking' ? 'walking' : mode === 'bicycling' ? 'cycling' : 'driving';
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${encodeURIComponent(originStr)};${encodeURIComponent(destStr)}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
  let res;
  try {
    res = await axios.get(url);
  } catch (e: any) {
    console.warn('directions request failed', e?.message || e);
    throw new Error('directions_request_failed');
  }

  if (!res.data.routes || res.data.routes.length === 0) {
    throw new Error('no_route_found');
  }

  const route = res.data.routes[0];
  const leg = route.legs[0];
  const points = route.geometry.coordinates.map((coord: [number, number]) => ({ latitude: coord[1], longitude: coord[0] }));
  const steps = leg.steps.map((s: any) => ({
    instruction: s.maneuver.instruction,
    distance: `${Math.round(s.distance)} m`,
    duration: `${Math.round(s.duration)} s`,
    start_location: s.maneuver.location,
    end_location: s.geometry.coordinates[s.geometry.coordinates.length - 1]
  }));
  return {
    points,
    steps,
    distance: `${Math.round(route.distance / 1000)} km`,
    duration: `${Math.round(route.duration / 60)} mins`
  };
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
