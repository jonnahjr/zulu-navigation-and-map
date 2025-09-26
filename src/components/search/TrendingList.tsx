import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const trending = ['Food market', 'Live music', 'Coffee festival', 'Open mic', 'Art fair'];

export default function TrendingList({ onPick }: { onPick?: (t: string) => void }) {
  return (
    <View style={styles.wrap}>
      {trending.map(t => (
        <TouchableOpacity key={t} style={styles.item} onPress={() => onPick && onPick(t)}>
          <Text style={styles.text}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }, item: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 14, marginRight: 8, marginBottom: 8 }, text: { color: '#fff' } });
