import { describe, it, expect } from 'vitest';
import { compatibility } from './compatibility';
import { getPersona } from '../personas';
import { CategoryScores } from '../types';

const scores: CategoryScores = {
  education: 90, healthcare: 80, connectivity: 40,
  lifestyle: 50, economic: 30, infrastructure: 60,
};

describe('compatibility', () => {
  it('returns a value between 0 and 100', () => {
    const c = compatibility(scores, getPersona('family'));
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(100);
  });

  it('scores the same parcel differently for different personas', () => {
    const family = compatibility(scores, getPersona('family'));
    const investor = compatibility(scores, getPersona('investor'));
    // This parcel has strong education/healthcare, weak economic:
    // family (education-heavy) should rate it higher than investor (economic-heavy).
    expect(family).toBeGreaterThan(investor);
  });
});
