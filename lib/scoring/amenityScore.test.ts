import { describe, it, expect } from 'vitest';
import { categoryScore, scoreParcel } from './amenityScore';
import { Amenity } from '../types';

const school = (id: string, lat: number, lng: number): Amenity => ({
  id, category: 'education', subtype: 'school', name: id, lat, lng,
});

describe('amenityScore', () => {
  it('scores a nearby amenity higher than a far one', () => {
    const near = categoryScore(12.97, 77.59, [school('a', 12.971, 77.591)], 'education');
    const far = categoryScore(12.97, 77.59, [school('b', 13.10, 77.75)], 'education');
    expect(near).toBeGreaterThan(far);
  });

  it('returns 0 for a category with no amenities', () => {
    expect(categoryScore(12.97, 77.59, [school('a', 12.97, 77.59)], 'healthcare')).toBe(0);
  });

  it('saturates: 50 nearby amenities do not exceed 100 and beat 1', () => {
    const one = categoryScore(12.97, 77.59, [school('a', 12.9705, 77.59)], 'education');
    const many = Array.from({ length: 50 }, (_, i) =>
      school(`s${i}`, 12.9705 + i * 1e-5, 77.59));
    const manyScore = categoryScore(12.97, 77.59, many, 'education');
    expect(manyScore).toBeGreaterThan(one);
    expect(manyScore).toBeLessThanOrEqual(100);
  });

  it('scoreParcel returns all six categories', () => {
    const scores = scoreParcel(12.97, 77.59, [school('a', 12.97, 77.59)]);
    expect(Object.keys(scores).sort()).toEqual(
      ['connectivity', 'economic', 'education', 'healthcare', 'infrastructure', 'lifestyle'],
    );
    expect(scores.education).toBeGreaterThan(0);
    expect(scores.healthcare).toBe(0);
  });
});
