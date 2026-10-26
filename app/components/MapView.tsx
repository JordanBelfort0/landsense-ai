'use client';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLandStore } from '@/app/lib/useLandStore';
import { elevationColor, elevationStroke } from '@/app/lib/scale';

// CARTO now watermarks unauthenticated raster tiles; the key is passed via NEXT_PUBLIC_CARTO_KEY.
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' +
  (CARTO_KEY ? `?key=${CARTO_KEY}` : '');

export default function MapView({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { visible, selectedId, setSelectedId, persona } = store;
  return (
    <>
      <div className="ls-overlay-pill">
        <span className="dot" />
        Ranked for <b>{persona.label}</b>
        <span className="muted">· {visible.length} shown</span>
      </div>

      <MapContainer
        className="ls-map"
        center={[12.9767, 77.5713]}
        zoom={12}
        zoomControl={true}
      >
        <TileLayer url={TILE_URL} attribution="&copy; OpenStreetMap &copy; CARTO" />
        {visible.map((p) => {
          const selected = p.id === selectedId;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={selected ? 11 : 6}
              className={selected ? 'ls-marker-selected' : undefined}
              pathOptions={{
                color: selected ? '#f4f1ea' : elevationStroke(p.compat),
                fillColor: elevationColor(p.compat),
                fillOpacity: 0.9,
                weight: selected ? 2.5 : 1,
              }}
              eventHandlers={{ click: () => setSelectedId(p.id) }}
            />
          );
        })}
      </MapContainer>

      <div className="ls-legend">
        <div className="ls-legend-title">Match fit</div>
        <div className="ls-legend-ramp" />
        <div className="ls-legend-scale">
          <span>0 — poor fit</span>
          <span>100 — peak</span>
        </div>
      </div>
    </>
  );
}
