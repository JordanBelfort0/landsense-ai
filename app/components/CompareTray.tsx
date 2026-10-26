'use client';
import { useLandStore } from '@/app/lib/useLandStore';

export default function CompareTray({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { compareIds, toggleCompare, clearCompare, setCompareOpen, maxCompare } = store;

  if (compareIds.length === 0) return null;

  return (
    <div className="ls-compare-tray" role="region" aria-label="Comparison set">
      <span className="ls-compare-tray-label">
        Compare {compareIds.length}/{maxCompare}
      </span>
      <div className="ls-compare-chips">
        {compareIds.map((id) => (
          <span key={id} className="ls-compare-chip">
            {id}
            <button onClick={() => toggleCompare(id)} aria-label={`Remove ${id} from comparison`}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <button className="ls-compare-clear" onClick={clearCompare}>
        Clear
      </button>
      <button
        className="ls-compare-go"
        disabled={compareIds.length < 2}
        onClick={() => setCompareOpen(true)}
      >
        Compare →
      </button>
    </div>
  );
}
