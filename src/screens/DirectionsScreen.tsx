import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import RouteCard from '../components/RouteCard';
import RouteSteps from '../components/RouteSteps';
// Support both CommonJS and ESM exports from the platform MapView file
const _mapMod = require('../components/MapView');
const CustomMapView = (_mapMod && _mapMod.default) ? _mapMod.default : _mapMod;
import NeonCard from '../components/design/NeonCard';
import { colors } from '../components/design/theme';
import { getDirections } from '../utils/mapHelpers';
import { speakDirection } from '../utils/voiceGuidance';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import { useNavigationStore } from '../store/navigationStore';
import * as Location from 'expo-location';

type ParamList = {
  Directions: { destination: { latitude: number; longitude: number }; destinationName?: string };
};

const DirectionsScreen: React.FC = () => {
  const route = useRoute<RouteProp<ParamList, 'Directions'>>();
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[] | undefined>(undefined);
  const [steps, setSteps] = useState<any[]>([]);

  const { location, region } = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'driving' | 'walking' | 'bicycling' | 'transit'>('driving');
  const [eta, setEta] = useState<string | null>(null);
  const [distanceStr, setDistanceStr] = useState<string | null>(null);

  if (!route.params || !route.params.destination) {
    return <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 50 }}>No destination selected</Text>;
  }

  const fetchDirections = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const origin = location ?? { latitude: 0, longitude: 0 };
      const destination = route.params.destination;
  const data = await getDirections(origin, destination, mode);
      setRoutePoints(data.points);
      setSteps(data.steps || []);
  setEta(data.duration || null);
  setDistanceStr(data.distance || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch directions');
    } finally {
      setLoading(false);
    }
  }, [location, route.params]);

  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  const startVoice = () => {
    if (steps && steps.length > 0) {
      speakDirection(steps[0].instruction + '. ' + steps[0].distance);
    }
  };

  const addRoute = useNavigationStore(state => state.addRoute);

  const saveRoute = () => {
    if (steps && steps.length > 0) {
      addRoute(steps as any);
    }
  };

  // Auto-follow skeleton: subscribe to location updates and speak when close to next step
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    if (steps && steps.length > 0) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Highest, distanceInterval: 5 }, (pos) => {
          const { latitude, longitude } = pos.coords;
          // naive proximity check to next step start_location if available
          const next = steps[0];
          if (next && (next as any).start_location) {
            const dLat = (next as any).start_location.lat - latitude;
            const dLon = (next as any).start_location.lng - longitude;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111000; // approx meters
            if (dist < 20) {
              speakDirection(next.instruction + '. ' + next.distance);
            }
          }
        });
      })();
    }
    return () => { if (sub) sub.remove(); };
  }, [steps]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchText}>Search Bar</Text>
      </View>
      <View style={styles.filterSidebar}>
        <Text style={styles.filterText}>Restaurants</Text>
        <Text style={styles.filterText}>Cafes</Text>
        <Text style={styles.filterText}>Bars</Text>
        <Text style={styles.filterText}>Parks</Text>
        <Text style={styles.filterText}>Hospitals</Text>
        <Text style={styles.filterText}>Bus Stations</Text>
      </View>
      <View style={styles.mapWrap}>
        <CustomMapView route={routePoints} />
      </View>
      <NeonCard style={[styles.routePanel, { backgroundColor: 'rgba(8,10,12,0.6)' }]}>
        {loading ? (
          <Text style={styles.loadingText}>Loading directions...</Text>
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDirections}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
              <RouteCard steps={steps} />
            <RouteSteps steps={steps} />
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#aaa', fontSize: 12 }}>Mode: {mode}</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{eta ? `ETA: ${eta}` : ''} {distanceStr ? ` · ${distanceStr}` : ''}</Text>
              </View>
          </>
        )}
      </NeonCard>
        <View style={{ position: 'absolute', top: 72, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 }}>
          {(['driving','walking','bicycling','transit'] as any[]).map((m) => (
            <TouchableOpacity key={m} onPress={() => { setMode(m); fetchDirections(); }} style={{ padding: 6, borderRadius: 6, marginBottom: 6, backgroundColor: mode === m ? '#00FFFF' : 'transparent' }}>
              <Text style={{ color: mode === m ? '#000' : '#fff' }}>{m[0].toUpperCase() + m.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={startVoice}>
          <Text style={styles.actionText}>Speak</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={saveRoute}>
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.aiWidget}>
        <Text style={styles.aiText}>AI Widget</Text>
      </View>
      <TouchableOpacity style={styles.directionButton} onPress={() => startVoice()}>
        <Text style={styles.directionIcon}>🧭</Text>
        <Text style={styles.directionText}>Start Navigation</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  searchBar: { padding: 10, backgroundColor: 'rgba(0,0,0,0.8)', borderBottomWidth: 1, borderBottomColor: '#00FFFF' },
  searchText: { color: '#FFF', fontSize: 16 },
  filterSidebar: { position: 'absolute', left: 0, top: 60, bottom: 0, width: 100, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, zIndex: 10 },
  filterText: { color: '#FFF', fontSize: 12 },
  mapWrap: { flex: 1 },
  routePanel: { padding: 8, backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(0,255,255,0.3)' },
  speakButton: { backgroundColor: '#00FFFF', padding: 10, marginVertical: 8, borderRadius: 8, shadowColor: '#00FFFF', shadowOpacity: 0.5, shadowRadius: 10 },
  speakText: { color: '#000', textAlign: 'center', fontWeight: '600' },
  loadingText: { textAlign: 'center', padding: 8, color: '#FFF' },
  errorWrap: { alignItems: 'center' },
  errorText: { color: '#FF0000', marginBottom: 8 },
  retryButton: { backgroundColor: 'rgba(0,255,255,0.2)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#00FFFF' },
  retryText: { color: '#00FFFF' },
  quickActions: { position: 'absolute', bottom: 100, right: 20, flexDirection: 'row' },
  actionButton: { backgroundColor: '#00FFFF', padding: 10, marginHorizontal: 5, borderRadius: 25, shadowColor: '#00FFFF', shadowOpacity: 0.5, shadowRadius: 10 },
  actionText: { color: '#000', fontSize: 12 },
  aiWidget: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#00FFFF' },
  aiText: { color: '#00FFFF', fontSize: 12 },
  directionButton: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#00FFFF', padding: 15, borderRadius: 50, shadowColor: '#00FFFF', shadowOpacity: 0.5, shadowRadius: 10, alignItems: 'center' },
  directionIcon: { fontSize: 20 },
  directionText: { color: '#000', fontSize: 10, marginTop: 5 },
});

// keep styles above

export default DirectionsScreen;
