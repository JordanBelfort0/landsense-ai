'use client';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLandStore } from '@/app/lib/useLandStore';

/** Map a 0–100 score to a red→amber→green hue. */
function scoreColor(v: number): string {
  const hue = (v / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 75%, 45%)`;
}

export default function MapView({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { visible, selectedId, setSelectedId } = store;
  return (
    <MapContainer center={[12.9767, 77.5713]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      {visible.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.id === selectedId ? 10 : 6}
          pathOptions={{
            color: p.id === selectedId ? '#111' : scoreColor(p.compat),
            fillColor: scoreColor(p.compat),
            fillOpacity: 0.85,
            weight: p.id === selectedId ? 2 : 1,
          }}
          eventHandlers={{ click: () => setSelectedId(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
