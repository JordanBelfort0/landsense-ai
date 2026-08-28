import { Amenity, Category, CategoryScores, CATEGORIES } from '../types';
import { haversine } from './geo';

/** Distance (m) at which an amenity's contribution decays to ~1/e. */
export const CATEGORY_SCALE: Record<Category, number> = {
  education: 1500,
  healthcare: 4000,
  connectivity: 900,
  lifestyle: 1200,
  economic: 3000,
  infrastructure: 2000,
};

/** Sum of decayed contributions at which the score reaches 50. */
const HALF_SATURATION = 3;

/** Map an unbounded positive sum onto 0–100 with diminishing returns. */
export function saturate(sum: number): number {
  return 100 * (sum / (sum + HALF_SATURATION));
}

export function categoryScore(
  lat: number, lng: number, amenities: Amenity[], category: Category,
): number {
  const scale = CATEGORY_SCALE[category];
  let sum = 0;
  for (const a of amenities) {
    if (a.category !== category) continue;
    const d = haversine(lat, lng, a.lat, a.lng);
    sum += Math.exp(-((d / scale) ** 2));
  }
  return saturate(sum);
}

export function scoreParcel(
  lat: number, lng: number, amenities: Amenity[],
): CategoryScores {
  const scores = {} as CategoryScores;
  for (const c of CATEGORIES) {
    scores[c] = categoryScore(lat, lng, amenities, c);
  }
  return scores;
}
