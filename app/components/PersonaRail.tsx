'use client';
import { useLandStore } from '@/app/lib/useLandStore';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { elevationColor } from '@/app/lib/scale';

const LAND_USES = ['all', 'residential', 'commercial', 'mixed', 'industrial'] as const;

export default function PersonaRail({ store }: { store: ReturnType<typeof useLandStore> }) {
  const {
    personas, persona, personaId, setPersonaId, budget, setBudget, maxPrice,
    landUse, setLandUse, visible, selectedId, setSelectedId,
    isComparing, toggleCompare, compareIds, maxCompare,
    isCustom, setWeight,
  } = store;

  // All 6 categories, ranked by this persona's weight, heaviest first.
  const priorities = [...CATEGORIES]
    .sort((a, b) => persona.weights[b] - persona.weights[a]);

  return (
    <aside className="ls-rail">
      <header className="ls-brand">
        <div className="ls-wordmark">
          Land<span className="match">Match</span>
        </div>
        <div className="ls-tagline">Land decision intelligence · Bengaluru</div>
      </header>

      <section>
        <div className="ls-section-label">
          Who are you {isCustom && <span className="ls-custom-badge">Custom</span>}
        </div>
        <div className="ls-persona-grid">
          {personas.map((p) => (
            <button
              key={p.id}
              className="ls-persona"
              aria-pressed={p.id === personaId && !isCustom}
              onClick={() => setPersonaId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ls-priorities">
          {priorities.map((c) => (
            <span key={c} className="ls-chip">
              {CATEGORY_LABELS[c]} <b>{Math.round(persona.weights[c] * 100)}%</b>
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="ls-section-label">
          Tune weights
          <span className="ls-sub" style={{ margin: 0, fontWeight: 400 }}>
            {' '}· starts from {isCustom ? personas.find((p) => p.id === personaId)?.label : persona.label}
          </span>
        </div>
        {CATEGORIES.map((c) => (
          <div className="ls-control" key={c}>
            <div className="ls-control-head">
              <span className="ls-sub" style={{ margin: 0 }}>{CATEGORY_LABELS[c]}</span>
              <span className="ls-control-value">{Math.round(persona.weights[c] * 100)}%</span>
            </div>
            <input
              className="ls-range"
              type="range"
              min={0}
              max={100}
              value={Math.round(persona.weights[c] * 100)}
              aria-label={`${CATEGORY_LABELS[c]} weight`}
              onChange={(e) => setWeight(c, Number(e.target.value) / 100)}
            />
          </div>
        ))}
      </section>

      <section>
        <div className="ls-section-label">Filters</div>

        <div className="ls-control">
          <div className="ls-control-head">
            <span className="ls-sub" style={{ margin: 0 }}>Max price</span>
            <span className="ls-control-value">₹{budget.toLocaleString('en-IN')}/sq.ft</span>
          </div>
          <input
            className="ls-range"
            type="range"
            min={1000}
            max={maxPrice}
            value={budget}
            aria-label="Maximum price per square foot"
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </div>

        <div className="ls-control">
          <div className="ls-control-head">
            <span className="ls-sub" style={{ margin: 0 }}>Land use</span>
          </div>
          <select
            className="ls-select"
            value={landUse}
            aria-label="Land use"
            onChange={(e) => setLandUse(e.target.value as typeof landUse)}
          >
            {LAND_USES.map((u) => (
              <option key={u} value={u}>{u === 'all' ? 'Any use' : u}</option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <div className="ls-section-label">Top matches · {visible.length} parcels</div>
        <ol className="ls-board">
          {visible.slice(0, 6).map((p, i) => {
            const checked = isComparing(p.id);
            return (
              <li key={p.id} className="ls-board-item">
                <input
                  type="checkbox"
                  className="ls-compare-check"
                  checked={checked}
                  disabled={!checked && compareIds.length >= maxCompare}
                  onChange={() => toggleCompare(p.id)}
                  aria-label={`Add ${p.id} to comparison`}
                />
                <button
                  className="ls-board-row"
                  aria-pressed={p.id === selectedId}
                  style={p.id === selectedId ? { borderColor: 'var(--gold-line)' } : undefined}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="ls-rank" style={{ background: elevationColor(p.compat) }}>
                    {i + 1}
                  </span>
                  <span>
                    <span className="ls-board-id">{p.id}</span>
                    <br />
                    <span className="ls-board-use">{p.landUse}</span>
                  </span>
                  <span className="ls-board-score">
                    {Math.round(p.compat)}<span>/100</span>
                  </span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="ls-board-use" style={{ padding: '8px 2px' }}>
              No parcels fit these filters. Raise the price ceiling or widen the land use.
            </li>
          )}
        </ol>
      </section>
    </aside>
  );
}
