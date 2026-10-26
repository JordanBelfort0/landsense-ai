import { describe, it, expect } from 'vitest';
import { compareParcels } from './tradeoff';
import { getPersona } from '../personas';
import { Parcel } from '../types';

// A: strong Family match (education/healthcare), fairly priced, high confidence.
const A: Parcel = {
  id: 'P-A', lat: 12.97, lng: 77.59, area: 1200, landUse: 'residential',
  listedPrice: 8000, estimatedValue: 8000, confidence: 90,
  scores: {
    education: 90, healthcare: 85, connectivity: 50,
    lifestyle: 50, economic: 40, infrastructure: 60,
  },
};

// B: weaker Family match, cheaper, undervalued, leads on connectivity/economic.
const B: Parcel = {
  id: 'P-B', lat: 12.95, lng: 77.61, area: 1000, landUse: 'residential',
  listedPrice: 5000, estimatedValue: 6000, confidence: 70,
  scores: {
    education: 60, healthcare: 55, connectivity: 80,
    lifestyle: 60, economic: 70, infrastructure: 55,
  },
};

const family = getPersona('family');

describe('compareParcels', () => {
  it('names the highest-compatibility parcel as the match leader', () => {
    const c = compareParcels([A, B], family);
    expect(c.leaders.match).toEqual(['P-A']);
  });

  it('names the lowest listed price as the price leader', () => {
    const c = compareParcels([A, B], family);
    expect(c.leaders.price).toEqual(['P-B']);
  });

  it('names the most undervalued parcel as the valuation leader', () => {
    const c = compareParcels([A, B], family);
    expect(c.leaders.valuation).toEqual(['P-B']);
  });

  it('names the highest-confidence parcel as the confidence leader', () => {
    const c = compareParcels([A, B], family);
    expect(c.leaders.confidence).toEqual(['P-A']);
  });

  it('identifies the per-category score winner', () => {
    const c = compareParcels([A, B], family);
    expect(c.leaders.categories.education).toEqual(['P-A']);
    expect(c.leaders.categories.connectivity).toEqual(['P-B']);
  });

  it('classifies each parcel valuation from its price gap', () => {
    const c = compareParcels([A, B], family);
    const a = c.parcels.find((p) => p.id === 'P-A')!;
    const b = c.parcels.find((p) => p.id === 'P-B')!;
    expect(a.valuation).toBe('fair');
    expect(b.valuation).toBe('under');
  });

  it('reports ties in a dimension as multiple leaders', () => {
    const tie: Parcel = { ...B, id: 'P-C', confidence: 90 };
    const c = compareParcels([A, tie], family);
    expect(c.leaders.confidence.sort()).toEqual(['P-A', 'P-C']);
  });

  it('opens the narrative by naming the strongest match', () => {
    const c = compareParcels([A, B], family);
    expect(c.narrative[0]).toContain('P-A');
    expect(c.narrative[0].toLowerCase()).toContain('match');
  });

  it('narrates the cheaper alternative as a trade-off', () => {
    const c = compareParcels([A, B], family);
    const joined = c.narrative.join(' ').toLowerCase();
    expect(joined).toContain('p-b');
    expect(joined).toContain('cheaper');
  });

  it('narrates the undervalued flag as an advantage', () => {
    const c = compareParcels([A, B], family);
    const joined = c.narrative.join(' ').toLowerCase();
    expect(joined).toContain('undervalued');
  });

  it('handles three parcels with one narrative line per runner-up', () => {
    const C: Parcel = { ...B, id: 'P-C' };
    const c = compareParcels([A, B, C], family);
    expect(c.parcels).toHaveLength(3);
    // one lead sentence + one per runner-up
    expect(c.narrative.length).toBeGreaterThanOrEqual(3);
  });
});
