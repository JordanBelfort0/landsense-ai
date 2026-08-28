import { describe, it, expect } from 'vitest';
import { haversine } from './geo';

describe('haversine', () => {
  it('is zero for identical points', () => {
    expect(haversine(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  it('measures ~1113 m for 0.01 deg of latitude', () => {
    const d = haversine(12.97, 77.59, 12.98, 77.59);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });
});
