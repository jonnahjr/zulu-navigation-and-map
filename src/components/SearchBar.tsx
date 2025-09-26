import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchAutocomplete } from '../utils/places';
import { getIconForType, typeToLabel } from '../utils/categoryIcons';
import { getNearbyPlaces } from '../utils/mapHelpers';
import useVoiceSearch from '../hooks/useVoiceSearch';
import { safeGetItem, safeSetItem } from '../utils/storage';

type Props = {
  onPlaceSelect: (placeId: string, description: string) => void;
  initialQuery?: string;
  onSubmit?: (q: string) => void;
};

type Suggestion = { place_id: string; description: string; types: string[]; osm_type?: string };

const SearchBar: React.FC<Props> = ({ onPlaceSelect, initialQuery = '', onSubmit }) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<Suggestion[]>([]);
  const cacheRef = React.useRef<Record<string, Suggestion[]>>({});
  const debounceRef = React.useRef<any>(null);
  const voice = useVoiceSearch();
  const categories = [
    { key: 'restaurant', label: 'Restaurants' },
    { key: 'cafe', label: 'Cafes' },
    { key: 'park', label: 'Parks' },
    { key: 'gas_station', label: 'Gas' },
    { key: 'atm', label: 'ATMs' },
  ];

  const getName = (description: string) => description.split(',')[0].trim();

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 1) { setResults([]); return; }

    // Real-time autocomplete: very short debounce (100ms) for instant feel
    debounceRef.current = setTimeout(async () => {
      try {
        if (cacheRef.current[text]) {
          setResults(cacheRef.current[text]);
          return;
        }
        const res = await fetchAutocomplete(text);
        const trimmed = (res || []).slice(0, 10);
        cacheRef.current[text] = trimmed;
        setResults(trimmed);
      } catch (e) {
        setResults([]);
      }
    }, 100); // Reduced from 300ms to 100ms for more responsive feel
  };

  const handleCategory = async (type: string) => {
    setQuery('');
    // Try to fetch nearby places if geolocation is available; callers can decide behavior
    try {
      // use a rough default center (Addis Ababa) if caller doesn't provide location
      const fakeCenter = { latitude: 9.03, longitude: 38.74 };
      const places = await getNearbyPlaces(fakeCenter, type, 5000);
      const mapped = places.map((p: any) => ({ place_id: p.id || p.name || p.vicinity || Math.random().toString(36).slice(2), description: `${p.name} — ${p.vicinity || ''}`, types: [type] }));
      setResults(mapped);
    } catch (e) {
      // fallback to empty
      setResults([]);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    setQuery(description);
    setResults([]);
    onPlaceSelect(placeId, description);
    // persist recent searches
    try {
      const key = 'recent_searches_v1';
      const raw = await safeGetItem(key);
      const cur = raw ? JSON.parse(raw) : [];
      const entry = { place_id: placeId, description };
      const updated = [entry, ...cur.filter((c: any) => c.place_id !== placeId)].slice(0, 10);
      await safeSetItem(key, JSON.stringify(updated));
      setRecent(updated);
    } catch (e) { console.warn('save recent failed', e); }
  };

  useEffect(() => {
    (async () => {
      try {
        const key = 'recent_searches_v1';
        const raw = await safeGetItem(key);
        if (raw) setRecent(JSON.parse(raw));
      } catch (e) {}
    })();
  }, []);

  const handleMic = () => {
    if (voice.listening) { voice.stop(); return; }
    voice.start((text) => {
      setQuery(text);
      // run search
      handleChange(text);
    }, (interim) => {
      if (interim) setQuery(interim);
    });
  };

  const handleCancelVoice = () => {
    voice.cancel();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <View style={styles.wrap} accessible accessibilityLabel="Search bar container">
      <TextInput
        placeholder="Search places, restaurants, gas..."
        value={query}
        onChangeText={handleChange}
        onSubmitEditing={(ev: any) => { const t = ev?.nativeEvent?.text || query; if (onSubmit) onSubmit(t); }}
        style={styles.input}
        accessible
        accessibilityLabel="Search input field"
        accessibilityHint="Enter location or place name to search"
      />
      <View style={styles.chips}>
        {categories.map((c) => (
          <TouchableOpacity key={c.key} style={styles.chip} onPress={() => handleCategory(c.key)}>
            <Text style={styles.chipText}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ position: 'absolute', right: 12, top: 10, flexDirection: 'row', alignItems: 'center' }}>
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={{ marginRight: 8 }} accessibilityLabel="Clear search">
            <Text style={{ color: '#fff' }}>✕</Text>
          </TouchableOpacity>
        )}
        {voice.listening ? (
          <>
            <TouchableOpacity onPress={handleCancelVoice} style={{ marginRight: 8 }} accessibilityLabel="Cancel voice">
              <Text style={{ color: '#FF6B6B' }}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B', marginRight: 6 }} />
              <Text style={{ color: '#FF6B6B' }}>Listening…</Text>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={handleMic} accessibilityLabel="Voice search">
            <Text style={{ color: voice.supported ? '#00FFFF' : '#666' }}>{voice.supported ? '🎤' : 'mic N/A'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {(results.length > 0 || recent.length > 0) && (
        <FlatList<Suggestion>
          data={results.length > 0 ? results : recent}
          keyExtractor={(r: Suggestion) => r.place_id}
          renderItem={({ item }: { item: Suggestion }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item.place_id, item.description)}
              style={styles.row}
              accessible
              accessibilityLabel={`Select ${item.description}`}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginRight: 12 }}>{getIconForType((item as any).types?.[0] || '')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.description}</Text>
                  <Text style={{ color: '#aaa', fontSize: 14 }}>{typeToLabel((item as any).types)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          style={styles.list}
          accessible
          accessibilityLabel="Search results list"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  input: { padding: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 18 },
  list: { maxHeight: 320, backgroundColor: 'rgba(0,0,0,0.7)', marginTop: 10, borderRadius: 10 },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  rowText: { color: '#fff', fontSize: 16 },
  chips: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#fff', fontSize: 14 },
});

export default SearchBar;
