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

// Simple fallback component for now
const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [9.03, 38.74], // Addis Ababa default
  zoom = 13,
  markers = [],
  onMarkerClick,
  style = { height: '100%', width: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }
}) => {
  return (
    <div style={style}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          Interactive Map
        </div>
        <div style={{ fontSize: '14px' }}>
          Addis Ababa • Zoom: {zoom}
        </div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
          {markers.length} location{markers.length !== 1 ? 's' : ''} marked
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;