import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';
import { RouteStep } from '../types/navigation';

interface NavigationState {
  favorites: string[];
  routes: RouteStep[][];
  addFavorite: (placeId: string) => void;
  removeFavorite: (placeId: string) => void;
  addRoute: (steps: RouteStep[]) => void;
  removeRoute: (index: number) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set: any, get: any) => ({
      favorites: [],
      routes: [],
      addFavorite: (placeId: string) => {
        const current = get().favorites;
        if (!current.includes(placeId)) {
          set({ favorites: [...current, placeId] });
        }
      },
  removeFavorite: (placeId: string) => set({ favorites: get().favorites.filter((id: string) => id !== placeId) }),
      addRoute: (steps: RouteStep[]) => set({ routes: [...get().routes, steps] }),
  removeRoute: (index: number) => set({ routes: get().routes.filter((_: RouteStep[], i: number) => i !== index) }),
    }),
    { name: 'navigation-storage', getStorage: () => AsyncStorage }
  )
);
