import { CategoryScores, Persona, CATEGORIES } from '../types';

export function compatibility(scores: CategoryScores, persona: Persona): number {
  let total = 0;
  for (const c of CATEGORIES) {
    total += scores[c] * persona.weights[c];
  }
  return total; // weights sum to 1, scores 0–100 → result 0–100
}
