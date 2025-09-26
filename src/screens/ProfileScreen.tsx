import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { useNavigationStore } from '../store/navigationStore';
import { colors } from '../components/design/theme';
import CupertinoLayout from '../components/cupertino/CupertinoLayout';
import NeonCard from '../components/design/NeonCard';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'visited' | 'saved' | 'recommendations'>('saved');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', bio: '' });

  const {
    profile,
    visitedPlaces,
    savedPlaces,
    updateProfile,
    updatePreferences,
    logout,
    removeSavedPlace
  } = useUserStore();

  const { routes } = useNavigationStore();

  const startEditing = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      bio: profile.bio,
    });
    setIsEditing(true);
  };

  const saveProfile = () => {
    updateProfile(editForm);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'visited':
        return (
          <ScrollView style={styles.tabContent}>
            {visitedPlaces.length === 0 ? (
              <Text style={styles.emptyText}>No visited places yet. Start exploring!</Text>
            ) : (
              visitedPlaces.map((place, index) => (
                <NeonCard key={index} style={styles.placeCard}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddress}>{place.address || place.vicinity}</Text>
                  <Text style={styles.placeDate}>Visited recently</Text>
                </NeonCard>
              ))
            )}
          </ScrollView>
        );
      case 'saved':
        return (
          <ScrollView style={styles.tabContent}>
            {savedPlaces.length === 0 ? (
              <Text style={styles.emptyText}>No saved places yet. Save your favorites!</Text>
            ) : (
              savedPlaces.map((place, index) => (
                <NeonCard key={index} style={styles.placeCard}>
                  <View style={styles.placeHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      <Text style={styles.placeAddress}>{place.address || place.vicinity}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeSavedPlace(place.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => (navigation as any).navigate('Directions', {
                      destination: place.location,
                      destinationName: place.name
                    })}
                  >
                    <Text style={styles.navigateText}>Navigate</Text>
                  </TouchableOpacity>
                </NeonCard>
              ))
            )}
          </ScrollView>
        );
      case 'recommendations':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.emptyText}>Personalized recommendations coming soon!</Text>
            <Text style={styles.recommendationText}>
              Based on your preferences and visit history, we'll suggest places you might like.
            </Text>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <CupertinoLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>{profile.avatar}</Text>
            {isEditing && (
              <TouchableOpacity style={styles.editAvatarButton}>
                <Text style={styles.editAvatarText}>📷</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.profileInfo}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editForm.name}
                  onChangeText={(text: string) => setEditForm(prev => ({ ...prev, name: text }))}
                  placeholder="Name"
                  placeholderTextColor={colors.muted}
                />
                <TextInput
                  style={styles.editInput}
                  value={editForm.email}
                  onChangeText={(text: string) => setEditForm(prev => ({ ...prev, email: text }))}
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                />
              </>
            ) : (
              <>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.email}>{profile.email}</Text>
              </>
            )}
            <Text style={styles.joinDate}>Member since {new Date(profile.joinDate).toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={isEditing ? saveProfile : startEditing}
          >
            <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <NeonCard style={styles.bioCard}>
          {isEditing ? (
            <TextInput
              style={styles.bioInput}
              value={editForm.bio}
              onChangeText={(text: string) => setEditForm(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={150}
            />
          ) : (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </NeonCard>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.stats.placesVisited}</Text>
            <Text style={styles.statLabel}>Places Visited</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{routes.length}</Text>
            <Text style={styles.statLabel}>Routes Planned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{savedPlaces.length}</Text>
            <Text style={styles.statLabel}>Saved Places</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('visited')}
            style={[styles.tab, activeTab === 'visited' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'visited' && styles.activeTabText]}>Visited</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('saved')}
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('recommendations')}
            style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>For You</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Settings */}
        <NeonCard style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <TouchableOpacity
              style={[styles.toggle, profile.preferences.notifications && styles.toggleActive]}
              onPress={() => updatePreferences({ notifications: !profile.preferences.notifications })}
            >
              <Text style={[styles.toggleText, profile.preferences.notifications && styles.toggleTextActive]}>
                {profile.preferences.notifications ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Location Services</Text>
            <TouchableOpacity
              style={[styles.toggle, profile.preferences.locationServices && styles.toggleActive]}
              onPress={() => updatePreferences({ locationServices: !profile.preferences.locationServices })}
            >
              <Text style={[styles.toggleText, profile.preferences.locationServices && styles.toggleTextActive]}>
                {profile.preferences.locationServices ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Voice Guidance</Text>
            <TouchableOpacity
              style={[styles.toggle, profile.preferences.voiceGuidance && styles.toggleActive]}
              onPress={() => updatePreferences({ voiceGuidance: !profile.preferences.voiceGuidance })}
            >
              <Text style={[styles.toggleText, profile.preferences.voiceGuidance && styles.toggleTextActive]}>
                {profile.preferences.voiceGuidance ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Map Style</Text>
            <TouchableOpacity
              style={styles.mapStyleButton}
              onPress={() => {
                const styles = ['standard', 'satellite', 'terrain'] as const;
                const currentIndex = styles.indexOf(profile.preferences.mapStyle);
                const nextIndex = (currentIndex + 1) % styles.length;
                updatePreferences({ mapStyle: styles[nextIndex] });
              }}
            >
              <Text style={styles.mapStyleText}>{profile.preferences.mapStyle}</Text>
            </TouchableOpacity>
          </View>
        </NeonCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </CupertinoLayout>
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
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, marginBottom: 10 },
  settingLabel: { color: '#FFF', fontSize: 16 },
  settingText: { color: '#FFF', fontSize: 16 },
  avatarContainer: { position: 'relative' },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.neonPrimary, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  editAvatarText: { fontSize: 12 },
  profileInfo: { flex: 1 },
  editInput: { borderWidth: 1, borderColor: colors.neonPrimary, borderRadius: 8, padding: 8, marginBottom: 10, color: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)' },
  email: { color: colors.muted, fontSize: 16, marginBottom: 5 },
  joinDate: { color: colors.muted, fontSize: 12 },
  editButton: { backgroundColor: colors.neonPrimary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { color: '#000', fontWeight: 'bold' },
  bioCard: { padding: 15, marginBottom: 20 },
  bio: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  bioInput: { borderWidth: 1, borderColor: colors.neonPrimary, borderRadius: 8, padding: 10, color: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)', minHeight: 80, textAlignVertical: 'top' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNumber: { color: colors.neonPrimary, fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#FFF', fontSize: 12, marginTop: 5 },
  activeTabText: { color: '#000' },
  tabContent: { maxHeight: 300 },
  emptyText: { color: colors.muted, fontSize: 16, textAlign: 'center', marginVertical: 20 },
  recommendationText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 10 },
  placeCard: { padding: 15, marginBottom: 10 },
  placeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  placeName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  placeAddress: { color: colors.muted, fontSize: 14, marginTop: 5 },
  placeDate: { color: colors.muted, fontSize: 12, marginTop: 5 },
  removeButton: { backgroundColor: '#FF4444', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  navigateButton: { backgroundColor: colors.neonPrimary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
  navigateText: { color: '#000', fontWeight: 'bold' },
  settingsCard: { padding: 20, marginBottom: 20 },
  settingsTitle: { color: colors.neonPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  toggle: { width: 60, height: 30, borderRadius: 15, backgroundColor: colors.panel, justifyContent: 'center', alignItems: 'center' },
  toggleActive: { backgroundColor: colors.neonPrimary },
  toggleText: { color: colors.muted, fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#000' },
  mapStyleButton: { backgroundColor: colors.neonPrimary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  mapStyleText: { color: '#000', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
