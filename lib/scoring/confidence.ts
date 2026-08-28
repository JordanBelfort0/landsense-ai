import { CategoryScores, CATEGORIES } from '../types';

/** A category counts as "has data" if its score clears this floor. */
const PRESENCE_FLOOR = 5;

export function confidence(scores: CategoryScores): number {
  const present = CATEGORIES.filter((c) => scores[c] >= PRESENCE_FLOOR).length;
  return Math.round((100 * present) / CATEGORIES.length);
}
