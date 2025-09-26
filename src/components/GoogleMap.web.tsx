import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || '';

declare global {
  interface Window { initMap?: () => void; google: any; }
}

type Props = {
  originLngLat?: [number, number]; // [lng, lat]
  destinationLngLat?: [number, number] | null;
  onRoute?: (data: any) => void;
  onError?: (reason: string) => void;
  flyTo?: { latitude: number; longitude: number } | null;
  onFlyComplete?: (coords: { latitude: number; longitude: number }) => void;
};

export default function GoogleMapWeb({ originLngLat, destinationLngLat, onRoute, onError, flyTo, onFlyComplete }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markerOriginRef = useRef<any>(null);
  const markerDestRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    if (window.google && window.google.maps) {
      setLoaded(true);
      return;
    }
    const existing = document.querySelector(`script[data-google-maps]`);
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true));
      existing.addEventListener('error', () => {
        console.error('Google Maps script failed to load (existing script)');
        onError && onError('script_load_failed');
      });
      return;
    }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    s.async = true;
    s.setAttribute('data-google-maps', '1');
    s.onload = () => setLoaded(true);
    s.onerror = () => { console.error('Google Maps script failed to load'); onError && onError('script_load_failed'); };
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!loaded || !ref.current) return;
    const google = window.google;
    mapRef.current = new google.maps.Map(ref.current, {
      center: { lat: originLngLat ? originLngLat[1] : 0, lng: originLngLat ? originLngLat[0] : 0 },
      zoom: 12,
      mapTypeId: 'roadmap',
      styles: [],
    });

    // markers
    if (originLngLat) markerOriginRef.current = new google.maps.Marker({ position: { lat: originLngLat[1], lng: originLngLat[0] }, map: mapRef.current, label: 'O' });
    if (destinationLngLat) markerDestRef.current = new google.maps.Marker({ position: { lat: destinationLngLat[1], lng: destinationLngLat[0] }, map: mapRef.current, label: 'D' });

    directionsRendererRef.current = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    directionsRendererRef.current.setMap(mapRef.current);

    // click-to-set destination
    mapRef.current.addListener('click', (e: any) => {
      const lng = e.latLng.lng();
      const lat = e.latLng.lat();
      if (markerDestRef.current) markerDestRef.current.setMap(null);
      markerDestRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapRef.current, label: 'D' });
      // request route
      getRouteAndRender([lng, lat]);
    });

    // initial route if destination provided
    if (destinationLngLat) getRouteAndRender(destinationLngLat);

    return () => {
      // cleanup
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // respond to flyTo prop changes
  useEffect(() => {
    if (!loaded || !flyTo || !mapRef.current) return;
    const google = window.google;
    const latLng = new google.maps.LatLng(flyTo.latitude, flyTo.longitude);
    // smooth pan/zoom
    mapRef.current.panTo(latLng);
    mapRef.current.setZoom(15);

    // create a glowing circle marker (overlay)
    const glow = new google.maps.Circle({
      strokeColor: '#00FFFF',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#00FFFF',
      fillOpacity: 0.25,
      map: mapRef.current,
      center: latLng,
      radius: 40,
    });
    // place a small marker center
    const centerMarker = new google.maps.Marker({ position: latLng, map: mapRef.current, label: '📍' });

    // remove glow after a short animation (1.8s)
    setTimeout(() => {
      glow.setMap(null);
      centerMarker.setMap(null);
      onFlyComplete && onFlyComplete({ latitude: flyTo.latitude, longitude: flyTo.longitude });
    }, 1800);
  }, [flyTo, loaded, onFlyComplete]);

  useEffect(() => {
    if (!loaded) return;
    // update origin/destination markers and request route when destination changes
    const google = window.google;
    if (originLngLat) {
      if (!markerOriginRef.current) markerOriginRef.current = new google.maps.Marker({ position: { lat: originLngLat[1], lng: originLngLat[0] }, map: mapRef.current, label: 'O' });
      else markerOriginRef.current.setPosition({ lat: originLngLat[1], lng: originLngLat[0] });
    }
    if (destinationLngLat) {
      if (!markerDestRef.current) markerDestRef.current = new google.maps.Marker({ position: { lat: destinationLngLat[1], lng: destinationLngLat[0] }, map: mapRef.current, label: 'D' });
      else markerDestRef.current.setPosition({ lat: destinationLngLat[1], lng: destinationLngLat[0] });
      getRouteAndRender(destinationLngLat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLngLat, destinationLngLat, loaded]);

  const getRouteAndRender = async (destLngLat: [number, number]) => {
    if (!window.google || !mapRef.current) return;
    const google = window.google;
    const ds = new google.maps.DirectionsService();
    const request = {
      origin: originLngLat ? { lat: originLngLat[1], lng: originLngLat[0] } : mapRef.current.getCenter(),
      destination: { lat: destLngLat[1], lng: destLngLat[0] },
      travelMode: google.maps.TravelMode.DRIVING,
    };
    ds.route(request, (result: any, status: string) => {
      if (status === 'OK') {
        directionsRendererRef.current.setDirections(result);
        // fit to bounds
        const bounds = new google.maps.LatLngBounds();
        const route = result.routes[0];
        route.overview_path.forEach((p: any) => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 50);
        // provide route details to parent
        const leg = route.legs[0];
        const steps = leg.steps.map((s: any) => ({ instruction: s.instructions || s.html_instructions, distance: s.distance && s.distance.text, duration: s.duration && s.duration.text }));
        onRoute && onRoute({ points: route.overview_path, steps, distance: leg.distance && leg.distance.text, duration: leg.duration && leg.duration.text });
      } else {
        console.warn('Directions request failed:', status);
        // Notify parent if denied or invalid key
        if (status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST' || status === 'OVER_QUERY_LIMIT') {
          onError && onError(status);
        }
      }
    });
  };

  if (!GOOGLE_KEY) {
    return <View><Text style={{ color: '#fff' }}>Google Maps key not configured</Text></View>;
  }

  if (loaded === false) {
    // script started loading but hasn't loaded yet or failed
    return <View><Text style={{ color: '#fff' }}>Loading Google Maps…</Text></View>;
  }

  return <div ref={ref as any} style={{ width: '100%', height: '100%' }} />;
}
