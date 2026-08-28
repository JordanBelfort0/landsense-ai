export type Category =
  | 'education'
  | 'healthcare'
  | 'connectivity'
  | 'lifestyle'
  | 'economic'
  | 'infrastructure';

export const CATEGORIES: Category[] = [
  'education',
  'healthcare',
  'connectivity',
  'lifestyle',
  'economic',
  'infrastructure',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  education: 'Education',
  healthcare: 'Healthcare',
  connectivity: 'Connectivity',
  lifestyle: 'Lifestyle',
  economic: 'Economic',
  infrastructure: 'Infrastructure',
};

export interface Amenity {
  id: string;
  category: Category;
  subtype: string;
  name: string;
  lat: number;
  lng: number;
}

/** Each value is a 0–100 score. */
export type CategoryScores = Record<Category, number>;

export interface Parcel {
  id: string;
  lat: number;
  lng: number;
  area: number;          // sq.ft
  landUse: 'residential' | 'commercial' | 'mixed' | 'industrial';
  listedPrice: number;   // ₹ per sq.ft
  estimatedValue: number;// ₹ per sq.ft (model estimate)
  scores: CategoryScores;// baked per-category amenity scores
  confidence: number;    // 0–100
}

export interface Persona {
  id: 'family' | 'student' | 'professional' | 'investor';
  label: string;
  /** Per-category weights; MUST sum to 1. */
  weights: CategoryScores;
}
