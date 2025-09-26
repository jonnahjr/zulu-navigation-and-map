import React, { useEffect, useState, useCallback } from 'react';

// Read token from process.env for Expo/web compatibility
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';

export default function MapboxDirectionsDemo() {
  const [origin] = useState<[number, number]>([38.7469, 9.03]); // [lng, lat] Addis Ababa
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [mapLib, setMapLib] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const lib = await import('react-map-gl');
        if (mounted) setMapLib(lib);
      } catch (e) {
        if (mounted) setMapLib(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchRoute = useCallback(async (originLngLat: [number, number], destLngLat: [number, number]) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLngLat[0]},${originLngLat[1]};${destLngLat[0]},${destLngLat[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        setRoute(data.routes[0].geometry);
      }
    } catch (e) {
      console.warn('Failed to fetch Mapbox directions', e);
    }
  }, []);

  useEffect(() => {
    if (destination) {
      fetchRoute(origin, destination);
    }
  }, [destination, fetchRoute, origin]);

  if (mapLib === undefined) return <div style={{ height: '100vh', width: '100%' }} />;
  if (mapLib === null) {
    // react-map-gl not installed or failed to load — show friendly placeholder
    return (
      <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8 }}>
          Mapbox / react-map-gl not available. Install `react-map-gl` or set MAPBOX_TOKEN to enable full map.
        </div>
      </div>
    );
  }

  // loosened component refs to avoid strict typing mismatch across react-map-gl versions
  const ReactMapGL: any = mapLib;
  const MapComp: any = (ReactMapGL as any).default || (ReactMapGL as any).Map || ReactMapGL;
  const MarkerComp: any = (ReactMapGL as any).Marker || (ReactMapGL as any).default?.Marker;
  const NavComp: any = (ReactMapGL as any).NavigationControl || (ReactMapGL as any).default?.NavigationControl;
  const SourceComp: any = (ReactMapGL as any).Source || (ReactMapGL as any).default?.Source;
  const LayerComp: any = (ReactMapGL as any).Layer || (ReactMapGL as any).default?.Layer;

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapComp
        initialViewState={{ longitude: origin[0], latitude: origin[1], zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAPBOX_TOKEN ? 'mapbox://styles/mapbox/dark-v11' : 'https://demotiles.maplibre.org/style.json'}
        mapboxAccessToken={MAPBOX_TOKEN || undefined}
        onClick={(e: any) => {
          // e.lngLat is [lng, lat]
          if (e && e.lngLat) {
            setDestination([e.lngLat[0], e.lngLat[1]]);
          }
        }}
      >
        {NavComp && <NavComp />}

        {/* Origin marker */}
        {MarkerComp && <MarkerComp longitude={origin[0]} latitude={origin[1]}><div style={{background:'blue', width:10, height:10, borderRadius:6}} /></MarkerComp>}

        {/* Destination marker */}
        {destination && MarkerComp && <MarkerComp longitude={destination[0]} latitude={destination[1]}><div style={{background:'red', width:10, height:10, borderRadius:6}} /></MarkerComp>}

        {/* Route as GeoJSON */}
        {route && SourceComp && LayerComp && (
          <SourceComp id="route" type="geojson" data={{ type: 'Feature', properties: {}, geometry: route }}>
            <LayerComp
              id="route-line"
              type="line"
              paint={{ 'line-color': '#00ffff', 'line-width': 4 }}
            />
          </SourceComp>
        )}
      </MapComp>
    </div>
  );
}

