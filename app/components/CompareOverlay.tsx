'use client';
import { Fragment } from 'react';
import { useLandStore } from '@/app/lib/useLandStore';
import { compareParcels } from '@/lib/scoring/tradeoff';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { elevationColor } from '@/app/lib/scale';

const VALUATION_LABEL = { under: 'Undervalued', over: 'Overpriced', fair: 'Fair' } as const;

export default function CompareOverlay({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { compareIds, compareOpen, setCompareOpen, parcels, persona } = store;

  if (!compareOpen || compareIds.length < 2) return null;

  // Columns follow the order parcels were added to the compare set.
  const cols = compareIds
    .map((id) => parcels.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const { parcels: cp, leaders, narrative } = compareParcels(cols, persona);

  const gridStyle = { gridTemplateColumns: `150px repeat(${cp.length}, 1fr)` };
  const cell = (winners: string[], id: string) =>
    `ls-compare-cell${winners.includes(id) ? ' is-leader' : ''}`;

  return (
    <div className="ls-compare" role="dialog" aria-label="Compare parcels">
      <div className="ls-compare-head">
        <div>
          <div className="ls-compare-title">Compare</div>
          <div className="ls-compare-metaline">
            {cp.length} parcels · ranked for {persona.label}
          </div>
        </div>
        <button className="ls-close" onClick={() => setCompareOpen(false)} aria-label="Close comparison">
          ✕
        </button>
      </div>

      <div className="ls-compare-grid" style={gridStyle}>
        <div className="ls-compare-corner" />
        {cp.map((p) => (
          <div key={p.id} className="ls-compare-colhead">
            {p.id}
            <span>
              {parcels.find((x) => x.id === p.id)!.landUse} ·{' '}
              {parcels.find((x) => x.id === p.id)!.area.toLocaleString('en-IN')} sq.ft
            </span>
          </div>
        ))}

        <div className="ls-compare-rowlabel">Match</div>
        {cp.map((p) => (
          <div key={p.id} className={cell(leaders.match, p.id)}>
            {Math.round(p.compat)}
            <span className="unit">/100</span>
          </div>
        ))}

        <div className="ls-compare-rowlabel">Confidence</div>
        {cp.map((p) => (
          <div key={p.id} className={cell(leaders.confidence, p.id)}>
            {p.confidence}
            <span className="unit">%</span>
          </div>
        ))}

        <div className="ls-compare-rowlabel">Listed ₹/sq.ft</div>
        {cp.map((p) => (
          <div key={p.id} className={cell(leaders.price, p.id)}>
            ₹{p.listedPrice.toLocaleString('en-IN')}
          </div>
        ))}

        <div className="ls-compare-rowlabel">Est. value</div>
        {cp.map((p) => (
          <div key={p.id} className="ls-compare-cell">
            ₹{p.estimatedValue.toLocaleString('en-IN')}
          </div>
        ))}

        <div className="ls-compare-rowlabel">Valuation</div>
        {cp.map((p) => (
          <div key={p.id} className={cell(leaders.valuation, p.id)}>
            <span className={`ls-compare-val-${p.valuation}`}>
              {VALUATION_LABEL[p.valuation]}
            </span>
            <span className="unit">
              {p.gap >= 0 ? '+' : ''}{Math.round(p.gap * 100)}%
            </span>
          </div>
        ))}

        {CATEGORIES.map((c) => (
          <Fragment key={c}>
            <div className="ls-compare-rowlabel">{CATEGORY_LABELS[c]}</div>
            {cp.map((p) => (
              <div key={p.id} className={cell(leaders.categories[c], p.id)}>
                <div className="ls-compare-bar">
                  <div style={{ width: `${p.scores[c]}%`, background: elevationColor(p.scores[c]) }} />
                </div>
                <span className="ls-compare-barval">{Math.round(p.scores[c])}</span>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="ls-sub">Trade-off analysis</div>
      <ul className="ls-compare-narrative">
        {narrative.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
