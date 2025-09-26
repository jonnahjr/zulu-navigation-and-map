import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  bio: string;
  joinDate: string;
  preferences: {
    notifications: boolean;
    locationServices: boolean;
    darkMode: boolean;
    mapStyle: 'standard' | 'satellite' | 'terrain';
    voiceGuidance: boolean;
  };
  stats: {
    placesVisited: number;
    routesPlanned: number;
    totalDistance: number;
    favoriteCategories: string[];
  };
}

interface UserState {
  profile: UserProfile;
  visitedPlaces: any[];
  savedPlaces: any[];
  updateProfile: (updates: Partial<UserProfile>) => void;
  addVisitedPlace: (place: any) => void;
  addSavedPlace: (place: any) => void;
  removeSavedPlace: (placeId: string) => void;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => void;
  logout: () => void;
}

const defaultProfile: UserProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: '👤',
  bio: 'Navigation enthusiast exploring the world one route at a time.',
  joinDate: new Date().toISOString().split('T')[0],
  preferences: {
    notifications: true,
    locationServices: true,
    darkMode: true,
    mapStyle: 'standard',
    voiceGuidance: true,
  },
  stats: {
    placesVisited: 0,
    routesPlanned: 0,
    totalDistance: 0,
    favoriteCategories: ['restaurant', 'cafe', 'park'],
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set: any, get: any) => ({
      profile: defaultProfile,
      visitedPlaces: [],
      savedPlaces: [],

      updateProfile: (updates: Partial<UserProfile>) =>
        set((state: UserState) => ({
          profile: { ...state.profile, ...updates },
        })),

      addVisitedPlace: (place: any) =>
        set((state: UserState) => ({
          visitedPlaces: [place, ...state.visitedPlaces.filter((p: any) => p.id !== place.id)].slice(0, 100),
          profile: {
            ...state.profile,
            stats: {
              ...state.profile.stats,
              placesVisited: state.profile.stats.placesVisited + 1,
            },
          },
        })),

      addSavedPlace: (place: any) =>
        set((state: UserState) => ({
          savedPlaces: [place, ...state.savedPlaces.filter((p: any) => p.id !== place.id)].slice(0, 100),
        })),

      removeSavedPlace: (placeId: string) =>
        set((state: UserState) => ({
          savedPlaces: state.savedPlaces.filter((p: any) => p.id !== placeId),
        })),

      updatePreferences: (prefs: Partial<UserProfile['preferences']>) =>
        set((state: UserState) => ({
          profile: {
            ...state.profile,
            preferences: { ...state.profile.preferences, ...prefs },
          },
        })),

      logout: () =>
        set({
          profile: defaultProfile,
          visitedPlaces: [],
          savedPlaces: [],
        }),
    }),
    {
      name: 'user-storage',
      getStorage: () => AsyncStorage,
    }
  )
);