export const getIconForType = (type: string) => {
  const icons: { [k: string]: string } = {
    restaurant: '🍽️',
    cafe: '☕',
    bar: '🍹',
    night_club: '🎶',
    hotel: '🏨',
    lodging: '🏨',
    park: '🌳',
    car_repair: '🛠️',
    gas_station: '⛽',
    atm: '💰',
    hospital: '🏥',
    library: '📚',
    bus_station: '🚌',
    university: '🎓',
    school: '🏫',
    train_station: '🚆',
  };
  return icons[type] || '📍';
};

export const typeToLabel = (types?: string[]) => {
  if (!types || types.length === 0) return 'Place';
  const t = types[0];
  const map: any = { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', night_club: 'Club', hotel: 'Hotel', lodging: 'Hotel', park: 'Park' };
  return map[t] || (t.replace(/_/g, ' ')[0].toUpperCase() + t.replace(/_/g, ' ').slice(1));
};
