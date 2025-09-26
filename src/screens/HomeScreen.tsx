import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import { getNearbyPlaces, getGlobalPlaces } from '../utils/mapHelpers';
// require the platform-aware MapView and support both CJS and ESM shapes
const _mapMod = require('../components/MapView');
const CustomMapView = (_mapMod && _mapMod.default) ? _mapMod.default : _mapMod;
import NeonCard from '../components/design/NeonCard';
import { colors } from '../components/design/theme';
import CupertinoLayout from '../components/cupertino/CupertinoLayout';
import BlurFallback from '../components/design/BlurFallback';
import DirectionsFloating from '../components/DirectionsFloating';
import { getDirections } from '../utils/mapHelpers';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { location } = useLocation();
  const [markers, setMarkers] = useState<{ latitude: number; longitude: number; title?: string; icon?: string }[]>([]);
  const [showTransport, setShowTransport] = useState(false);
  const [flyTo, setFlyTo] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placesList, setPlacesList] = useState<any[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<'near' | 'medium' | 'far'>('near');
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<any | null>(null);

  type RecItem = { icon: string; text: string };

  const handleQuickSearch = async (type: string) => {
    setActiveCategory(type);
    // determine center: prefer map center, then user location
    const center = mapCenter || (location ? { latitude: location.latitude, longitude: location.longitude } : { latitude: 9.03, longitude: 38.74 });
    await fetchCategoryNearby(type, center);
  };

  const fetchCategoryNearby = async (type: string, center: { latitude: number; longitude: number }) => {
    try {
      // radius depends on distanceFilter
      const radiusMap: any = { near: 2000, medium: 10000, far: 50000 };
      const radius = radiusMap[distanceFilter] || 5000;
      const places = await getNearbyPlaces(center, type, radius);
      // compute distance from center (or user location if present)
      const origin = location || center;
      const enriched = places.map((p: any) => ({
        ...p,
        distanceMeters: typeof p.location?.lat === 'number' ? (require('../utils/mapHelpers').distanceMeters({ latitude: origin.latitude, longitude: origin.longitude }, { latitude: p.location.lat, longitude: p.location.lng })) : undefined,
      }));
      // apply distanceFilter precisely
      const filtered = enriched.filter((p: any) => {
        if (typeof p.distanceMeters !== 'number') return true;
        const km = p.distanceMeters / 1000;
        if (distanceFilter === 'near') return km <= 2;
        if (distanceFilter === 'medium') return km <= 10;
        return km > 10;
      }).slice(0, 60);
      const newMarkers = filtered.map((place: any, idx: number) => ({ latitude: place.location.lat, longitude: place.location.lng, title: place.name, icon: getIconForType(type), _pulse: idx === 0 }));
      setMarkers(newMarkers);
      setPlacesList(filtered);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    }
  };

  const getIconForType = (type: string) => {
    const icons: { [key: string]: string } = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      night_club: '🎉',
      park: '🌳',
      car_repair: '🔧',
      gas_station: '⛽',
      atm: '💰',
      hospital: '🏥',
      library: '📚',
      bus_station: '🚌',
      university: '🎓',
      school: '🏫',
      local_government_office: '🏛️',
      train_station: '🚆',
    };
    return icons[type] || '📍';
  };

  const navigateWithMode = (mode: string) => {
    setShowTransport(false);
    (navigation as any).navigate('Directions', { mode });
  };

  const categories = [
    { name: 'Restaurants', icon: '🍽️', type: 'restaurant' },
    { name: 'Cafes', icon: '☕', type: 'cafe' },
    { name: 'Bars', icon: '🍺', type: 'bar' },
    { name: 'Clubs', icon: '🎉', type: 'night_club' },
    { name: 'Parks', icon: '🌳', type: 'park' },
    { name: 'Garages', icon: '🔧', type: 'car_repair' },
    { name: 'Gas Stations', icon: '⛽', type: 'gas_station' },
    { name: 'ATMs', icon: '💰', type: 'atm' },
    { name: 'Hospitals', icon: '🏥', type: 'hospital' },
    { name: 'Libraries', icon: '📚', type: 'library' },
    { name: 'Bus Stations', icon: '🚌', type: 'bus_station' },
    { name: 'Universities', icon: '🎓', type: 'university' },
    { name: 'Schools', icon: '🏫', type: 'school' },
    { name: 'Government', icon: '🏛️', type: 'local_government_office' },
    { name: 'Train Stations', icon: '🚆', type: 'train_station' },
  ];

  return (
    <CupertinoLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🗺️ Navigator</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Search')} style={styles.headerSearch}>
            <Text style={styles.headerSearchText}>Search...</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Profile')} style={styles.headerIcon}>
            <Text style={styles.icon}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Saved')} style={styles.headerIcon}>
            <Text style={styles.icon}>💾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categories}>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryButton}
              onPress={() => handleQuickSearch(cat.type)}
              accessible
              accessibilityLabel={`Find nearby ${cat.name}`}
              accessibilityRole="button"
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <BlurFallback style={styles.recommendations}>
          <TouchableOpacity style={styles.ctaButton} onPress={() => setShowTransport(!showTransport)}>
            <Text style={styles.ctaText}>Explore Nearby</Text>
          </TouchableOpacity>
          {showTransport && (
            <View style={styles.transportOptions}>
              <TouchableOpacity style={styles.transportButton} onPress={() => navigateWithMode('driving')}>
                <Text style={styles.transportText}>🚗 Driving</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.transportButton} onPress={() => navigateWithMode('walking')}>
                <Text style={styles.transportText}>🚶 Walking</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.transportButton} onPress={() => navigateWithMode('bicycling')}>
                <Text style={styles.transportText}>🚴 Bicycling</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.transportButton} onPress={() => navigateWithMode('transit')}>
                <Text style={styles.transportText}>🚍 Transit</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurFallback>
        <View style={styles.mapPreview}>
          <CustomMapView markers={markers} flyTo={flyTo} onFlyComplete={(coords: { latitude: number; longitude: number }) => { console.log('Fly complete', coords); setFlyTo(null); }} onMarkerPress={(marker: any) => { setSelectedPlaceDetails(marker); }} onRegionChangeComplete={(r: any) => { if (r && r.latitude && r.longitude) { setMapCenter({ latitude: r.latitude, longitude: r.longitude }); if (activeCategory) { fetchCategoryNearby(activeCategory, { latitude: r.latitude, longitude: r.longitude }); } } }} />
          
          <TouchableOpacity style={styles.fullMapButton} onPress={() => (navigation as any).navigate('Directions')}>
            <Text style={styles.fullMapText}>See Full Map</Text>
          </TouchableOpacity>
        </View>
        {placesList.length > 0 && (
          <View style={styles.placesList}>
            <View style={styles.filters}>
              <TouchableOpacity onPress={() => setDistanceFilter('near')} style={[styles.filterButton, distanceFilter === 'near' && styles.activeFilter]}>
                <Text style={styles.filterText}>Near (0-2km)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDistanceFilter('medium')} style={[styles.filterButton, distanceFilter === 'medium' && styles.activeFilter]}>
                <Text style={styles.filterText}>Medium (2-10km)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDistanceFilter('far')} style={[styles.filterButton, distanceFilter === 'far' && styles.activeFilter]}>
                <Text style={styles.filterText}>Far ({'>'}10km)</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={placesList}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity style={styles.placeCard} onPress={() => (navigation as any).navigate('Directions', { destination: { latitude: item.location.lat, longitude: item.location.lng }, destinationName: item.name })} onLongPress={() => { console.log('Saved', item); }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeDetails}>⭐ {item.rating || '—'} • {item.distanceMeters ? (item.distanceMeters/1000).toFixed(2)+' km' : '—'} • {item.opening_hours?.open_now ? 'Open' : (item.opening_hours?.open_now === false ? 'Closed' : '—')}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity style={{ marginRight: 8 }} onPress={() => { (navigation as any).navigate('Directions', { destination: { latitude: item.location.lat, longitude: item.location.lng }, destinationName: item.name }); }}><Text style={{ color: '#00FFFF' }}>Directions</Text></TouchableOpacity>
                    <TouchableOpacity style={{ marginRight: 8 }} onPress={async () => {
                      try {
                        const key = 'saved_places_v1';
                        const raw = await (require('../utils/storage').safeGetItem)(key);
                        const cur = raw ? JSON.parse(raw) : [];
                        const entry = { name: item.name, location: item.location, address: item.vicinity || item.address };
                        const updated = [entry, ...cur.filter((c: any) => JSON.stringify(c.location) !== JSON.stringify(entry.location))].slice(0, 100);
                        await (require('../utils/storage').safeSetItem)(key, JSON.stringify(updated));
                        console.log('Saved', item.name);
                      } catch (e) { console.warn('save failed', e); }
                    }}><Text style={{ color: '#FFD700' }}>Save</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { console.log('Share', item); }}><Text style={{ color: '#FFF' }}>Share</Text></TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item: any, index: number) => index.toString()}
            />
          </View>
        )}
        {selectedPlaceDetails && (
          <View style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{selectedPlaceDetails.title}</Text>
            <Text style={{ color: '#ccc', marginTop: 6 }}>{selectedPlaceDetails.latitude}, {selectedPlaceDetails.longitude}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity style={{ marginRight: 10 }} onPress={async () => {
                if (!location) return; const dest = { latitude: selectedPlaceDetails.latitude, longitude: selectedPlaceDetails.longitude }; try { const res = await getDirections({ latitude: location.latitude, longitude: location.longitude }, dest, 'driving'); (navigation as any).navigate('Directions', { routePreview: res, origin: { latitude: location.latitude, longitude: location.longitude }, destination: dest }); } catch (e) { console.warn('directions failed', e); }
              }}><Text style={{ color: '#00FFFF' }}>Directions</Text></TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                try {
                  const key = 'saved_places_v1';
                  const raw = await (require('../utils/storage').safeGetItem)(key);
                  const cur = raw ? JSON.parse(raw) : [];
                  const entry = { name: selectedPlaceDetails.title, location: { latitude: selectedPlaceDetails.latitude, longitude: selectedPlaceDetails.longitude } };
                  const updated = [entry, ...cur.filter((c: any) => JSON.stringify(c.location) !== JSON.stringify(entry.location))].slice(0, 100);
                  await (require('../utils/storage').safeSetItem)(key, JSON.stringify(updated));
                  console.log('Saved place', selectedPlaceDetails.title);
                } catch (e) { console.warn('save failed', e); }
              }}><Text style={{ color: '#FFD700' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        )}
        <DirectionsFloating onStart={async (mode?: string) => {
          if (!location) { console.warn('No current location'); return; }
          // pick a sample destination if none marked - for demo use a short offset
          const destination = markers[0] ? { latitude: markers[0].latitude, longitude: markers[0].longitude } : { latitude: location.latitude + 0.01, longitude: location.longitude + 0.01 };
          try {
            const res = await getDirections({ latitude: location.latitude, longitude: location.longitude }, destination, (mode as any) || 'driving');
            console.log('Directions result', res);
            // navigate to Directions screen with preview payload so it can render route + steps
            (navigation as any).navigate('Directions', { routePreview: res, origin: { latitude: location.latitude, longitude: location.longitude }, destination });
          } catch (e) {
            console.error('Directions failed', e);
          }
        }} />
        <View style={styles.footer}>
          <Text style={styles.footerText}>About | Contact | Terms | Privacy</Text>
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(0,0,0,0.9)', borderBottomWidth: 1, borderBottomColor: colors.neonPrimary },
  logo: { color: colors.neonPrimary, fontSize: 20, fontWeight: 'bold' },
  headerSearch: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20, marginHorizontal: 10 },
  headerSearchText: { color: '#FFF', fontSize: 14 },
  headerIcon: { padding: 5 },
  icon: { fontSize: 20, color: '#FFF' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 10 },
  categoryButton: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 6, borderRadius: 10, margin: 2, alignItems: 'center', borderWidth: 1, borderColor: colors.neonPrimary, minWidth: 60 },
  categoryIcon: { fontSize: 18 },
  categoryText: { color: '#FFF', fontSize: 9, marginTop: 2 },
  recommendations: { margin: 10, padding: 15, borderRadius: 15 },
  recTitle: { color: colors.neonPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  recScroll: { marginBottom: 10 },
  recCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, marginRight: 10, alignItems: 'center', minWidth: 80 },
  recCardIcon: { fontSize: 24, marginBottom: 5 },
  recCardText: { color: '#FFF', fontSize: 12, textAlign: 'center' },
  ctaButton: { backgroundColor: '#00FFFF', padding: 10, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  ctaText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  transportOptions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  transportButton: { backgroundColor: 'rgba(0,255,255,0.2)', padding: 10, borderRadius: 10, alignItems: 'center' },
  transportText: { color: '#00FFFF', fontSize: 14 },
  mapPreview: { flex: 1, margin: 10, borderRadius: 15, overflow: 'hidden' },
  fullMapButton: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#00FFFF' },
  fullMapText: { color: '#00FFFF', fontSize: 12 },
  placesList: { padding: 10, backgroundColor: 'rgba(0,0,0,0.9)' },
  filters: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  filterButton: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  activeFilter: { backgroundColor: '#00FFFF' },
  filterText: { color: '#FFF', fontSize: 12 },
  placeCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, marginRight: 10, minWidth: 150 },
  placeName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  placeDetails: { color: '#CCC', fontSize: 12 },
  footer: { padding: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)' },
  footerText: { color: '#888', fontSize: 12 },
});

export default HomeScreen;
