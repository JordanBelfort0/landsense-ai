'use client';
import dynamic from 'next/dynamic';
import { useLandStore } from '@/app/lib/useLandStore';
import PersonaRail from '@/app/components/PersonaRail';
import ParcelDrawer from '@/app/components/ParcelDrawer';

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false });

export default function Page() {
  const store = useLandStore();
  return (
    <main className="ls-shell">
      <PersonaRail store={store} />
      <div className="ls-map-pane">
        <MapView store={store} />
        <ParcelDrawer store={store} />
      </div>
    </main>
  );
}
