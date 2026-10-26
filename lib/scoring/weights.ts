import { Category, CategoryScores, CATEGORIES } from '../types';

/**
 * Change one category's weight to `value` (clamped 0–1) and rescale every
 * other category proportionally so the full vector still sums to exactly 1.
 * This is what powers the user-tunable sliders: dragging one category up
 * squeezes the rest down in proportion to where they already stood, rather
 * than resetting them or letting the vector drift off 1.
 *
 * Edge case: if every other category is currently 0 (nothing to scale
 * proportionally from), the remaining weight is split evenly across them.
 */
export function adjustWeight(
  weights: CategoryScores,
  changed: Category,
  value: number,
): CategoryScores {
  const clamped = Math.max(0, Math.min(1, value));
  const others = CATEGORIES.filter((c) => c !== changed);
  const othersSum = others.reduce((s, c) => s + weights[c], 0);
  const remaining = 1 - clamped;

  const result = { ...weights, [changed]: clamped } as CategoryScores;

  if (othersSum <= 1e-9) {
    const even = remaining / others.length;
    others.forEach((c) => { result[c] = even; });
  } else {
    others.forEach((c) => { result[c] = (weights[c] / othersSum) * remaining; });
  }
  return result;
}

/** True if a weight vector sums to 1 within floating-point tolerance. */
export function weightsValid(weights: CategoryScores): boolean {
  const sum = CATEGORIES.reduce((s, c) => s + weights[c], 0);
  return Math.abs(sum - 1) < 1e-6;
}
