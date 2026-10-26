import { describe, it, expect } from 'vitest';
import { adjustWeight, weightsValid } from './weights';
import { CategoryScores, CATEGORIES } from '../types';

const family: CategoryScores = {
  education: 0.30, healthcare: 0.25, connectivity: 0.15,
  lifestyle: 0.10, infrastructure: 0.12, economic: 0.08,
};

const zero: CategoryScores = {
  education: 1, healthcare: 0, connectivity: 0,
  lifestyle: 0, economic: 0, infrastructure: 0,
};

function sum(w: CategoryScores): number {
  return CATEGORIES.reduce((s, c) => s + w[c], 0);
}

describe('weightsValid', () => {
  it('accepts a vector that sums to 1', () => {
    expect(weightsValid(family)).toBe(true);
  });

  it('rejects a vector that does not sum to 1', () => {
    expect(weightsValid({ ...family, education: 0.9 })).toBe(false);
  });
});

describe('adjustWeight', () => {
  it('always returns a vector that sums to 1', () => {
    const result = adjustWeight(family, 'connectivity', 0.5);
    expect(sum(result)).toBeCloseTo(1, 9);
  });

  it('sets the changed category to exactly the requested value', () => {
    const result = adjustWeight(family, 'connectivity', 0.5);
    expect(result.connectivity).toBeCloseTo(0.5, 9);
  });

  it('preserves the relative ratio of the untouched categories', () => {
    // Family: healthcare .25 vs education .30 is a 5:6 ratio before the change.
    const result = adjustWeight(family, 'connectivity', 0.5);
    const ratioBefore = family.healthcare / family.education;
    const ratioAfter = result.healthcare / result.education;
    expect(ratioAfter).toBeCloseTo(ratioBefore, 9);
  });

  it('clamps the requested value to [0, 1]', () => {
    const over = adjustWeight(family, 'education', 1.5);
    expect(over.education).toBe(1);
    expect(sum(over)).toBeCloseTo(1, 9);

    const under = adjustWeight(family, 'education', -0.5);
    expect(under.education).toBe(0);
    expect(sum(under)).toBeCloseTo(1, 9);
  });

  it('splits the remainder evenly when every other weight is zero', () => {
    const result = adjustWeight(zero, 'education', 0.2);
    const others = CATEGORIES.filter((c) => c !== 'education');
    const expected = 0.8 / others.length;
    others.forEach((c) => expect(result[c]).toBeCloseTo(expected, 9));
    expect(sum(result)).toBeCloseTo(1, 9);
  });

  it('is a no-op on the changed category when set to its current value', () => {
    const result = adjustWeight(family, 'education', family.education);
    CATEGORIES.forEach((c) => expect(result[c]).toBeCloseTo(family[c], 9));
  });
});
