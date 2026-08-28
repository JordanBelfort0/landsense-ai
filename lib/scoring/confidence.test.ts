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
});
