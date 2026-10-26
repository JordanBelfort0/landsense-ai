import {
  CategoryScores, Persona, Category, CATEGORIES, CATEGORY_LABELS,
} from '../types';
import { compatibility } from './compatibility';
import { joinList, plural } from './tradeoff';

/** How many raw category-score points this category alone would need to
 *  gain to close the full gap — holding every other category fixed. */
export interface SingleLever {
  category: Category;
  label: string;
  currentScore: number;
  neededPoints: number; // raw 0–100 points this category alone would need
  newScore: number;     // currentScore + neededPoints
  achievable: boolean;  // newScore <= 100
}

/** One step of the combined plan: raise this category as far as its
 *  100-point ceiling allows (or less, if that's all that's needed). */
export interface ComboStep {
  category: Category;
  label: string;
  currentScore: number;
  pointsRaised: number;
  newScore: number;
  weightedContribution: number; // pointsRaised * weight — in compat-score units
}

export interface Counterfactual {
  gap: number;              // targetCompat - subjectCompat; 0 or negative = already matches/leads
  subjectCompat: number;
  targetCompat: number;
  singleLevers: SingleLever[];  // every category, sorted by neededPoints ascending
  bestSingleLever: SingleLever | null; // the smallest achievable single-category fix, if any
  combo: ComboStep[];       // greedy multi-category plan, highest-weight category first
  comboClosesGap: boolean;  // false only if maxing out every category still isn't enough
}

const EPS = 1e-9;

/**
 * What would it take for `subject` to match `target`'s compatibility score
 * under `persona`? Pure algebra on the existing weighted-sum formula — no
 * search, no sampling, no separate model. If subject already matches or
 * beats target, gap <= 0 and every list comes back empty.
 */
export function counterfactual(
  subject: CategoryScores,
  target: CategoryScores,
  persona: Persona,
): Counterfactual {
  const subjectCompat = compatibility(subject, persona);
  const targetCompat = compatibility(target, persona);
  const gap = targetCompat - subjectCompat;

  if (gap <= EPS) {
    return {
      gap, subjectCompat, targetCompat,
      singleLevers: [], bestSingleLever: null, combo: [], comboClosesGap: true,
    };
  }

  const singleLevers: SingleLever[] = CATEGORIES
    .filter((c) => persona.weights[c] > EPS)
    .map((c) => {
      const currentScore = subject[c];
      const neededPoints = gap / persona.weights[c];
      const newScore = currentScore + neededPoints;
      return {
        category: c,
        label: CATEGORY_LABELS[c],
        currentScore,
        neededPoints,
        newScore,
        achievable: newScore <= 100 + EPS,
      };
    })
    .sort((a, b) => a.neededPoints - b.neededPoints);

  const bestSingleLever = singleLevers.find((l) => l.achievable) ?? null;

  // Greedy combination: spend each category's headroom, highest-weight
  // (most weighted points per raw point) category first, until the gap
  // is covered.
  const combo: ComboStep[] = [];
  let remaining = gap;
  const byWeight = [...CATEGORIES]
    .filter((c) => persona.weights[c] > EPS)
    .sort((a, b) => persona.weights[b] - persona.weights[a]);

  for (const c of byWeight) {
    if (remaining <= EPS) break;
    const headroom = 100 - subject[c];
    if (headroom <= EPS) continue;
    const availableContribution = headroom * persona.weights[c];
    const takenContribution = Math.min(remaining, availableContribution);
    const pointsRaised = takenContribution / persona.weights[c];
    combo.push({
      category: c,
      label: CATEGORY_LABELS[c],
      currentScore: subject[c],
      pointsRaised,
      newScore: subject[c] + pointsRaised,
      weightedContribution: takenContribution,
    });
    remaining -= takenContribution;
  }

  return {
    gap, subjectCompat, targetCompat,
    singleLevers, bestSingleLever, combo,
    comboClosesGap: remaining <= EPS,
  };
}

/** Plain-English rendering of a Counterfactual — rule-based, not generated. */
export function describeCounterfactual(cf: Counterfactual, persona: Persona): string[] {
  if (cf.gap <= EPS) {
    return [`This parcel already matches or beats the top match for ${persona.label} — no gap to close.`];
  }

  const lines: string[] = [
    `This parcel trails the top match by ${plural(Math.round(cf.gap), 'point')} for ${persona.label}.`,
  ];

  if (cf.bestSingleLever) {
    const l = cf.bestSingleLever;
    lines.push(
      `Raising ${l.label} alone from ${Math.round(l.currentScore)} to `
      + `${Math.round(l.newScore)} (+${Math.round(l.neededPoints)}) would close the gap.`,
    );
    return lines;
  }

  if (cf.combo.length === 0) {
    lines.push('No category has any headroom left to improve.');
    return lines;
  }

  const steps = cf.combo
    .filter((s) => Math.round(s.pointsRaised) > 0)
    .map((s) => `${plural(Math.round(s.pointsRaised), 'point')} on ${s.label}`);
  if (cf.comboClosesGap) {
    lines.push(`No single category can close it alone, but ${joinList(steps)} together would.`);
  } else {
    lines.push(
      `Even maxing out every category's headroom (${joinList(steps)}) falls short — `
      + 'this parcel is dominated across the board under the current weights.',
    );
  }
  return lines;
}
