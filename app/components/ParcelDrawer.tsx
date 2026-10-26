'use client';
import { useLandStore } from '@/app/lib/useLandStore';
import { explain } from '@/lib/scoring/explain';
import { compatibility } from '@/lib/scoring/compatibility';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { elevationColor } from '@/app/lib/scale';

export default function ParcelDrawer({ store }: { store: ReturnType<typeof useLandStore> }) {
  const {
    ranked, selectedId, setSelectedId, persona,
    isComparing, toggleCompare, compareIds, setCompareOpen,
  } = store;
  const parcel = ranked.find((p) => p.id === selectedId);
  if (!parcel) return null;

  const inCompare = isComparing(parcel.id);

  const compat = compatibility(parcel.scores, persona);
  const items = explain(parcel.scores, persona);
  const gap = (parcel.listedPrice - parcel.estimatedValue) / parcel.estimatedValue;
  const valuation =
    gap < -0.08
      ? { cls: 'under', label: 'Potentially undervalued' }
      : gap > 0.08
        ? { cls: 'over', label: 'Potentially overpriced' }
        : { cls: 'fair', label: 'Fairly priced' };

  return (
    <div className="ls-drawer" role="dialog" aria-label={`Parcel ${parcel.id} details`}>
      <div className="ls-drawer-top">
        <div>
          <div className="ls-drawer-eyebrow">{parcel.id} · {persona.label}</div>
          <div className="ls-drawer-coords">
            {parcel.lat.toFixed(4)}, {parcel.lng.toFixed(4)}
          </div>
        </div>
        <button className="ls-close" onClick={() => setSelectedId(null)} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="ls-match">
        <span className="ls-match-num">{Math.round(compat)}</span>
        <span className="ls-match-unit">/ 100 match</span>
      </div>

      <div className="ls-conf">
        <div className="ls-conf-head">
          <span>Confidence</span>
          <span>{parcel.confidence}%</span>
        </div>
        <div className="ls-conf-track">
          <div className="ls-conf-fill" style={{ width: `${parcel.confidence}%` }} />
        </div>
      </div>

      <div className="ls-facts">
        <div className="ls-fact">
          <div className="ls-fact-k">Area</div>
          <div className="ls-fact-v">{parcel.area.toLocaleString('en-IN')} sq.ft</div>
        </div>
        <div className="ls-fact">
          <div className="ls-fact-k">Land use</div>
          <div className="ls-fact-v" style={{ textTransform: 'capitalize' }}>{parcel.landUse}</div>
        </div>
        <div className="ls-fact">
          <div className="ls-fact-k">Listed</div>
          <div className="ls-fact-v">₹{parcel.listedPrice.toLocaleString('en-IN')}</div>
        </div>
        <div className="ls-fact">
          <div className="ls-fact-k">Est. value</div>
          <div className="ls-fact-v">₹{parcel.estimatedValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className={`ls-valuation ${valuation.cls}`}>
        {valuation.label}
        <span className="gap">{gap >= 0 ? '+' : ''}{Math.round(gap * 100)}%</span>
      </div>

      <div className="ls-drawer-actions">
        <button
          className={`ls-btn${inCompare ? ' active' : ''}`}
          onClick={() => toggleCompare(parcel.id)}
        >
          {inCompare ? '✓ In comparison' : '+ Add to compare'}
        </button>
        {compareIds.length >= 2 && (
          <button className="ls-btn gold" onClick={() => setCompareOpen(true)}>
            Compare {compareIds.length} →
          </button>
        )}
      </div>

      <div className="ls-sub">Amenity profile</div>
      {CATEGORIES.map((c) => (
        <div key={c} className="ls-amenity">
          <div className="ls-amenity-head">
            <span>{CATEGORY_LABELS[c]}</span>
            <span className="val">{Math.round(parcel.scores[c])}</span>
          </div>
          <div className="ls-bar-track">
            <div
              className="ls-bar-fill"
              style={{ width: `${parcel.scores[c]}%`, background: elevationColor(parcel.scores[c]) }}
            />
          </div>
        </div>
      ))}

      <div className="ls-sub" style={{ marginTop: 22 }}>Why this parcel</div>
      <ul className="ls-why">
        {items.filter((i) => Math.abs(i.points) >= 0.5).slice(0, 6).map((i) => {
          const pos = i.points >= 0;
          return (
            <li key={i.category} className="ls-why-row">
              <span className={`ls-why-points ${pos ? 'pos' : 'neg'}`}>
                {pos ? '+' : ''}{i.points.toFixed(0)}
              </span>
              <span className="ls-why-label">{i.label}</span>
              <span className="ls-why-score">score {Math.round(i.score)}</span>
            </li>
          );
        })}
      </ul>

      <p className="ls-disclaimer">
        Estimated value is a model figure for guidance, not an official valuation.
        Confidence reflects how many amenity categories have nearby data.
      </p>
    </div>
  );
}
