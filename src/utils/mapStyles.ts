export const MAPBOX_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  terrain: 'mapbox://styles/mapbox/outdoors-v11',
};

export function getStyleKey(key: 'dark' | 'satellite' | 'terrain' | 'osm') {
  if (key === 'osm') return 'https://demotiles.maplibre.org/style.json';
  return MAPBOX_STYLES[key] || MAPBOX_STYLES.dark;
}
