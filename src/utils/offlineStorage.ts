import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const ROUTES_KEY = 'offline:routes';

export async function saveRoutesToStorage(routes: any[]) {
  await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes || []));
}

export async function loadRoutesFromStorage() {
  const raw = await AsyncStorage.getItem(ROUTES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function exportRoutesToFile(filename = 'routes.json') {
  const routes = await loadRoutesFromStorage();
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(routes), { encoding: FileSystem.EncodingType.UTF8 });
  return path;
}
