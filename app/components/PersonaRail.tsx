'use client';
import { useLandStore } from '@/app/lib/useLandStore';

export default function PersonaRail({ store }: { store: ReturnType<typeof useLandStore> }) {
  const {
    personas, personaId, setPersonaId, budget, setBudget, maxPrice,
    landUse, setLandUse, visible, setSelectedId,
  } = store;

  return (
    <aside style={{ padding: 16, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>LandSense AI</h1>
      <p style={{ fontSize: 12, color: '#666', marginTop: 0 }}>Bengaluru · {visible.length} parcels</p>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888' }}>I am a…</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersonaId(p.id)}
            style={{
              padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
              border: '1px solid #ddd', borderRadius: 8,
              background: p.id === personaId ? '#111' : '#fff',
              color: p.id === personaId ? '#fff' : '#111',
            }}
          >{p.label}</button>
        ))}
      </div>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Budget (₹/sq.ft)</h2>
      <input
        type="range" min={1000} max={maxPrice} value={budget}
        onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%' }}
      />
      <div style={{ fontSize: 12 }}>≤ ₹{budget.toLocaleString('en-IN')}</div>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Land use</h2>
      <select value={landUse} onChange={(e) => setLandUse(e.target.value as typeof landUse)} style={{ width: '100%', padding: 6 }}>
        {['all', 'residential', 'commercial', 'mixed', 'industrial'].map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Best matches</h2>
      <ol style={{ paddingLeft: 18, fontSize: 13 }}>
        {visible.slice(0, 5).map((p) => (
          <li key={p.id} style={{ marginBottom: 4, cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>
            {p.id} — {Math.round(p.compat)}%
          </li>
        ))}
      </ol>
    </aside>
  );
}
