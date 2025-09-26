import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const ResultCard: React.FC<{ item: any; onPress?: (i: any) => void }> = ({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(item)}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.name || (item.description || 'Loading…')}</Text>
        <Text style={styles.rating}>{item.rating ? `★ ${item.rating}` : (item._loading ? '...' : '-')}</Text>
      </View>
      <Text style={styles.sub}>{item.address || ''}</Text>
      <View style={styles.metaRow}>
        {item._loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : (
          <>
            <Text style={styles.meta}>{typeof item.distanceMeters === 'number' ? (item.distanceMeters / 1000).toFixed(2) + ' km' : ''}</Text>
            <Text style={styles.meta}>{item.opening_hours?.open_now !== undefined ? (item.opening_hours.open_now ? 'Open' : 'Closed') : ''}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 14, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontWeight: '700', fontSize: 18 },
  rating: { color: '#ffd700', fontSize: 16 },
  sub: { color: '#ccc', marginTop: 8, fontSize: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  meta: { color: '#aaa', fontSize: 14 }
});
