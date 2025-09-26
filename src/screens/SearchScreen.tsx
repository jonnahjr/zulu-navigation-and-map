import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import react-native as a namespace to safely access ScrollView/ActivityIndicator at runtime
import * as RNWeb from 'react-native';
const ScrollView: any = (RNWeb as any).ScrollView || (RNWeb as any).ScrollView || ((props: any) => <RNWeb.View {...props} />);
const ActivityIndicator: any = (RNWeb as any).ActivityIndicator || (() => <Text style={{ color: '#00FFFF' }}>⏳</Text>);
import CupertinoLayout from '../components/cupertino/CupertinoLayout';
import { useLocation } from '../hooks/useLocation';
import { useNavigation, useRoute } from '@react-navigation/native';

type NominatimResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  icon?: string;
  address?: any;
};

const DEFAULT_CENTER = { latitude: 9.03, longitude: 38.74 };

// Helper: map nominatim class/type to emoji icon and friendly category
const mapClassTypeToCategory = (cls?: string, type?: string) => {
  const c = (cls || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (c === 'amenity') {
    if (t.includes('restaurant') || t.includes('cafe') || t.includes('bar')) return { icon: '🍽️', label: 'Food & Drink' };
    if (t.includes('hospital') || t.includes('clinic')) return { icon: '🏥', label: 'Health' };
    if (t.includes('fuel')) return { icon: '⛽', label: 'Gas' };
    if (t.includes('school') || t.includes('university')) return { icon: '📚', label: 'Education' };
    if (t.includes('bank') || t.includes('atm')) return { icon: '🏦', label: 'Finance' };
  }
  if (c === 'boundary' || c === 'place') return { icon: '📍', label: 'Place' };
  if (c === 'tourism') return { icon: '🗺️', label: 'Tourism' };
  if (c === 'transport') return { icon: '🚌', label: 'Transit' };
  return { icon: '📌', label: (t || c || 'Unknown').replace(/_/g, ' ') };
};

const iframeMap = (center: { latitude: number; longitude: number }) => {
  const lat = center.latitude;
  const lng = center.longitude;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe src={src} style={{ width: '100%', height: '100%', border: 'none' }} title="OSM Map" />;
};

const WebLeafletMap: React.FC<{ center: { latitude: number; longitude: number }; marker?: { latitude: number; longitude: number } | null }> = ({ center, marker }) => {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // dynamic import so web-only packages don't break native builds
        const RL = await import('react-leaflet');
        const L = await import('leaflet');
        if (!mounted) return;
        // ensure marker icon images and CSS work when bundlers don't auto-include them
        try {
          // Inject Leaflet CSS from CDN if it's not already present
          const cssId = 'leaflet-css';
          if (typeof document !== 'undefined' && !document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.crossOrigin = '';
            document.head.appendChild(link);
          }
          // Fix default marker icons to use CDN images (avoids missing image asset issues)
          // @ts-ignore
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        } catch (e) {
          console.warn('leaflet resource setup failed', e);
        }
        setComponents({ ...RL, L });
        setLeafletLoaded(true);
      } catch (e) {
        // if import fails (not installed), we'll fallback to iframe
        setLeafletLoaded(false);
        setComponents(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!components || !leafletLoaded) {
    return <View style={{ flex: 1 }}>{iframeMap(center)}</View>;
  }

  const { MapContainer, TileLayer, Marker, Popup } = components as any;
  return (
    <MapContainer center={[center.latitude, center.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {marker && (
        <Marker position={[marker.latitude, marker.longitude]}>
          <Popup>{marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

const highlightMatch = (text: string, q: string): React.ReactNode => {
  if (!q) return <Text style={{ color: '#FFF' }}>{text}</Text>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <Text style={{ color: '#FFF' }}>{text}</Text>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <Text>
      <Text style={{ color: '#CCC' }}>{before}</Text>
      <Text style={{ backgroundColor: '#FFFB00', color: '#000', fontWeight: '700' }}>{match}</Text>
      <Text style={{ color: '#CCC' }}>{after}</Text>
    </Text>
  );
};

const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ latitude: number; longitude: number } | null>(null);
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(DEFAULT_CENTER);
  const { location } = useLocation();
  const navigation = useNavigation();
  const route = useRoute();
  const initialQuery = (route.params as any)?.initialQuery || '';
  const debounceRef = useRef<any>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  useEffect(() => {
    if (initialQuery && initialQuery.length > 0) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      setCenter({ latitude: location.latitude, longitude: location.longitude });
    }
  }, [location]);

  const computeViewbox = (c: { latitude: number; longitude: number }, delta = 0.2) => {
    const minLat = c.latitude - delta;
    const maxLat = c.latitude + delta;
    const minLon = c.longitude - delta;
    const maxLon = c.longitude + delta;
    // viewbox expects: left, top, right, bottom (lon left, lat top, lon right, lat bottom)
    return `${minLon},${maxLat},${maxLon},${minLat}`;
  };

  const fetchNominatim = async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const biasCenter = location && location.latitude ? { latitude: location.latitude, longitude: location.longitude } : DEFAULT_CENTER;
      const viewbox = computeViewbox(biasCenter, 0.5);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=10&viewbox=${viewbox}&bounded=1`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'zulu-navigation-app/1.0' } });
      const data = await resp.json();
      setSuggestions(data as NominatimResult[]);
    } catch (e) {
      console.warn('Nominatim fetch failed', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchNominatim(text), 220);
  };

  // Recommendation chips shown when input is empty or short
  const recommendations = [
    'Restaurants', 'Cafes', 'Gas Station', 'Hospital', 'University', 'Hotels'
  ];

  const onPickRecommendation = (t: string) => {
    setQuery(t);
    fetchNominatim(t);
  };

  const onSelectSuggestion = (s: NominatimResult) => {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    setSelected({ latitude: lat, longitude: lon });
    setCenter({ latitude: lat, longitude: lon });
    setQuery(s.display_name.split(',')[0]);
    setSuggestions([]);
    // persist recent
    try {
      const title = s.display_name.split(',')[0];
      const next = [title, ...recent.filter((r) => r !== title)].slice(0, 8);
      setRecent(next);
      AsyncStorage.setItem('recent_searches', JSON.stringify(next)).catch(() => {});
    } catch (e) {}
    // navigate to Directions if desired
    // @ts-ignore
    navigation.navigate && (navigation as any).navigate('Directions', { destination: { latitude: lat, longitude: lon }, destinationName: s.display_name.split(',')[0] });
  };

  // recent searches load
  useEffect(() => {
    AsyncStorage.getItem('recent_searches').then((v) => {
      if (v) {
        try { setRecent(JSON.parse(v)); } catch (e) {}
      }
    }).catch(() => {});
  }, []);

  // keyboard navigation for suggestions + recent list
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!focused) return;
      const listLength = Math.max(suggestions.length, recent.length);
      if (e.key === 'ArrowDown') {
        setHighlightIndex((i) => Math.min(listLength - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        setHighlightIndex((i) => Math.max(-1, i - 1));
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0) {
          const source = suggestions.length > 0 ? suggestions : recent.map((r) => ({ display_name: r, lat: '0', lon: '0', place_id: r } as any));
          const sel = source[highlightIndex];
          if (sel) {
            if (sel.lat && sel.lon) onSelectSuggestion(sel as NominatimResult);
            else { setQuery(sel.display_name); fetchNominatim(sel.display_name); }
          }
        }
      }
    };
    // only add listener on web (KeyboardEvent is browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handler as any);
      return () => window.removeEventListener('keydown', handler as any);
    }
    return () => {};
  }, [focused, highlightIndex, suggestions, recent]);

  return (
    <CupertinoLayout>
      <View style={styles.container}>
        {/* Professional Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Places</Text>
          <Text style={styles.headerSubtitle}>Find locations in Ethiopia</Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainerWeb}>
            <TextInput
              placeholder="Search places, addresses..."
              placeholderTextColor="#888"
              value={query}
              onChangeText={onChangeText}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {loading && <ActivityIndicator style={{ marginLeft: 8 }} color="#00FFFF" />}
          </View>
          {/* Recommendation chips */}
          {(!query || query.length < 2) && (
            <View>
              <View style={styles.recommendationsRow}>
                {recommendations.map((r) => (
                  <TouchableOpacity key={r} style={styles.recoChip} onPress={() => onPickRecommendation(r)}>
                    <Text style={styles.recoText}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {recent.length > 0 && !query && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#AAA', marginBottom: 6 }}>Recent</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {recent.map((r) => (
                      <TouchableOpacity key={r} style={styles.recoChip} onPress={() => { setQuery(r); fetchNominatim(r); }}>
                        <Text style={styles.recoText}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.mapSection}>
          <WebLeafletMap center={center} marker={selected} />

          <TouchableOpacity
            style={styles.locateButton}
            onPress={() => {
              if (location && location.latitude) setCenter({ latitude: location.latitude, longitude: location.longitude });
            }}
          >
            <Text style={styles.locateIcon}>📍</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.dropdownWrapper}>
            {suggestions.length > 0 && (
              <ScrollView style={styles.dropdown}>
                {suggestions.map((s) => {
                  const cat = mapClassTypeToCategory(s.class, s.type);
                  return (
                    <TouchableOpacity key={String(s.place_id)} style={styles.dropItem} onPress={() => onSelectSuggestion(s)}>
                      <View style={styles.dropLeft}>
                        <Text style={styles.dropIcon}>{cat.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={styles.dropTitle}>{highlightMatch(s.display_name.split(',')[0], query)}</Text>
                          <Text numberOfLines={1} style={styles.dropSubtitle}>{s.type ? `${cat.label} • ${s.type}` : cat.label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {!loading && suggestions.length === 0 && query.length > 0 && (
              <View style={styles.noResults}><Text style={{ color: '#CCC' }}>No results nearby</Text></View>
            )}
          </View>
        </View>
      </View>
    </CupertinoLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Professional Header
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },

  // Realtime UI removed

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
  , // comma to continue styles object
  // New styles for web search dropdown
  searchContainerWeb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    padding: 8
  },
  dropdownWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  dropdown: {
    maxHeight: 280,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  dropItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  dropLeft: { flexDirection: 'row', alignItems: 'center' },
  dropIcon: { fontSize: 20, marginRight: 12 },
  dropTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  dropSubtitle: { color: '#9AA', fontSize: 12, marginTop: 2 },
  noResults: { padding: 12, alignItems: 'center' }
  ,
  recommendationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12
  },
  recoChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  recoText: { color: '#FFF', fontSize: 13 }
});

export default SearchScreen;
