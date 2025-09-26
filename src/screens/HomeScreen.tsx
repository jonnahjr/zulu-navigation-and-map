import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import { useUserStore } from '../store/userStore';
import { getNearbyPlaces } from '../utils/mapHelpers';
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
  const { profile, savedPlaces, addVisitedPlace, addSavedPlace } = useUserStore();

  const [markers, setMarkers] = useState<{ latitude: number; longitude: number; title?: string; icon?: string }[]>([]);
  const [placesList, setPlacesList] = useState<any[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<'near' | 'medium' | 'far'>('near');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickSearch = async (type: string) => {
    setActiveCategory(type);
    setIsLoading(true);
    try {
      const center = location ? { latitude: location.latitude, longitude: location.longitude } : { latitude: 9.03, longitude: 38.74 };
      const radiusMap: any = { near: 2000, medium: 10000, far: 50000 };
      const radius = radiusMap[distanceFilter] || 5000;

      const places = await getNearbyPlaces(center, type, radius);
      const origin = location || center;
      const enriched = places.map((p: any) => ({
        ...p,
        distanceMeters: typeof p.location?.lat === 'number' ?
          require('../utils/mapHelpers').distanceMeters(
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: p.location.lat, longitude: p.location.lng }
          ) : undefined,
      }));

      const filtered = enriched.filter((p: any) => {
        if (typeof p.distanceMeters !== 'number') return true;
        const km = p.distanceMeters / 1000;
        if (distanceFilter === 'near') return km <= 2;
        if (distanceFilter === 'medium') return km <= 10;
        return km > 10;
      }).slice(0, 20);

      const newMarkers = filtered.map((place: any, idx: number) => ({
        latitude: place.location.lat,
        longitude: place.location.lng,
        title: place.name,
        icon: getIconForType(type),
        _pulse: idx === 0
      }));

      setMarkers(newMarkers);
      setPlacesList(filtered);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setIsLoading(false);
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

  const handlePlaceAction = async (place: any, action: 'navigate' | 'save' | 'visit') => {
    try {
      if (action === 'navigate') {
        (navigation as any).navigate('Directions', {
          destination: { latitude: place.location.lat, longitude: place.location.lng },
          destinationName: place.name
        });
      } else if (action === 'save') {
        addSavedPlace({
          id: place.id,
          name: place.name,
          location: place.location,
          address: place.vicinity || place.address,
          type: activeCategory
        });
      } else if (action === 'visit') {
        addVisitedPlace({
          id: place.id,
          name: place.name,
          location: place.location,
          address: place.vicinity || place.address,
          visitedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const quickActions = [
    {
      title: 'Recent Places',
      icon: '🕒',
      action: () => (navigation as any).navigate('Profile'),
      subtitle: 'View your history'
    },
    {
      title: 'Saved Places',
      icon: '💾',
      action: () => (navigation as any).navigate('Profile'),
      subtitle: `${savedPlaces.length} saved`
    },
    {
      title: 'Voice Search',
      icon: '🎤',
      action: () => (navigation as any).navigate('Search'),
      subtitle: 'Search hands-free'
    },
    {
      title: 'Settings',
      icon: '⚙️',
      action: () => (navigation as any).navigate('Profile'),
      subtitle: 'Preferences'
    }
  ];

  const categories = [
    { name: 'Food & Drink', icon: '🍽️', type: 'restaurant', color: '#FF6B6B' },
    { name: 'Coffee', icon: '☕', type: 'cafe', color: '#4ECDC4' },
    { name: 'Nightlife', icon: '🍺', type: 'bar', color: '#45B7D1' },
    { name: 'Entertainment', icon: '🎉', type: 'night_club', color: '#96CEB4' },
    { name: 'Parks', icon: '🌳', type: 'park', color: '#FFEAA7' },
    { name: 'Services', icon: '🔧', type: 'car_repair', color: '#DDA0DD' },
    { name: 'Gas', icon: '⛽', type: 'gas_station', color: '#98D8C8' },
    { name: 'Banking', icon: '💰', type: 'atm', color: '#F7DC6F' },
    { name: 'Health', icon: '🏥', type: 'hospital', color: '#BB8FCE' },
    { name: 'Education', icon: '📚', type: 'library', color: '#85C1E9' },
    { name: 'Transport', icon: '🚌', type: 'bus_station', color: '#F8C471' },
    { name: 'Emergency', icon: '🚨', type: 'police', color: '#E74C3C' },
  ];

  return (
    <CupertinoLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with greeting */}
        <View style={styles.header}>
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}, {profile.name.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>
              {location ? '📍 Location detected' : '📍 Location not available'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => (navigation as any).navigate('Search')}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchText}>Where to?</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={action.action}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.categoryCard, { backgroundColor: cat.color }]}
                onPress={() => handleQuickSearch(cat.type)}
                disabled={isLoading}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Places Results */}
        {placesList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory ? `${categories.find(c => c.type === activeCategory)?.name} Nearby` : 'Nearby Places'}
              </Text>
              <View style={styles.filterButtons}>
                {(['near', 'medium', 'far'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, distanceFilter === filter && styles.activeFilterChip]}
                    onPress={() => {
                      setDistanceFilter(filter);
                      if (activeCategory) handleQuickSearch(activeCategory);
                    }}
                  >
                    <Text style={[styles.filterChipText, distanceFilter === filter && styles.activeFilterChipText]}>
                      {filter === 'near' ? '0-2km' : filter === 'medium' ? '2-10km' : '>10km'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {placesList.map((place, index) => (
              <NeonCard key={index} style={styles.placeCard}>
                <View style={styles.placeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <Text style={styles.placeAddress}>
                      {place.vicinity || place.address || 'Address not available'}
                    </Text>
                    <View style={styles.placeMeta}>
                      <Text style={styles.placeRating}>
                        ⭐ {place.rating || '—'}
                      </Text>
                      <Text style={styles.placeDistance}>
                        📍 {place.distanceMeters ? `${(place.distanceMeters / 1000).toFixed(1)} km` : '—'}
                      </Text>
                      <Text style={styles.placeStatus}>
                        {place.opening_hours?.open_now ? '🟢 Open' : place.opening_hours?.open_now === false ? '🔴 Closed' : '⚪ Hours unknown'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.placeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePlaceAction(place, 'navigate')}
                  >
                    <Text style={styles.actionButtonText}>🧭 Navigate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePlaceAction(place, 'save')}
                  >
                    <Text style={styles.actionButtonText}>💾 Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePlaceAction(place, 'visit')}
                  >
                    <Text style={styles.actionButtonText}>✅ Visited</Text>
                  </TouchableOpacity>
                </View>
              </NeonCard>
            ))}
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Finding places nearby...</Text>
          </View>
        )}

        {/* Map Preview */}
        {markers.length > 0 && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Map View</Text>
            <View style={styles.mapContainer}>
              <CustomMapView
                markers={markers}
                onMarkerPress={(marker: any) => {
                  const place = placesList.find(p => p.location.lat === marker.latitude && p.location.lng === marker.longitude);
                  if (place) handlePlaceAction(place, 'navigate');
                }}
              />
              <TouchableOpacity
                style={styles.fullMapButton}
                onPress={() => (navigation as any).navigate('Directions')}
              >
                <Text style={styles.fullMapButtonText}>View Full Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Directions Floating Button */}
        <DirectionsFloating
          onStart={async (mode?: string) => {
            if (!location) {
              console.warn('No current location');
              return;
            }
            const destination = markers[0] ?
              { latitude: markers[0].latitude, longitude: markers[0].longitude } :
              { latitude: location.latitude + 0.01, longitude: location.longitude + 0.01 };

            try {
              const res = await getDirections(
                { latitude: location.latitude, longitude: location.longitude },
                destination,
                (mode as any) || 'driving'
              );
              (navigation as any).navigate('Directions', {
                routePreview: res,
                origin: { latitude: location.latitude, longitude: location.longitude },
                destination
              });
            } catch (e) {
              console.error('Directions failed', e);
            }
          }}
        />
      </ScrollView>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 15 },
  greetingSection: { marginBottom: 15 },
  greeting: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { color: colors.muted, fontSize: 14 },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchText: { color: colors.muted, fontSize: 16 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.outline
  },
  quickActionIcon: { fontSize: 24, marginBottom: 8 },
  quickActionTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  quickActionSubtitle: { color: colors.muted, fontSize: 12 },

  section: { marginBottom: 25, paddingHorizontal: 20 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  categoriesScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  categoryCard: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  categoryIcon: { fontSize: 24, marginBottom: 5 },
  categoryName: { color: '#FFF', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  filterButtons: { flexDirection: 'row' },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8
  },
  activeFilterChip: { backgroundColor: colors.neonPrimary },
  filterChipText: { color: colors.muted, fontSize: 12 },
  activeFilterChipText: { color: '#000', fontWeight: '600' },

  placeCard: { padding: 16, marginBottom: 12 },
  placeHeader: { flexDirection: 'row', marginBottom: 12 },
  placeName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  placeAddress: { color: colors.muted, fontSize: 14, marginBottom: 8 },
  placeMeta: { flexDirection: 'row', flexWrap: 'wrap' },
  placeRating: { color: '#FFD700', fontSize: 12, marginRight: 12 },
  placeDistance: { color: colors.neonPrimary, fontSize: 12, marginRight: 12 },
  placeStatus: { color: colors.muted, fontSize: 12 },
  placeActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2
  },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { color: colors.muted, fontSize: 16 },

  mapSection: { paddingHorizontal: 20, marginBottom: 20 },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  fullMapButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.neonPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  fullMapButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
});

export default HomeScreen;
