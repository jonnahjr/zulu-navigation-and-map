import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Popular searches and places in Addis Ababa
const trendingSearches = [
  'Shiromeda Market',
  'Entoto Hill',
  'National Museum',
  'Red Terror Martyrs Memorial',
  'Holy Trinity Cathedral',
  'Merkato',
  'Piassa',
  'Entoto Maryam Church',
  'Addis Ababa University',
  'Bole Medhanealem',
  'Dembel City Center',
  'Edna Mall',
  'African Union Headquarters',
  'St. George Cathedral'
];

const popularCategories = [
  'Restaurants in Addis Ababa',
  'Hotels in Addis Ababa',
  'Banks in Addis Ababa',
  'Hospitals in Addis Ababa',
  'Shopping malls',
  'Coffee shops',
  'Bus stations',
  'ATMs nearby'
];

export default function TrendingList({ onPick }: { onPick?: (t: string) => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Popular Places</Text>
      <View style={styles.trendingWrap}>
        {trendingSearches.slice(0, 8).map(search => (
          <TouchableOpacity
            key={search}
            style={styles.trendingItem}
            onPress={() => onPick && onPick(search)}
          >
            <Text style={styles.trendingText}>{search}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick Searches</Text>
      <View style={styles.categoriesWrap}>
        {popularCategories.map(category => (
          <TouchableOpacity
            key={category}
            style={styles.categoryItem}
            onPress={() => onPick && onPick(category)}
          >
            <Text style={styles.categoryText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8
  },
  trendingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  trendingItem: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  trendingText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '500'
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  categoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  categoryText: {
    color: '#FFF',
    fontSize: 14
  }
});
