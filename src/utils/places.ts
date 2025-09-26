import axios from 'axios';

export async function fetchAutocomplete(input: string, types?: string) {
  try {
    const params: any = { format: 'json', q: input, limit: 10 };
    if (types) params.type = types; // Nominatim supports type filter
    const res = await axios.get('https://nominatim.openstreetmap.org/search', { params });
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((p: any) => ({
        place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + (p.osm_id?.toString() || Math.random().toString(36).slice(2)),
        description: p.display_name,
        types: [p.type]
      }));
    }
    return [];
  } catch (e) {
    console.warn('autocomplete error', e);
    return [];
  }
}

export async function getPlaceDetails(placeId: string) {
  try {
    const lookupUrl = 'https://nominatim.openstreetmap.org/lookup';
    const res = await axios.get(lookupUrl, { params: { format: 'json', osm_ids: placeId } });
    if (res.data && res.data.length > 0) {
      const r = res.data[0];
      return {
        place_id: placeId,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        location: { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) },
        opening_hours: null,
        rating: null,
        price_level: null,
        types: [r.type]
      };
    }
    return null;
  } catch (e) {
    console.warn('place details error', e);
    return null;
  }
}

export default { fetchAutocomplete, getPlaceDetails };
