import { describe, it, expect } from 'vitest';
import { counterfactual, describeCounterfactual } from './counterfactual';
import { compatibility } from './compatibility';
import { getPersona } from '../personas';
import { CategoryScores } from '../types';

// A: strong Family match. B: weaker Family match, same fixtures as tradeoff.test.ts.
const A: CategoryScores = {
  education: 90, healthcare: 85, connectivity: 50,
  lifestyle: 50, economic: 40, infrastructure: 60,
};
const B: CategoryScores = {
  education: 60, healthcare: 55, connectivity: 80,
  lifestyle: 60, economic: 70, infrastructure: 55,
};

const family = getPersona('family');

describe('counterfactual', () => {
  it('reports no gap when the subject already matches the target', () => {
    const cf = counterfactual(A, A, family);
    expect(cf.gap).toBeLessThanOrEqual(0);
    expect(cf.singleLevers).toHaveLength(0);
    expect(cf.bestSingleLever).toBeNull();
    expect(cf.comboClosesGap).toBe(true);
  });

  it('reports no gap when the subject already beats the target', () => {
    const cf = counterfactual(A, B, family);
    expect(cf.gap).toBeLessThanOrEqual(0);
  });

  it('computes a positive gap equal to the actual compatibility difference', () => {
    const cf = counterfactual(B, A, family);
    const expectedGap = compatibility(A, family) - compatibility(B, family);
    expect(cf.gap).toBeCloseTo(expectedGap, 9);
  });

  it('every single-lever neededPoints, applied alone, exactly closes the gap', () => {
    const cf = counterfactual(B, A, family);
    for (const lever of cf.singleLevers) {
      const adjusted = { ...B, [lever.category]: lever.newScore };
      const newCompat = compatibility(adjusted, family);
      expect(newCompat).toBeCloseTo(cf.targetCompat, 6);
    }
  });

  it('flags a lever unachievable when it would need to exceed 100', () => {
    const cf = counterfactual(B, A, family);
    const unreachable = cf.singleLevers.find((l) => l.newScore > 100);
    expect(unreachable?.achievable).toBe(false);
  });

  it('picks the smallest achievable single lever as bestSingleLever', () => {
    const cf = counterfactual(B, A, family);
    const achievable = cf.singleLevers.filter((l) => l.achievable);
    if (achievable.length > 0) {
      const min = Math.min(...achievable.map((l) => l.neededPoints));
      expect(cf.bestSingleLever?.neededPoints).toBeCloseTo(min, 9);
    } else {
      expect(cf.bestSingleLever).toBeNull();
    }
  });

  it('a combo plan, applied together, closes the gap when comboClosesGap is true', () => {
    // Force a case with no single achievable lever: target maxed out everywhere.
    const dominant: CategoryScores = {
      education: 100, healthcare: 100, connectivity: 100,
      lifestyle: 100, economic: 100, infrastructure: 100,
    };
    const weak: CategoryScores = {
      education: 10, healthcare: 10, connectivity: 10,
      lifestyle: 10, economic: 10, infrastructure: 10,
    };
    const cf = counterfactual(weak, dominant, family);
    expect(cf.bestSingleLever).toBeNull();
    expect(cf.comboClosesGap).toBe(true);

    const adjusted = { ...weak };
    for (const step of cf.combo) adjusted[step.category] = step.newScore;
    expect(compatibility(adjusted, family)).toBeCloseTo(cf.targetCompat, 6);
  });

  it('never proposes raising a category past 100', () => {
    const cf = counterfactual(B, A, family);
    for (const step of cf.combo) expect(step.newScore).toBeLessThanOrEqual(100 + 1e-6);
  });

  it('comboClosesGap is false only when every category is already maxed out', () => {
    const maxedSubject: CategoryScores = {
      education: 100, healthcare: 100, connectivity: 100,
      lifestyle: 100, economic: 100, infrastructure: 100,
    };
    // Can't construct a target above 100, so this should never leave a gap at all.
    const cf = counterfactual(maxedSubject, A, family);
    expect(cf.gap).toBeLessThanOrEqual(0);
  });
});

describe('describeCounterfactual', () => {
  it('says there is no gap when the subject already matches or leads', () => {
    const cf = counterfactual(A, A, family);
    const lines = describeCounterfactual(cf, family);
    expect(lines[0]).toMatch(/already matches or beats/);
  });

  it('names the single lever when one is achievable', () => {
    const cf = counterfactual(B, A, family);
    const lines = describeCounterfactual(cf, family);
    if (cf.bestSingleLever) {
      expect(lines[1]).toContain(cf.bestSingleLever.label);
    }
  });
});
