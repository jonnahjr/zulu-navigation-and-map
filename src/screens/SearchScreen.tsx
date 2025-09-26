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

    // Show instant suggestions for any input length
    if (!q || q.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // For very short queries, show instant suggestions without loading state
    if (q.length < 2) {
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
        {/* Top: Search Bar */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <SearchBar
              onPlaceSelect={handlePlaceSelect}
              initialQuery={initialQuery}
              onSubmit={handleSubmit}
            />
          </View>
          <TouchableOpacity
            style={[styles.voiceButton, voice.listening && styles.voiceButtonActive]}
            onPress={handleVoicePick}
          >
            <Text style={styles.voiceIcon}>{voice.listening ? '🎙️' : '🎤'}</Text>
          </TouchableOpacity>
        </View>

        {/* Middle: Map with pins */}
        <View style={styles.mapSection}>
          <CustomMapView
            initialRegion={addisAbabaRegion}
            route={selectedPlace ? [selectedPlace] : undefined}
            originLngLat={location ? [location.longitude, location.latitude] : undefined}
            destinationLngLat={selectedPlace ? [selectedPlace.longitude, selectedPlace.latitude] : undefined}
          />

          {/* Floating Action Button: Locate Me */}
          <TouchableOpacity
            style={styles.locateButton}
            onPress={() => {
              // This will trigger the map to re-center on user location
              // The CustomMapView should handle this through the location prop
              console.log('Locate me pressed - re-centering on user location');
            }}
          >
            <Text style={styles.locateIcon}>📍</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom: List of results (scrollable) - Only show when user submits search */}
        <View style={styles.bottomSection}>
          {results.length > 0 && query.length > 2 && (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Search Results</Text>
                {isLoading && <Text style={styles.loadingText}>Searching...</Text>}
              </View>
              <View style={styles.resultsScroll}>
                {results.map((result, index) => (
                  <TouchableOpacity
                    key={result.place_id || index}
                    style={styles.resultItem}
                    onPress={() => handlePlaceSelect(result.place_id || result.id, result.description || result.name)}
                  >
                    <View style={styles.resultLeft}>
                      <View style={styles.resultIcon}>
                        <Text style={styles.resultIconText}>
                          {result.category === 'Food & Drink' ? '🍽️' :
                           result.category === 'Health' ? '🏥' :
                           result.category === 'Finance' ? '💰' :
                           result.category === 'Education' ? '📚' :
                           result.category === 'Transportation' ? '🚌' : '📍'}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {result.structured_formatting?.main_text || result.description?.split(',')[0] || 'Unknown Place'}
                        </Text>
                        <Text style={styles.resultAddress} numberOfLines={1}>
                          {result.structured_formatting?.secondary_text || result.description?.split(',').slice(1).join(', ') || result.category}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.resultNavigate}
                      onPress={() => {
                        if (location) {
                          (navigation as any).navigate('Directions', {
                            destination: {
                              latitude: result.location?.lat || 0,
                              longitude: result.location?.lng || 0
                            },
                            destinationName: result.description?.split(',')[0] || 'Destination'
                          });
                        }
                      }}
                    >
                      <Text style={styles.navigateText}>Navigate</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top Section: Search Bar
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  searchContainer: {
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

  // Middle Section: Map
  mapSection: {
    flex: 3,
    position: 'relative'
  },
  locateButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FFFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10
  },
  locateIcon: { fontSize: 24 },

  // Bottom Section: Results List
  bottomSection: {
    flex: 0.8,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    maxHeight: 300
  },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  resultsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  loadingText: {
    color: '#00FFFF',
    fontSize: 14
  },

  // Results Scroll
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 8
  },

  // Result Items
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  resultLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
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
  resultInfo: { flex: 1 },
  resultName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  resultAddress: {
    color: '#CCC',
    fontSize: 14
  },
  resultNavigate: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)'
  },
  navigateText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600'
  },

  // Popular Places
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  popularTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  popularScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 8
  },

  // Popular Items
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  popularLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  popularIcon: { fontSize: 24, marginRight: 12 },
  popularInfo: { flex: 1 },
  popularName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  popularType: {
    color: '#00FFFF',
    fontSize: 12
  },
  popularArrow: {
    color: '#CCC',
    fontSize: 20,
    fontWeight: 'bold'
  },

  // Categories
  categoriesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  categoriesTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  categoryIcon: { fontSize: 16, marginRight: 8 },
  categoryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default SearchScreen;
