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
        {/* Search Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Addis Ababa</Text>
          <Text style={styles.headerSubtitle}>Find places, restaurants, and more</Text>
        </View>

        {/* Search Bar */}
        <BlurFallback style={styles.searchContainer}>
          <SearchBar
            onPlaceSelect={handlePlaceSelect}
            initialQuery={initialQuery}
            onSubmit={handleSubmit}
          />
        </BlurFallback>

        {/* Voice Search Button */}
        <View style={styles.voiceButtonContainer}>
          <TouchableOpacity
            style={[styles.voiceButton, voice.listening && styles.voiceButtonActive]}
            onPress={handleVoicePick}
          >
            <Text style={styles.voiceIcon}>{voice.listening ? '🎙️' : '🎤'}</Text>
            <Text style={styles.voiceText}>
              {voice.listening ? 'Listening...' : 'Voice Search'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {isLoading && <Text style={styles.loadingText}>Searching...</Text>}
            <ResultsList
              results={results}
              onSelect={(r) => handlePlaceSelect(r.place_id || r.id, r.description || r.name)}
            />
          </View>
        )}

        {/* Popular Places (when no search) */}
        {results.length === 0 && !isLoading && (
          <>
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>Popular Places</Text>
              {popularPlaces.length > 0 ? (
                <ResultsList
                  results={popularPlaces}
                  onSelect={(r) => handlePlaceSelect(r.place_id || r.id, r.description || r.name)}
                />
              ) : (
                <Text style={styles.loadingText}>Loading popular places...</Text>
              )}
            </View>

            <TrendingList onPick={handleTrendingPick} />
          </>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          <CustomMapView
            initialRegion={addisAbabaRegion}
            route={selectedPlace ? [selectedPlace] : undefined}
            originLngLat={location ? [location.longitude, location.latitude] : undefined}
            destinationLngLat={selectedPlace ? [selectedPlace.longitude, selectedPlace.latitude] : undefined}
          />
          {selectedPlace && (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>
                📍 Selected location
              </Text>
            </View>
          )}
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { color: '#CCC', fontSize: 16 },
  searchContainer: { marginHorizontal: 20, marginBottom: 15, borderRadius: 12 },
  voiceButtonContainer: { alignItems: 'center', marginBottom: 20 },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)'
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#00FFFF'
  },
  voiceIcon: { fontSize: 18, marginRight: 8 },
  voiceText: { color: '#00FFFF', fontSize: 16, fontWeight: '500' },
  resultsSection: { paddingHorizontal: 20, marginBottom: 20 },
  popularSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  loadingText: { color: '#CCC', fontSize: 14, textAlign: 'center', marginVertical: 10 },
  mapContainer: { flex: 1, margin: 20, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  mapOverlayText: { color: '#FFF', fontSize: 12, fontWeight: '500' }
});

export default SearchScreen;
