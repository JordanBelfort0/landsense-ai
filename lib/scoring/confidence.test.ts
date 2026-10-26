import { describe, it, expect } from 'vitest';
import { confidence } from './confidence';
import { CategoryScores } from '../types';

const full: CategoryScores = {
  education: 80, healthcare: 70, connectivity: 60,
  lifestyle: 55, economic: 40, infrastructure: 65,
};
const sparse: CategoryScores = {
  education: 80, healthcare: 0, connectivity: 0,
  lifestyle: 0, economic: 0, infrastructure: 0,
};

describe('confidence', () => {
  it('is 100 when every category has data', () => {
    expect(confidence(full)).toBe(100);
  });

  it('is low when most categories are empty', () => {
    expect(confidence(sparse)).toBeLessThan(30);
  });

  it('is 0 when every category is empty', () => {
    const empty: CategoryScores = {
      education: 0, healthcare: 0, connectivity: 0,
      lifestyle: 0, economic: 0, infrastructure: 0,
    };
    expect(confidence(empty)).toBe(0);
  });

  it('treats a bare presence floor and a well-covered category differently', () => {
    // Old binary rule counted these as identical ("present"); the graded
    // rule should rate the well-covered one clearly higher.
    const barelyPresent: CategoryScores = {
      education: 5, healthcare: 5, connectivity: 5,
      lifestyle: 5, economic: 5, infrastructure: 5,
    };
    const wellCovered: CategoryScores = {
      education: 40, healthcare: 40, connectivity: 40,
      lifestyle: 40, economic: 40, infrastructure: 40,
    };
    expect(confidence(wellCovered)).toBeGreaterThan(confidence(barelyPresent));
  });

  it('has no cliff around the old hard cutoff', () => {
    // Two parcels one raw point apart on one category used to flip between
    // "counts" and "doesn't count." The graded version should barely move.
    const justUnder: CategoryScores = {
      education: 4, healthcare: 50, connectivity: 50,
      lifestyle: 50, economic: 50, infrastructure: 50,
    };
    const justOver: CategoryScores = {
      education: 6, healthcare: 50, connectivity: 50,
      lifestyle: 50, economic: 50, infrastructure: 50,
    };
    expect(Math.abs(confidence(justOver) - confidence(justUnder))).toBeLessThanOrEqual(2);
  });

  it('is monotonic — raising any single category score never lowers confidence', () => {
    const base: CategoryScores = {
      education: 3, healthcare: 10, connectivity: 25,
      lifestyle: 0, economic: 15, infrastructure: 8,
    };
    const raised: CategoryScores = { ...base, lifestyle: 12 };
    expect(confidence(raised)).toBeGreaterThanOrEqual(confidence(base));
  });

  it('never exceeds 100 even if scores are high across the board', () => {
    const maxed: CategoryScores = {
      education: 100, healthcare: 100, connectivity: 100,
      lifestyle: 100, economic: 100, infrastructure: 100,
    };
    expect(confidence(maxed)).toBe(100);
  });
});
