'use client';
import { useLandStore } from '@/app/lib/useLandStore';
import { explain } from '@/lib/scoring/explain';
import { compatibility } from '@/lib/scoring/compatibility';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export default function ParcelDrawer({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { ranked, selectedId, setSelectedId, persona } = store;
  const parcel = ranked.find((p) => p.id === selectedId);
  if (!parcel) return null;

  const compat = compatibility(parcel.scores, persona);
  const items = explain(parcel.scores, persona);
  const gap = (parcel.listedPrice - parcel.estimatedValue) / parcel.estimatedValue;
  const flag = gap < -0.08 ? 'Undervalued' : gap > 0.08 ? 'Overpriced' : 'Fairly Priced';
  const flagColor = flag === 'Undervalued' ? '#178a4c' : flag === 'Overpriced' ? '#b3261e' : '#8a6d1a';
  const flagBg = flag === 'Undervalued' ? '#e5f6ec' : flag === 'Overpriced' ? '#fdeceb' : '#fbf3d9';

  const matchTier = compat >= 70 ? 'high' : compat >= 40 ? 'medium' : 'low';
  const tierColor = { high: '#1a9c53', medium: '#c98a12', low: '#c62f2f' }[matchTier];
  const tierBg = { high: '#e5f6ec', medium: '#fbf0da', low: '#fbe4e2' }[matchTier];

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
      background: '#fff', boxShadow: '-2px 0 12px rgba(0,0,0,0.12)',
      overflowY: 'auto', zIndex: 1000, boxSizing: 'border-box',
    }}>
      <div style={{ background: tierColor, height: 6 }} />
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelectedId(null)} style={{ float: 'right', cursor: 'pointer' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{parcel.id}</h2>
          <span style={{
            fontSize: 12, fontWeight: 700, color: tierColor, background: tierBg,
            borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
          }}>
            {Math.round(compat)}% match
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Confidence: {parcel.confidence}%</div>

        <div style={{ marginTop: 14, padding: '12px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
            ₹{parcel.listedPrice.toLocaleString('en-IN')}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#666' }}>/sq.ft</span>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Est. value ₹{parcel.estimatedValue.toLocaleString('en-IN')}/sq.ft
          </div>
          <span style={{
            display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700,
            color: flagColor, background: flagBg, borderRadius: 999, padding: '2px 10px',
          }}>
            {flag}
          </span>
        </div>

        <p style={{ fontSize: 13, marginBottom: 4 }}>
          {parcel.area.toLocaleString('en-IN')} sq.ft · {parcel.landUse}
        </p>

        <h3 style={{ fontSize: 13, marginBottom: 4 }}>Amenity profile</h3>
        {CATEGORIES.map((c) => (
          <div key={c} style={{ marginBottom: 3 }}>
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
    </div>
  );
}
