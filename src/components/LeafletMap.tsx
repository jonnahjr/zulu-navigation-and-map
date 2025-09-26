import React from 'react';

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title?: string;
    popup?: string;
  }>;
  onMarkerClick?: (position: [number, number]) => void;
  style?: React.CSSProperties;
}

// Interactive OpenStreetMap embed with markers
const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [9.03, 38.74], // Addis Ababa default
  zoom = 13,
  markers = [],
  onMarkerClick,
  style = { height: '100%', width: '100%' }
}) => {
  const [lat, lng] = center;

  // Create marker parameters for OpenStreetMap embed
  const markerParams = markers.map(marker => {
    const [mLat, mLng] = marker.position;
    return `marker=${mLat},${mLng}`;
  }).join('&');

  // OpenStreetMap embed URL with markers
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&${markerParams}`;

  return (
    <div style={{ ...style, position: 'relative' }}>
      <iframe
        src={mapUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px'
        }}
        title="OpenStreetMap"
      />
      {markers.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {markers.length} location{markers.length !== 1 ? 's' : ''} marked
        </div>
      )}
    </div>
  );
};

export default LeafletMap;