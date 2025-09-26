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

  // Use OpenStreetMap fallback for consistency with free APIs
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapLibreFallback center={center} />
    </div>
  );
};

export default CustomMapView;
