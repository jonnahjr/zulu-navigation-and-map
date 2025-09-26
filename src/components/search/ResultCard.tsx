import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const ResultCard: React.FC<{ item: any; onPress?: (i: any) => void }> = ({ item, onPress }) => {
  const mainText = item.structured_formatting?.main_text || item.name || item.description?.split(',')[0] || 'Unknown Place';
  const secondaryText = item.structured_formatting?.secondary_text || item.description || '';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(item)}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{mainText}</Text>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        {item.rating && (
          <Text style={styles.rating}>★ {item.rating}</Text>
        )}
      </View>

      {secondaryText && secondaryText !== mainText && (
        <Text style={styles.address} numberOfLines={2}>{secondaryText}</Text>
      )}

      <View style={styles.metaContainer}>
        {item.distanceMeters && (
          <Text style={styles.distance}>📍 {(item.distanceMeters / 1000).toFixed(1)} km</Text>
        )}
        {item.opening_hours?.open_now !== undefined && (
          <Text style={[styles.status, item.opening_hours.open_now ? styles.open : styles.closed]}>
            {item.opening_hours.open_now ? '🟢 Open' : '🔴 Closed'}
          </Text>
        )}
        {item._loading && (
          <Text style={styles.loading}>Loading details...</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  titleContainer: {
    flex: 1,
    marginRight: 12
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  categoryText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '500'
  },
  rating: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600'
  },
  address: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  distance: {
    color: '#00FFFF',
    fontSize: 12,
    marginRight: 12
  },
  status: {
    fontSize: 12,
    fontWeight: '500'
  },
  open: {
    color: '#4CAF50'
  },
  closed: {
    color: '#F44336'
  },
  loading: {
    color: '#AAA',
    fontSize: 12,
    fontStyle: 'italic'
  }
});
