'use client';
import { useLandStore } from '@/app/lib/useLandStore';
import { explain } from '@/lib/scoring/explain';
import { compatibility } from '@/lib/scoring/compatibility';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export default function ParcelDrawer({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { visible, ranked, selectedId, setSelectedId, persona } = store;
  const parcel = ranked.find((p) => p.id === selectedId);
  if (!parcel) return null;

  const compat = compatibility(parcel.scores, persona);
  const items = explain(parcel.scores, persona);
  const gap = (parcel.listedPrice - parcel.estimatedValue) / parcel.estimatedValue;
  const flag = gap < -0.08 ? 'Potentially Undervalued' : gap > 0.08 ? 'Potentially Overpriced' : 'Fairly Priced';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
      background: '#fff', boxShadow: '-2px 0 12px rgba(0,0,0,0.12)', padding: 16,
      overflowY: 'auto', zIndex: 1000, boxSizing: 'border-box',
    }}>
      <button onClick={() => setSelectedId(null)} style={{ float: 'right', cursor: 'pointer' }}>✕</button>
      <h2 style={{ marginTop: 0 }}>{parcel.id}</h2>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(compat)}<span style={{ fontSize: 14 }}>/100 match</span></div>
      <div style={{ fontSize: 12, color: '#666' }}>Confidence: {parcel.confidence}%</div>

      <p style={{ fontSize: 13 }}>
        {parcel.area.toLocaleString('en-IN')} sq.ft · {parcel.landUse}<br />
        Listed ₹{parcel.listedPrice.toLocaleString('en-IN')}/sq.ft · Est. ₹{parcel.estimatedValue.toLocaleString('en-IN')}<br />
        <strong>{flag}</strong>
      </p>

      <h3 style={{ fontSize: 13 }}>Amenity profile</h3>
      {CATEGORIES.map((c) => (
        <div key={c} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>{CATEGORY_LABELS[c]}</span><span>{Math.round(parcel.scores[c])}</span>
          </div>
          <div style={{ background: '#eee', height: 6, borderRadius: 3 }}>
            <div style={{ width: `${parcel.scores[c]}%`, height: 6, borderRadius: 3, background: '#2b7' }} />
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 13 }}>Why this parcel?</h3>
      <ul style={{ paddingLeft: 16, fontSize: 13 }}>
        {items.filter((i) => Math.abs(i.points) >= 0.5).slice(0, 6).map((i) => (
          <li key={i.category} style={{ color: i.points >= 0 ? '#178' : '#b33' }}>
            {i.points >= 0 ? '+' : ''}{i.points.toFixed(0)} — {i.label} ({Math.round(i.score)})
          </li>
        ))}
      </ul>
    </div>
  );
}
