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
        {/* Compact Header with Search */}
        <View style={styles.compactHeader}>
          <BlurFallback style={styles.searchBarContainer}>
            <SearchBar
              onPlaceSelect={handlePlaceSelect}
              initialQuery={initialQuery}
              onSubmit={handleSubmit}
            />
          </BlurFallback>
          <TouchableOpacity
            style={[styles.voiceButton, voice.listening && styles.voiceButtonActive]}
            onPress={handleVoicePick}
          >
            <Text style={styles.voiceIcon}>{voice.listening ? '🎙️' : '🎤'}</Text>
          </TouchableOpacity>
        </View>

        {/* Full Screen Map */}
        <View style={styles.fullMapContainer}>
          <CustomMapView
            initialRegion={addisAbabaRegion}
            route={selectedPlace ? [selectedPlace] : undefined}
            originLngLat={location ? [location.longitude, location.latitude] : undefined}
            destinationLngLat={selectedPlace ? [selectedPlace.longitude, selectedPlace.latitude] : undefined}
          />

          {/* Compact Suggestions Overlay */}
          {results.length > 0 && (
            <View style={styles.suggestionsOverlay}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>Search Results</Text>
                {isLoading && <Text style={styles.loadingText}>Searching...</Text>}
              </View>
              <View style={styles.compactResultsList}>
                {results.slice(0, 4).map((result, index) => (
                  <TouchableOpacity
                    key={result.place_id || index}
                    style={styles.compactResultItem}
                    onPress={() => handlePlaceSelect(result.place_id || result.id, result.description || result.name)}
                  >
                    <Text style={styles.compactResultIcon}>
                      {result.category === 'Food & Drink' ? '🍽️' :
                       result.category === 'Health' ? '🏥' :
                       result.category === 'Finance' ? '💰' :
                       result.category === 'Education' ? '📚' :
                       result.category === 'Transportation' ? '🚌' : '📍'}
                    </Text>
                    <View style={styles.compactResultText}>
                      <Text style={styles.compactResultMain} numberOfLines={1}>
                        {result.structured_formatting?.main_text || result.description?.split(',')[0] || 'Unknown Place'}
                      </Text>
                      <Text style={styles.compactResultSub} numberOfLines={1}>
                        {result.structured_formatting?.secondary_text || result.description || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {results.length > 4 && (
                  <TouchableOpacity style={styles.showMoreButton}>
                    <Text style={styles.showMoreText}>Show {results.length - 4} more results</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Popular Places Overlay (when no search) */}
          {results.length === 0 && !isLoading && (
            <View style={styles.popularOverlay}>
              <View style={styles.popularHeader}>
                <Text style={styles.popularTitle}>Popular in Addis Ababa</Text>
              </View>
              <View style={styles.popularGrid}>
                {popularPlaces.slice(0, 6).map((place, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.popularItem}
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

              {/* Quick Search Pills */}
              <View style={styles.quickSearchContainer}>
                <Text style={styles.quickSearchTitle}>Quick Search</Text>
                <View style={styles.quickSearchPills}>
                  {['Restaurants', 'Hotels', 'Banks', 'Hospitals', 'Shopping'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={styles.searchPill}
                      onPress={() => handleTrendingPick(`${category} in Addis Ababa`)}
                    >
                      <Text style={styles.searchPillText}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Route Directions Overlay */}
          {selectedPlace && (
            <View style={styles.routeOverlay}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeTitle}>Route to Destination</Text>
                <TouchableOpacity
                  style={styles.routeButton}
                  onPress={() => {
                    if (location) {
                      (navigation as any).navigate('Directions', {
                        destination: selectedPlace,
                        destinationName: 'Selected Location'
                      });
                    }
                  }}
                >
                  <Text style={styles.routeButtonText}>Start Navigation</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  searchBarContainer: {
    flex: 1,
    marginRight: 12,
    borderRadius: 10
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)'
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#00FFFF'
  },
  voiceIcon: { fontSize: 20 },
  fullMapContainer: { flex: 1, position: 'relative' },

  // Suggestions Overlay
  suggestionsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  suggestionsTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  compactResultsList: { maxHeight: 240 },
  compactResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  compactResultIcon: { fontSize: 20, marginRight: 12, width: 24, textAlign: 'center' },
  compactResultText: { flex: 1 },
  compactResultMain: { color: '#FFF', fontSize: 16, fontWeight: '500', marginBottom: 2 },
  compactResultSub: { color: '#CCC', fontSize: 14 },
  showMoreButton: { paddingVertical: 12, alignItems: 'center' },
  showMoreText: { color: '#00FFFF', fontSize: 14, fontWeight: '500' },

  // Popular Places Overlay
  popularOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  popularHeader: { marginBottom: 12 },
  popularTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  popularItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8
  },
  popularIcon: { fontSize: 24, marginBottom: 8 },
  popularName: { color: '#FFF', fontSize: 12, textAlign: 'center', lineHeight: 16 },

  // Quick Search
  quickSearchContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  quickSearchTitle: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  quickSearchPills: { flexDirection: 'row', flexWrap: 'wrap' },
  searchPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4
  },
  searchPillText: { color: '#FFF', fontSize: 12 },

  // Route Overlay
  routeOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  routeTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  routeButton: {
    backgroundColor: '#00FFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  routeButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },

  loadingText: { color: '#CCC', fontSize: 14 }
});

export default SearchScreen;
