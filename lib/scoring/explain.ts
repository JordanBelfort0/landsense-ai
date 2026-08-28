import {
  CategoryScores, Persona, Category, CATEGORIES, CATEGORY_LABELS,
} from '../types';

export interface Contribution {
  category: Category;
  label: string;
  points: number; // signed contribution vs a neutral baseline of 50
  score: number;  // raw 0–100 category score
}

const BASELINE = 50;

export function explain(scores: CategoryScores, persona: Persona): Contribution[] {
  return CATEGORIES.map((c) => ({
    category: c,
    label: CATEGORY_LABELS[c],
    points: (scores[c] - BASELINE) * persona.weights[c],
    score: scores[c],
  })).sort((a, b) => b.points - a.points);
}
