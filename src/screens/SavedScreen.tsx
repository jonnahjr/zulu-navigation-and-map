import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigationStore } from '../store/navigationStore';
import RouteCard from '../components/RouteCard';
import { RouteStep } from '../types/navigation';

const SavedScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'routes' | 'history' | 'lists'>('favorites');
  const { favorites, routes, removeFavorite, removeRoute } = useNavigationStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💾 Saved</Text>
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('favorites')} style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}>
          <Text style={styles.tabText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('routes')} style={[styles.tab, activeTab === 'routes' && styles.activeTab]}>
          <Text style={styles.tabText}>Routes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.tab, activeTab === 'history' && styles.activeTab]}>
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('lists')} style={[styles.tab, activeTab === 'lists' && styles.activeTab]}>
          <Text style={styles.tabText}>Lists</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'favorites' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Places</Text>
          <FlatList
            data={favorites}
            keyExtractor={(item: string) => item}
            renderItem={({ item }: { item: string }) => (
              <View style={styles.favoriteItem}>
                <Text style={styles.favoriteText}>{item}</Text>
                <TouchableOpacity onPress={() => removeFavorite(item)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No favorites saved.</Text>}
          />
        </View>
      )}
      {activeTab === 'routes' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Routes</Text>
          <FlatList
            data={routes}
            keyExtractor={(_: RouteStep[], index: number) => index.toString()}
            renderItem={({ item, index }: { item: RouteStep[]; index: number }) => (
              <View style={styles.routeItem}>
                <RouteCard steps={item} />
                <TouchableOpacity onPress={() => removeRoute(index)} style={styles.removeButton}>
                  <Text style={styles.removeText}>Remove Route</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No routes saved.</Text>}
          />
        </View>
      )}
      {activeTab === 'history' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visited History</Text>
          <Text style={styles.placeholder}>Timeline view of past trips</Text>
        </View>
      )}
      {activeTab === 'lists' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Lists</Text>
          <Text style={styles.placeholder}>Folders: Work, Travel, Food, Friends, etc.</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareText}>Share Saved List</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#FFF' },
  tabs: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 10, marginHorizontal: 5 },
  activeTab: { backgroundColor: '#00FFFF' },
  tabText: { color: '#FFF', fontSize: 14 },
  section: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#00FFFF' },
  favoriteItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: 'rgba(0,0,0,0.8)', marginBottom: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,255,0.3)' },
  favoriteText: { color: '#FFF' },
  routeItem: { marginBottom: 16 },
  removeButton: { marginTop: 8, alignSelf: 'flex-end' },
  removeText: { color: '#FF0000', fontSize: 14 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 16 },
  placeholder: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 20 },
  shareButton: { backgroundColor: '#00FFFF', padding: 10, borderRadius: 20, marginTop: 20, alignItems: 'center' },
  shareText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});

export default SavedScreen;
