import { describe, it, expect } from 'vitest';
import { explain } from './explain';
import { compatibility } from './compatibility';
import { getPersona } from '../personas';
import { CategoryScores } from '../types';

const scores: CategoryScores = {
  education: 92, healthcare: 80, connectivity: 40,
  lifestyle: 41, economic: 30, infrastructure: 60,
};

describe('explain', () => {
  it('line-items plus a 50 baseline reconcile to the compatibility score', () => {
    const persona = getPersona('family');
    const items = explain(scores, persona);
    const sum = 50 + items.reduce((acc, i) => acc + i.points, 0);
    expect(sum).toBeCloseTo(compatibility(scores, persona), 5);
  });

  it('is sorted from most positive to most negative', () => {
    const items = explain(scores, getPersona('family'));
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].points).toBeGreaterThanOrEqual(items[i].points);
    }
  });

  it('marks a strong high-weight category as positive for its persona', () => {
    const items = explain(scores, getPersona('family'));
    const edu = items.find((i) => i.category === 'education')!;
    expect(edu.points).toBeGreaterThan(0);
  });
});
