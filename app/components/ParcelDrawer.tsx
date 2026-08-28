'use client';
import { Manrope } from 'next/font/google';
import { useLandStore } from '@/app/lib/useLandStore';
import { explain } from '@/lib/scoring/explain';
import { compatibility } from '@/lib/scoring/compatibility';
import { CATEGORIES, CATEGORY_LABELS, Category } from '@/lib/types';

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'] });

// Validated categorical palette (dataviz skill, dark-mode column) — fixed hue
// order per category, skipping the green/red slots reserved for status badges.
const CATEGORY_COLORS: Record<Category, string> = {
  education: '#d95926',
  healthcare: '#199e70',
  connectivity: '#3987e5',
  lifestyle: '#9085e9',
  economic: '#c98500',
  infrastructure: '#d55181',
};

// Status palette (dataviz skill, dark-mode column)
const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
  info: '#3987e5',
};

const TEXT = { primary: '#ededed', secondary: '#c7c7c7', muted: '#8a8a8a' };
const SURFACE = { page: '#0a0a0a', card: '#1a1a1a', border: '#262626', track: '#2c2c2a' };

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 12, fontWeight: 700, color,
        background: `${color}26`, borderRadius: 999, padding: '4px 12px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: TEXT.muted,
      }}
    >
      {children}
    </h3>
  );
}

export default function ParcelDrawer({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { ranked, selectedId, setSelectedId, persona } = store;
  const parcel = ranked.find((p) => p.id === selectedId);
  if (!parcel) return null;

  const compat = compatibility(parcel.scores, persona);
  const items = explain(parcel.scores, persona);
  const gap = (parcel.listedPrice - parcel.estimatedValue) / parcel.estimatedValue;
  const flag = gap < -0.08 ? 'Undervalued' : gap > 0.08 ? 'Overpriced' : 'Fairly Priced';
  const flagColor = flag === 'Undervalued' ? STATUS.good : flag === 'Overpriced' ? STATUS.critical : STATUS.info;

  const matchTier = compat >= 70 ? 'high' : compat >= 40 ? 'medium' : 'low';
  const tierColor = { high: STATUS.good, medium: STATUS.warning, low: STATUS.critical }[matchTier];

  return (
    <div
      className={manrope.className}
      style={{
        position: 'absolute', top: 0, right: 0, width: 380, height: '100%',
        background: SURFACE.page, color: TEXT.primary,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.45)',
        overflowY: 'auto', zIndex: 1000, boxSizing: 'border-box',
      }}
    >
      <div style={{ background: tierColor, height: 4 }} />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {parcel.id}
              </h2>
              <Badge color={tierColor}>{Math.round(compat)}% match</Badge>
            </div>
            <div style={{ fontSize: 13, color: TEXT.muted }}>Confidence: {parcel.confidence}%</div>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            aria-label="Close parcel details"
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
              background: SURFACE.card, border: `1px solid ${SURFACE.border}`, color: TEXT.primary,
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Price card */}
        <div style={{ background: SURFACE.card, border: `1px solid ${SURFACE.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            ₹{parcel.listedPrice.toLocaleString('en-IN')}
            <span style={{ fontSize: 15, fontWeight: 600, color: TEXT.muted }}>/sq.ft</span>
          </div>
          <div style={{ fontSize: 13, color: TEXT.muted, marginTop: 6 }}>
            Est. value ₹{parcel.estimatedValue.toLocaleString('en-IN')}/sq.ft
          </div>
          <div style={{ marginTop: 12 }}>
            <Badge color={flagColor}>{flag}</Badge>
          </div>
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 14, color: TEXT.secondary }}>
          {parcel.area.toLocaleString('en-IN')} sq.ft · {parcel.landUse}
        </div>

        {/* Amenity profile */}
        <div style={{ background: SURFACE.card, border: `1px solid ${SURFACE.border}`, borderRadius: 16, padding: 20 }}>
          <SectionLabel>Amenity profile</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {CATEGORIES.map((c) => (
              <div key={c}>
                <div style={{ fontSize: 13, color: TEXT.secondary, marginBottom: 6 }}>
                  {CATEGORY_LABELS[c]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, background: SURFACE.track, height: 10, borderRadius: 999 }}>
                    <div
                      style={{
                        width: `${parcel.scores[c]}%`, height: 10, borderRadius: 999,
                        background: CATEGORY_COLORS[c],
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 30, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 700,
                      color: TEXT.primary, fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {Math.round(parcel.scores[c])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why this parcel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionLabel>Why this parcel?</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.filter((i) => Math.abs(i.points) >= 0.5).slice(0, 6).map((i) => {
              const positive = i.points >= 0;
              const chipColor = positive ? STATUS.good : STATUS.critical;
              return (
                <div
                  key={i.category}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: SURFACE.card, border: `1px solid ${SURFACE.border}`,
                    borderRadius: 10, padding: '10px 14px',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0, minWidth: 38, textAlign: 'center', fontSize: 12, fontWeight: 700,
                      color: chipColor, background: `${chipColor}26`, borderRadius: 999, padding: '4px 8px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {positive ? '+' : ''}{i.points.toFixed(0)}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: TEXT.secondary, minWidth: 0 }}>{i.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(i.score)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
