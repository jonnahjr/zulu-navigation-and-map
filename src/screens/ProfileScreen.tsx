import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigationStore } from '../store/navigationStore';

const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visited' | 'saved' | 'recommendations'>('saved');
  const { favorites, routes } = useNavigationStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.avatar}>👤</Text>
        <View>
          <Text style={styles.name}>User Name</Text>
          <Text style={styles.stats}>Favorites: {favorites.length} | Routes: {routes.length}</Text>
        </View>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('visited')} style={[styles.tab, activeTab === 'visited' && styles.activeTab]}>
          <Text style={styles.tabText}>Visited</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('saved')} style={[styles.tab, activeTab === 'saved' && styles.activeTab]}>
          <Text style={styles.tabText}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('recommendations')} style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}>
          <Text style={styles.tabText}>Recommendations</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapContainer}>
        <Text style={styles.mapText}>Map View / Pins of {activeTab} places</Text>
      </View>
      <View style={styles.achievements}>
        <Text style={styles.achievementsTitle}>Achievements / Badges</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>🏆 Visited 50 Cafes</Text>
          <Text style={styles.badge}>🌟 Explored Government Offices</Text>
        </View>
      </View>
      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>Settings / Preferences</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Map Style: Satellite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { fontSize: 50, marginRight: 15 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  stats: { fontSize: 14, color: '#00FFFF' },
  tabs: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 10, marginHorizontal: 5 },
  activeTab: { backgroundColor: '#00FFFF' },
  tabText: { color: '#FFF', fontSize: 16 },
  mapContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  mapText: { color: '#FFF', fontSize: 18 },
  achievements: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 15, marginBottom: 10 },
  achievementsTitle: { color: '#00FFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { backgroundColor: '#00FFFF', color: '#000', padding: 5, borderRadius: 10, margin: 5, fontSize: 12 },
  settings: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 15 },
  settingsTitle: { color: '#00FFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  settingItem: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, marginBottom: 5 },
  settingText: { color: '#FFF', fontSize: 16 },
});

export default ProfileScreen;
