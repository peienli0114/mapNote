import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, Memo } from '../types';

// Fix for default Leaflet markers in React
// We cannot import images directly in ES module environments without a bundler that handles them.
// Using CDN URLs ensures compatibility.
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  center: Coordinates;
  memos: Memo[];
  onMapClick: (coords: Coordinates) => void;
  onMemoClick: (memo: Memo) => void;
  userLocation: Coordinates | null;
}

// Component to handle map clicks
const MapEvents = ({ onMapClick }: { onMapClick: (coords: Coordinates) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Component to fly to user location on update
const RecenterMap = ({ center }: { center: Coordinates }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
};

const Map: React.FC<MapProps> = ({ center, memos, onMapClick, onMemoClick, userLocation }) => {
  
  // Custom marker for user location
  const userIcon = L.divIcon({
    className: 'custom-user-icon',
    html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const createMemoIcon = (color: string) => L.divIcon({
    className: 'custom-memo-icon',
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white" style="background-color: ${color}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  return (
    <MapContainer 
      center={[center.lat, center.lng]} 
      zoom={15} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEvents onMapClick={onMapClick} />
      
      {/* Memos */}
      {memos.map((memo) => (
        <React.Fragment key={memo.id}>
          <Circle 
            center={[memo.location.lat, memo.location.lng]}
            radius={memo.radius}
            pathOptions={{ color: memo.color, fillColor: memo.color, fillOpacity: 0.1, weight: 1 }}
          />
          <Marker 
            position={[memo.location.lat, memo.location.lng]}
            icon={createMemoIcon(memo.color)}
            eventHandlers={{
              click: () => onMemoClick(memo)
            }}
          >
          </Marker>
        </React.Fragment>
      ))}

      {/* User Location */}
      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={1000}>
            <Popup>您的位置</Popup>
          </Marker>
          <Circle 
            center={[userLocation.lat, userLocation.lng]} 
            radius={50} // Rough accuracy circle
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 0 }}
          />
        </>
      )}
    </MapContainer>
  );
};

export default Map;