'use client';
import dynamic from 'next/dynamic';
import { useLandStore } from '@/app/lib/useLandStore';
import PersonaRail from '@/app/components/PersonaRail';
import ParcelDrawer from '@/app/components/ParcelDrawer';

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false });

export default function Page() {
  const store = useLandStore();
  return (
    <main style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh' }}>
      <PersonaRail store={store} />
      <div style={{ position: 'relative' }}>
        <MapView store={store} />
        <ParcelDrawer store={store} />
      </div>
    </main>
  );
}
