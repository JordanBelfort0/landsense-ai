import { describe, it, expect } from 'vitest';
import { classify } from './osm-tags';

describe('classify', () => {
  it('maps a school to education', () => {
    expect(classify({ amenity: 'school' })).toEqual({
      category: 'education', subtype: 'school',
    });
  });

  it('maps a hospital to healthcare', () => {
    expect(classify({ amenity: 'hospital' })?.category).toBe('healthcare');
  });

  it('maps a subway station to connectivity', () => {
    expect(classify({ railway: 'station', station: 'subway' })?.category).toBe('connectivity');
  });

  it('returns null for an unrecognized element', () => {
    expect(classify({ tourism: 'artwork' })).toBeNull();
  });
});
