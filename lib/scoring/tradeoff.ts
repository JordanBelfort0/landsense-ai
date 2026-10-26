import {
  Parcel, Persona, Category, CATEGORIES, CATEGORY_LABELS, CategoryScores,
} from '../types';
import { compatibility } from './compatibility';
import { explain } from './explain';

export type Valuation = 'under' | 'over' | 'fair';

export interface ComparedParcel {
  id: string;
  compat: number;          // 0–100 persona compatibility
  confidence: number;      // 0–100
  listedPrice: number;     // ₹ per sq.ft
  estimatedValue: number;  // ₹ per sq.ft (model estimate)
  gap: number;             // (listed − est) / est
  valuation: Valuation;
  scores: CategoryScores;
}

export interface ComparisonLeaders {
  match: string[];         // highest compatibility
  confidence: string[];    // highest confidence
  price: string[];         // lowest listed price
  valuation: string[];     // lowest gap (most undervalued)
  categories: Record<Category, string[]>; // highest per-category score
}

export interface Comparison {
  parcels: ComparedParcel[];
  leaders: ComparisonLeaders;
  narrative: string[];
}

function valuationOf(gap: number): Valuation {
  return gap < -0.08 ? 'under' : gap > 0.08 ? 'over' : 'fair';
}

/** Ids whose value is the extreme (max/min) within a tolerance — reports ties. */
function leadersBy(
  items: ComparedParcel[],
  value: (p: ComparedParcel) => number,
  dir: 'max' | 'min',
): string[] {
  const vals = items.map(value);
  const best = dir === 'max' ? Math.max(...vals) : Math.min(...vals);
  return items.filter((p) => Math.abs(value(p) - best) < 1e-9).map((p) => p.id);
}

function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildNarrative(parcels: ComparedParcel[], persona: Persona): string[] {
  const sorted = [...parcels].sort((a, b) => b.compat - a.compat);
  const best = sorted[0];
  const lines: string[] = [];

  // Lead: the strongest match and the persona-weighted categories driving it.
  const drivers = explain(best.scores, persona)
    .filter((i) => i.points > 0)
    .slice(0, 2)
    .map((i) => i.label);
  const leadDrivers = drivers.length ? `, led by ${joinList(drivers)}` : '';
  lines.push(
    `${best.id} is the strongest match at ${Math.round(best.compat)}/100${leadDrivers}.`,
  );

  // The persona's three most-weighted categories — where a trade-off matters most.
  const priorities = [...CATEGORIES]
    .sort((a, b) => persona.weights[b] - persona.weights[a])
    .slice(0, 3);

  for (const r of sorted.slice(1)) {
    const advantages: string[] = [];

    if (r.listedPrice < best.listedPrice) {
      const pct = Math.round(((best.listedPrice - r.listedPrice) / best.listedPrice) * 100);
      if (pct > 0) advantages.push(`${pct}% cheaper`);
    }
    if (r.valuation === 'under') advantages.push('flagged undervalued');

    const catWin = priorities.find((c) => r.scores[c] > best.scores[c]);
    if (catWin) advantages.push(`stronger on ${CATEGORY_LABELS[catWin]}`);

    const diff = Math.round(best.compat - r.compat);
    const trail = diff > 0 ? `scores ${plural(diff, 'point')} lower` : 'matches it';

    if (advantages.length) {
      lines.push(`${r.id} ${trail} but is ${joinList(advantages.slice(0, 3))}.`);
    } else {
      lines.push(`${r.id} ${trail} with no clear edge over ${best.id}.`);
    }
  }

  return lines;
}

export function compareParcels(parcels: Parcel[], persona: Persona): Comparison {
  const compared: ComparedParcel[] = parcels.map((p) => {
    const gap = (p.listedPrice - p.estimatedValue) / p.estimatedValue;
    return {
      id: p.id,
      compat: compatibility(p.scores, persona),
      confidence: p.confidence,
      listedPrice: p.listedPrice,
      estimatedValue: p.estimatedValue,
      gap,
      valuation: valuationOf(gap),
      scores: p.scores,
    };
  });

  const categories = {} as Record<Category, string[]>;
  for (const c of CATEGORIES) {
    categories[c] = leadersBy(compared, (p) => p.scores[c], 'max');
  }

  const leaders: ComparisonLeaders = {
    match: leadersBy(compared, (p) => p.compat, 'max'),
    confidence: leadersBy(compared, (p) => p.confidence, 'max'),
    price: leadersBy(compared, (p) => p.listedPrice, 'min'),
    valuation: leadersBy(compared, (p) => p.gap, 'min'),
    categories,
  };

  return { parcels: compared, leaders, narrative: buildNarrative(compared, persona) };
}
