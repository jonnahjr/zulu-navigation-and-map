import axios from 'axios';

export async function fetchAutocomplete(input: string, types?: string) {
  try {
    // Addis Ababa bounding box (approximate)
    const addisAbabaBounds = {
      minLon: 38.6,  // West
      minLat: 8.8,   // South
      maxLon: 38.9,  // East
      maxLat: 9.1    // North
    };

    const params: any = {
      format: 'json',
      q: input,
      limit: 15,
      // Focus on Addis Ababa area
      viewbox: `${addisAbabaBounds.minLon},${addisAbabaBounds.minLat},${addisAbabaBounds.maxLon},${addisAbabaBounds.maxLat}`,
      bounded: 1,
      // Prioritize results within the viewbox
      extratags: 1,
      addressdetails: 1
    };

    if (types) params.type = types;

    const res = await axios.get('https://nominatim.openstreetmap.org/search', { params });

    if (res.data && Array.isArray(res.data)) {
      return res.data.map((p: any) => ({
        place_id: (p.osm_type ? p.osm_type[0].toUpperCase() : 'N') + (p.osm_id?.toString() || Math.random().toString(36).slice(2)),
        description: p.display_name,
        structured_formatting: {
          main_text: p.name || p.display_name.split(',')[0],
          secondary_text: p.display_name.split(',').slice(1).join(', ').trim()
        },
        types: [p.type, p.class],
        location: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) },
        category: getCategoryFromType(p.type, p.class),
        importance: p.importance || 0
      })).sort((a, b) => (b.importance || 0) - (a.importance || 0)); // Sort by importance
    }
    return [];
  } catch (e) {
    console.warn('autocomplete error', e);
    return [];
  }
}

function getCategoryFromType(type: string, className: string): string {
  const categoryMap: { [key: string]: string } = {
    'restaurant': 'Food & Drink',
    'cafe': 'Food & Drink',
    'bar': 'Food & Drink',
    'pub': 'Food & Drink',
    'fast_food': 'Food & Drink',
    'hotel': 'Lodging',
    'motel': 'Lodging',
    'guest_house': 'Lodging',
    'hospital': 'Health',
    'clinic': 'Health',
    'pharmacy': 'Health',
    'bank': 'Finance',
    'atm': 'Finance',
    'school': 'Education',
    'university': 'Education',
    'library': 'Education',
    'shop': 'Shopping',
    'supermarket': 'Shopping',
    'mall': 'Shopping',
    'fuel': 'Transportation',
    'parking': 'Transportation',
    'bus_station': 'Transportation',
    'train_station': 'Transportation',
    'airport': 'Transportation',
    'place_of_worship': 'Religion',
    'church': 'Religion',
    'mosque': 'Religion',
    'museum': 'Culture',
    'theatre': 'Culture',
    'cinema': 'Culture',
    'park': 'Recreation',
    'sports_centre': 'Recreation',
    'stadium': 'Recreation'
  };

  return categoryMap[type] || categoryMap[className] || 'Other';
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
