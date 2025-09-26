import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LatLng = { latitude: number; longitude: number };

type Route = {
  id: string;
  name?: string;
  coords: LatLng[];
  createdAt: number;
};

type AppState = {
  favorites: string[];
  routes: Route[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  saveRoute: (r: Route) => void;
  deleteRoute: (id: string) => void;
};

export const useAppStore = create<AppState>(
  persist(
    (set: any, get: any) => ({
      favorites: [],
      routes: [],
      addFavorite: (id: string) => set({ favorites: Array.from(new Set([...get().favorites, id])) }),
      removeFavorite: (id: string) => set({ favorites: get().favorites.filter((f: string) => f !== id) }),
      saveRoute: (r: Route) => set({ routes: [r, ...get().routes.filter((rr: Route) => rr.id !== r.id)] }),
      deleteRoute: (id: string) => set({ routes: get().routes.filter((r: Route) => r.id !== id) }),
    }),
    {
      name: 'app-storage',
      getStorage: () => AsyncStorage,
    }
  )
);

export default useAppStore;
