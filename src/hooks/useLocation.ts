import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type LatLng = { latitude: number; longitude: number } | null;

export function useLocation() {
  const [location, setLocation] = useState<LatLng>(null);
  const [region, setRegion] = useState<any | null>({
    latitude: 9.03, // Addis Ababa fallback
    longitude: 38.74,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    let unsub: any = null;

    if (Platform.OS === 'web') {
      if ('geolocation' in navigator) {
        // Try a one-time current position first (better UX), then start watching
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ latitude, longitude });
            setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          },
          (err) => {
            console.warn('geolocation getCurrentPosition failed', err);
            // fallback to Addis Ababa already set in state
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );

        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ latitude, longitude });
            setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          },
          (err) => {
            console.warn('geolocation watchPosition error', err);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
        unsub = () => navigator.geolocation.clearWatch(id);
      }
    } else {
      // Native: use expo-location if available
      try {
        // lazy-require to avoid web bundling
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Location = require('expo-location');
        (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Location permission not granted - using fallback location');
            return;
          }
          try {
            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            if (current && current.coords) {
              const { latitude, longitude } = current.coords;
              setLocation({ latitude, longitude });
              setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            }
          } catch (e) {
            console.warn('expo-location getCurrentPositionAsync failed', e);
          }
          const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Highest, distanceInterval: 5 }, (pos: any) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ latitude, longitude });
            setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          });
          unsub = () => { sub.remove(); };
        })();
      } catch (e) {
        // expo-location not available — ignore and use fallback
        console.warn('expo-location not available', e);
      }
    }

    return () => { if (unsub) unsub(); };
  }, []);

  return { location, region };
}

export default useLocation;

