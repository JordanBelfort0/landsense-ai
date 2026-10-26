import { CategoryScores, CATEGORIES } from '../types';

/**
 * Raw category score at which a category is treated as fully evidenced.
 * Below this, a category contributes partial credit proportional to its
 * score rather than snapping from "absent" to "present" at a hard cutoff —
 * a category scoring 19 and one scoring 20 should read as almost identical
 * confidence, not as "no data" vs. "full data."
 */
const EVIDENCE_FLOOR = 20;

/**
 * Average, across all 6 categories, of how close each category's score is
 * to being fully evidenced (capped at 1 per category once it clears the
 * floor). This measures how much real data backs the score — not how good
 * the score itself is, so a quiet residential area with modest-but-genuine
 * amenity access isn't penalised on confidence just for having a lower score.
 */
export function confidence(scores: CategoryScores): number {
  const evidence = CATEGORIES.reduce(
    (sum, c) => sum + Math.min(1, scores[c] / EVIDENCE_FLOOR),
    0,
  );
  return Math.round((100 * evidence) / CATEGORIES.length);
}
