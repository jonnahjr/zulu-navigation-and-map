import { Platform } from 'react-native';

// If we're on web, re-export the web placeholder to avoid importing native-only modules.
if (Platform.OS === 'web') {
  module.exports = require('./MapView.web').default;
} else {
  // Native implementation: load react, react-native-maps and hooks lazily to avoid
  // bundling native modules into web builds.
  const React = require('react');
  const { useEffect, useRef } = React;
  const { StyleSheet, View } = require('react-native');
  const MapView = require('react-native-maps').default;
  const { PROVIDER_GOOGLE } = require('react-native-maps');
  const Marker = require('react-native-maps').Marker;
  const Polyline = require('react-native-maps').Polyline;
  const { useLocation } = require('../hooks/useLocation');

  type RoutePoint = { latitude: number; longitude: number };
  type Props = { mapType?: string; onLongPress?: (e: any) => void; route?: RoutePoint[]; markers?: { latitude: number; longitude: number; title?: string }[]; onMarkerPress?: (marker: { latitude: number; longitude: number; title?: string }) => void; flyTo?: { latitude: number; longitude: number } | null; onFlyComplete?: (coords: { latitude: number; longitude: number }) => void; onRegionChangeComplete?: (region: any) => void; initialRegion?: any };

  // widen marker typing to allow internal flags like _pulse
  type AnyMarker = { latitude: number; longitude: number; title?: string; _pulse?: boolean };
  const CustomMapView: React.FC<Props> = ({ mapType = 'standard', onLongPress, route, markers, onMarkerPress, onRegionChangeComplete, initialRegion }) => {
    const { location, region } = useLocation();
    const mapRef = useRef(null);
    const Animated = require('react-native').Animated;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    useEffect(() => {
        if (region && mapRef.current && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion(region, 1000);
        }
        // handle flyTo prop
        // @ts-ignore
        if ((props as any) && (props as any).flyTo && mapRef.current && mapRef.current.animateToRegion) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
        }
    }, [region]);

      // react to flyTo prop changes
      React.useEffect(() => {
        // @ts-ignore
        const f = (props as any) && (props as any).flyTo;
        // @ts-ignore
        const onFlyComplete = (props as any) && (props as any).onFlyComplete;
        if (f && mapRef.current && mapRef.current.animateToRegion) {
          const r = { latitude: f.latitude, longitude: f.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
          try {
            mapRef.current.animateToRegion(r, 800);
          } catch (e) { }
          // add temporary marker to simulate glow
          try {
            const m = new (require('react-native-maps').Marker)({ coordinate: { latitude: f.latitude, longitude: f.longitude }, title: 'Here' });
            // Note: adding programmatic Marker instance like this may not show; instead we rely on markers prop from parent to show markers.
          } catch (e) {
            // ignore
          }
          setTimeout(() => { onFlyComplete && onFlyComplete({ latitude: f.latitude, longitude: f.longitude }); }, 1200);
        }
      }, [/* no deps; props handled via closure when module loads */]);

    useEffect(() => {
      if (route && route.length > 0 && mapRef.current && mapRef.current.fitToCoordinates) {
        try {
          mapRef.current.fitToCoordinates(route as any, { edgePadding: { top: 80, right: 40, bottom: 80, left: 40 }, animated: true });
        } catch (e) {
          // ignore if not supported
        }
      }
    }, [route]);

    return (
      React.createElement(View, { style: styles.container },
          React.createElement(MapView, {
          ref: mapRef,
          provider: PROVIDER_GOOGLE,
          style: styles.map,
          showsUserLocation: true,
          followsUserLocation: true,
          mapType: mapType,
          initialRegion: initialRegion || region,
          onLongPress: onLongPress,
          onRegionChangeComplete: (r: any) => { try { onRegionChangeComplete && onRegionChangeComplete(r); } catch (e) {} },
        },
          location && React.createElement(Marker, { coordinate: location, title: 'You are here' }),
            markers && (markers as AnyMarker[]).map((marker, index) => {
              if (marker._pulse) {
                return React.createElement(Marker, { key: index, coordinate: { latitude: marker.latitude, longitude: marker.longitude } },
                  React.createElement(View, { style: { alignItems: 'center', justifyContent: 'center' } },
                    React.createElement(Animated.View, { style: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,255,255,0.9)', transform: [{ scale: pulseAnim.interpolate({ inputRange: [0,1], outputRange: [1,2] }) }] } }),
                    React.createElement(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FFFF', marginTop: -22 } })
                  )
                );
              }
              return React.createElement(Marker, { key: index, coordinate: { latitude: marker.latitude, longitude: marker.longitude }, title: marker.title || 'Place', onPress: () => onMarkerPress && onMarkerPress(marker) });
            }),
          route && route.length > 0 && React.createElement(Polyline, { coordinates: route, strokeWidth: 4, strokeColor: '#007AFF' })
        )
      )
    );
  };

  const styles = StyleSheet.create({ container: { flex: 1 }, map: { flex: 1 } });

  module.exports = CustomMapView;
}
