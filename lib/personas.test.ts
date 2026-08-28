import { describe, it, expect } from 'vitest';
import { PERSONAS } from './personas';
import { CATEGORIES } from './types';

describe('personas', () => {
  it('has all four personas', () => {
    expect(PERSONAS.map((p) => p.id).sort()).toEqual(
      ['family', 'investor', 'professional', 'student'],
    );
  });

  it('every persona weight set sums to 1', () => {
    for (const p of PERSONAS) {
      const sum = CATEGORIES.reduce((acc, c) => acc + p.weights[c], 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});
