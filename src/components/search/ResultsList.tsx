import React from 'react';
import { View, FlatList } from 'react-native';
import { ResultCard } from './ResultCard';

export default function ResultsList({ results, onSelect }: { results: any[]; onSelect?: (r: any) => void }) {
  return (
    <View>
      <FlatList data={results} keyExtractor={(i:any)=> i.place_id || i.id || i.name} renderItem={({item}: { item: any }) => <ResultCard item={item} onPress={onSelect} />} />
    </View>
  );
}
