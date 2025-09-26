import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const options = ['All','Restaurants','Cafes','Gas','Events','Shops'];

export default function SearchFilters({ selected, onSelect }: { selected: string; onSelect: (s: string) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[styles.chip, selected === o && styles.active]} onPress={() => onSelect(o)}>
          <Text style={[styles.text, selected === o && styles.textActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', marginVertical: 8, flexWrap: 'wrap' }, chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 8, marginBottom: 8 }, active: { backgroundColor: '#00FFFF' }, text: { color: '#fff', fontSize: 12 }, textActive: { color: '#000' } });
