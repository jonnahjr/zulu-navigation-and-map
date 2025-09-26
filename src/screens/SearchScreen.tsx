import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import SearchBar from '../components/SearchBar';
import SearchFilters from '../components/search/SearchFilters';
import ResultsList from '../components/search/ResultsList';
import TrendingList from '../components/search/TrendingList';
import useVoiceSearch from '../hooks/useVoiceSearch';
import { fetchAutocomplete } from '../utils/places';
import NeonCard from '../components/design/NeonCard';
import CupertinoLayout from '../components/cupertino/CupertinoLayout';
import BlurFallback from '../components/design/BlurFallback';
import { useLocation } from '../hooks/useLocation';
// Support both CommonJS and ESM exports from the platform MapView file
const _mapMod = require('../components/MapView');
const CustomMapView = (_mapMod && _mapMod.default) ? _mapMod.default : _mapMod;
import { getPlaceDetails } from '../utils/places';
import { getGlobalPlaces, getDirections } from '../utils/mapHelpers';
import { getPlaceDetails as getPlaceDetailsFromMaps, distanceMeters } from '../utils/mapHelpers';
import { useNavigation, useRoute } from '@react-navigation/native';

const SearchScreen: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<{ latitude: number; longitude: number } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [popularPlaces, setPopularPlaces] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const voice = useVoiceSearch();
  const navigation = useNavigation();
  const route = useRoute();
  const initialQuery = (route.params as any)?.initialQuery || '';
  const [query, setQuery] = useState(initialQuery);
  const { location } = useLocation();

  // Addis Ababa center coordinates
  const addisAbabaCenter = { latitude: 9.03, longitude: 38.74 };
  const addisAbabaRegion = {
    latitude: 9.03,
    longitude: 38.74,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Load popular places on mount
  React.useEffect(() => {
    loadPopularPlaces();
  }, []);

  const loadPopularPlaces = async () => {
    try {
      // Load some popular places in Addis Ababa
      const popularQueries = [
        'Shiromeda Market',
        'National Museum of Ethiopia',
        'Holy Trinity Cathedral',
        'Red Terror Martyrs Memorial',
        'Entoto Hill'
      ];

      const popularResults = [];
      for (const query of popularQueries.slice(0, 3)) {
        try {
          const places = await getGlobalPlaces(query);
          if (places && places.length > 0) {
            popularResults.push({
              ...places[0],
              isPopular: true,
              category: 'Popular'
            });
          }
        } catch (e) {
          console.warn(`Failed to load popular place: ${query}`, e);
        }
      }
      setPopularPlaces(popularResults);
    } catch (error) {
      console.warn('Failed to load popular places', error);
    }
  };

  const handleSubmit = async (q: string) => {
    if (!q || q.length < 1) return;
    try {
      const places = await getGlobalPlaces(q);
      if (!places || places.length === 0) return;
      const mapped = places.map((p: any) => ({ place_id: p.id, description: `${p.name} — ${p.vicinity || ''}`, location: p.location }));
      setResults(mapped);
      // focus first result on map and preview route
      const first = places[0];
      if (first && first.geometry && first.geometry.location) {
        const coords = { latitude: first.geometry.location.lat || first.location?.lat || first.location?.latitude, longitude: first.geometry.location.lng || first.location?.lng || first.location?.longitude };
        setSelectedPlace(coords);
        // if we have current location, compute route preview and navigate
        if (location) {
          try {
            const preview = await getDirections({ latitude: location.latitude, longitude: location.longitude }, coords, 'driving');
            (navigation as any).navigate('Directions', { routePreview: preview, origin: { latitude: location.latitude, longitude: location.longitude }, destination: coords });
          } catch (e) {
            console.warn('preview route failed', e);
          }
        }
      }
    } catch (e) {
      console.warn('global place search failed', e);
    }
  };

  const handlePlaceSelect = async (placeId: string, description: string) => {
    const details = await getPlaceDetails(placeId);
    if (details && details.location) {
      setSelectedPlace(details.location);
      // navigate to Directions screen, passing destination coords
      // @ts-ignore - navigation typing light here
      navigation.navigate('Directions', { destination: details.location, destinationName: details.name });
    }
  };

  const handleQuery = async (q: string) => {
    setQuery(q);
    if (!q || q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchAutocomplete(q, undefined);
      setResults(res as any[]);
    } catch (e) {
      console.warn('autocomplete failed', e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrendingPick = (t: string) => {
    setQuery(t);
    handleQuery(t);
  };

  const handleVoicePick = () => {
    voice.start((text) => { handleQuery(text); });
  };

  // Enrich top results with details and distances when results change
  React.useEffect(() => {
    let mounted = true;
    const enrich = async () => {
      if (!results || results.length === 0) return;
      const max = Math.min(8, results.length);
      const concurrency = 4;
  const out = results.map((r: any) => ({ ...r }));
  // mark top items as loading
  for (let i = 0; i < Math.min(max, out.length); i++) out[i]._loading = true;
  if (mounted) setResults(out);
      let idx = 0;
      const workers: Promise<void>[] = [];
      const doFetch = async (i: number) => {
        const r = out[i];
        try {
          const details = await getPlaceDetailsFromMaps(r.place_id || r.id);
          if (details) {
            r.rating = details.rating;
            r.opening_hours = details.opening_hours;
            r.address = r.address || details.address || r.description;
            if (location && details.location) {
              r.distanceMeters = distanceMeters({ latitude: location.latitude, longitude: location.longitude }, details.location);
            }
          }
        } catch (e) {
          // ignore per-item errors
        } finally {
          r._loading = false;
          if (mounted) setResults([...out]);
        }
      };
      while (idx < max) {
        while (workers.length < concurrency && idx < max) {
          const i = idx++;
          const p = doFetch(i).then(() => {
            // remove finished
            const k = workers.indexOf(p as any);
            if (k >= 0) workers.splice(k, 1);
          });
          workers.push(p as any);
        }
        // wait for one to finish
        await Promise.race(workers);
      }
      await Promise.all(workers);
      if (mounted) setResults(out);
    };
    enrich();
    return () => { mounted = false; };
  }, [results, location]);

  return (
    <CupertinoLayout>
      <View style={styles.container}>
        {/* Clean Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover Addis Ababa</Text>
          <Text style={styles.headerSubtitle}>Find places, explore the city</Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <BlurFallback style={styles.searchContainer}>
            <SearchBar
              onPlaceSelect={handlePlaceSelect}
              initialQuery={initialQuery}
              onSubmit={handleSubmit}
            />
          </BlurFallback>

          {/* Voice Search */}
          <TouchableOpacity
            style={[styles.voiceButton, voice.listening && styles.voiceButtonActive]}
            onPress={handleVoicePick}
          >
            <Text style={styles.voiceIcon}>{voice.listening ? '🎙️' : '🎤'}</Text>
            <Text style={styles.voiceText}>
              {voice.listening ? 'Listening...' : 'Voice'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {/* Search Results or Popular Places */}
          {(results.length > 0 || (results.length === 0 && !isLoading)) && (
            <View style={styles.resultsSection}>
              {results.length > 0 ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    {isLoading && <Text style={styles.loadingText}>Searching...</Text>}
                  </View>
                  <View style={styles.resultsList}>
                    {results.slice(0, 6).map((result, index) => (
                      <TouchableOpacity
                        key={result.place_id || index}
                        style={styles.resultCard}
                        onPress={() => handlePlaceSelect(result.place_id || result.id, result.description || result.name)}
                      >
                        <View style={styles.resultIcon}>
                          <Text style={styles.resultIconText}>
                            {result.category === 'Food & Drink' ? '🍽️' :
                             result.category === 'Health' ? '🏥' :
                             result.category === 'Finance' ? '💰' :
                             result.category === 'Education' ? '📚' :
                             result.category === 'Transportation' ? '🚌' : '📍'}
                          </Text>
                        </View>
                        <View style={styles.resultContent}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {result.structured_formatting?.main_text || result.description?.split(',')[0] || 'Unknown Place'}
                          </Text>
                          <Text style={styles.resultSubtitle} numberOfLines={1}>
                            {result.structured_formatting?.secondary_text || result.description?.split(',').slice(1).join(', ') || result.category}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.resultAction}>
                          <Text style={styles.resultActionText}>→</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Explore Popular Places</Text>
                  </View>
                  <View style={styles.popularGrid}>
                    {popularPlaces.slice(0, 6).map((place, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.popularCard}
                        onPress={() => handlePlaceSelect(place.place_id || place.id, place.description || place.name)}
                      >
                        <Text style={styles.popularIcon}>
                          {place.name?.includes('Museum') ? '🏛️' :
                           place.name?.includes('Cathedral') ? '⛪' :
                           place.name?.includes('Market') ? '🛒' :
                           place.name?.includes('Hill') ? '🏔️' : '📍'}
                        </Text>
                        <Text style={styles.popularName} numberOfLines={2}>
                          {place.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quick Search Categories */}
                  <View style={styles.categoriesSection}>
                    <Text style={styles.categoriesTitle}>Quick Search</Text>
                    <View style={styles.categoriesGrid}>
                      {[
                        { name: 'Restaurants', icon: '🍽️', query: 'restaurants in Addis Ababa' },
                        { name: 'Hotels', icon: '🏨', query: 'hotels in Addis Ababa' },
                        { name: 'Banks', icon: '🏦', query: 'banks in Addis Ababa' },
                        { name: 'Hospitals', icon: '🏥', query: 'hospitals in Addis Ababa' },
                        { name: 'Shopping', icon: '🛍️', query: 'shopping in Addis Ababa' },
                        { name: 'Transport', icon: '🚌', query: 'bus stations in Addis Ababa' }
                      ].map((category, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.categoryCard}
                          onPress={() => handleTrendingPick(category.query)}
                        >
                          <Text style={styles.categoryIcon}>{category.icon}</Text>
                          <Text style={styles.categoryName}>{category.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Map Section */}
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Map View</Text>
              {selectedPlace && (
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => {
                    if (location) {
                      (navigation as any).navigate('Directions', {
                        destination: selectedPlace,
                        destinationName: 'Selected Location'
                      });
                    }
                  }}
                >
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.mapContainer}>
              <CustomMapView
                initialRegion={addisAbabaRegion}
                route={selectedPlace ? [selectedPlace] : undefined}
                originLngLat={location ? [location.longitude, location.latitude] : undefined}
                destinationLngLat={selectedPlace ? [selectedPlace.longitude, selectedPlace.latitude] : undefined}
              />
            </View>
          </View>
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  headerSubtitle: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center'
  },

  // Search Section
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  searchContainer: {
    flex: 1,
    marginRight: 12,
    borderRadius: 12
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)'
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#00FFFF'
  },
  voiceIcon: { fontSize: 18, marginRight: 6 },
  voiceText: { color: '#00FFFF', fontSize: 14, fontWeight: '500' },

  // Content Area
  contentArea: { flex: 1 },

  // Results Section
  resultsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 300
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600'
  },
  loadingText: {
    color: '#00FFFF',
    fontSize: 14
  },

  // Results List
  resultsList: { marginBottom: 16 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  resultIconText: { fontSize: 18 },
  resultContent: { flex: 1 },
  resultTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  resultSubtitle: {
    color: '#CCC',
    fontSize: 14
  },
  resultAction: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,255,0.1)'
  },
  resultActionText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },

  // Popular Places Grid
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  popularCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  popularIcon: { fontSize: 24, marginBottom: 8 },
  popularName: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500'
  },

  // Categories Section
  categoriesSection: { marginTop: 8 },
  categoriesTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryCard: {
    width: '30%',
    backgroundColor: 'rgba(0,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)'
  },
  categoryIcon: { fontSize: 24, marginBottom: 8 },
  categoryName: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },

  // Map Section
  mapSection: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  mapTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  navigateButton: {
    backgroundColor: '#00FFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25
  },
  navigateButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600'
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  }
});

export default SearchScreen;
