import React, { useState } from 'react';
import GoogleMapWeb from './GoogleMap.web';

interface LatLng { latitude: number; longitude: number }

interface MapViewProps {
  route?: LatLng[];
  originLngLat?: [number, number];
  destinationLngLat?: [number, number] | null;
  flyTo?: { latitude: number; longitude: number } | null;
  onFlyComplete?: (coords: { latitude: number; longitude: number }) => void;
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

const MapLibreFallback: React.FC<{ center?: string }> = ({ center }) => {
  // Use an OpenStreetMap/MapLibre simple embed as a fallback when Google is unavailable
  const c = center ?? '37.7749,-122.4194';
  const [lat, lng] = c.split(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-0.02}%2C${parseFloat(lat)-0.02}%2C${parseFloat(lng)+0.02}%2C${parseFloat(lat)+0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe src={src} style={{ width: '100%', height: '100%', border: 'none' }} title="OSM Map" />;
};

const CustomMapView: React.FC<MapViewProps> = ({ route, originLngLat, destinationLngLat, flyTo, onFlyComplete, initialRegion }) => {
  // Default center is Addis Ababa (latitude,longitude)
  const defaultCenter = initialRegion ? `${initialRegion.latitude},${initialRegion.longitude}` : '9.03,38.74';
  const center = route && route.length > 0 ? `${route[0].latitude},${route[0].longitude}` : defaultCenter;
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || '';
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [lastFly, setLastFly] = useState<string | null>(null);

  const MapErrorBanner: React.FC<{ reason: string }> = ({ reason }) => (
    <div style={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 1000 }}>
      <div style={{ background: 'rgba(255,69,58,0.95)', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 700 }}>
        Google Maps unavailable ({reason}). Falling back to OpenStreetMap.
      </div>
    </div>
  );

  if (!GOOGLE_KEY || googleError) {
    // fall back to OSM embed
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {googleError && <MapErrorBanner reason={googleError} />}
        <MapLibreFallback center={center} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMapWeb
        originLngLat={originLngLat}
        destinationLngLat={destinationLngLat}
        flyTo={flyTo}
        onFlyComplete={onFlyComplete}
        onRoute={() => { /* parent MapView handles route states elsewhere */ }}
        onError={(reason: string) => {
          console.warn('GoogleMap reported error:', reason);
          setGoogleError(reason);
        }}
      />
    </div>
  );
};

export default CustomMapView;
