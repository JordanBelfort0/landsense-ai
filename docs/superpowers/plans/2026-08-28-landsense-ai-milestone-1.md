# LandSense AI — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo-ready LandSense AI prototype for Bengaluru — an interactive map of synthetic land parcels scored against real OpenStreetMap amenities, re-ranked live by user persona, with explainable compatibility scores.

**Architecture:** A build-time Node script fetches OSM amenities and generates synthetic parcels, baking per-category amenity scores + confidence into committed JSON. The Next.js app loads that JSON and applies persona weighting client-side, so switching persona instantly re-colors the map and re-ranks parcels. No database, no runtime external calls.

**Tech Stack:** Next.js (App Router) + TypeScript + Leaflet (react-leaflet) + Vitest + tsx. Deployable to Vercel.

**Spec:** `docs/superpowers/specs/2026-08-28-landsense-ai-design.md`

## Global Constraints

- **Runtime:** Node.js 24 LTS. Next.js App Router (not Pages Router).
- **Language:** TypeScript, strict mode.
- **No live external calls at runtime.** The Overpass API is called only by `scripts/prepare-data.ts` at build time; the app reads committed JSON from `public/data/`.
- **Scoring modules are pure** — no I/O, no framework imports in `lib/scoring/`.
- **Category set is fixed** (6): `education`, `healthcare`, `connectivity`, `lifestyle`, `economic`, `infrastructure`. Always iterate via the exported `CATEGORIES` array.
- **Target area:** Bengaluru, India. Bounding box `[12.80, 77.45, 13.14, 77.78]` (south, west, north, east).
- **Scores are 0–100 numbers.** Persona weights are fractions summing to exactly 1.

---

## File Structure

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts` — project config
- `lib/types.ts` — shared domain types + `CATEGORIES` constant
- `lib/personas.ts` — the 4 persona weight configs
- `lib/scoring/geo.ts` — `haversine` distance
- `lib/scoring/amenityScore.ts` — raw POIs → per-category 0–100
- `lib/scoring/compatibility.ts` — category scores × persona → 0–100
- `lib/scoring/explain.ts` — signed weighted line-items
- `lib/scoring/confidence.ts` — data-completeness → 0–100
- `lib/scoring/*.test.ts` — Vitest unit tests (the core test target)
- `scripts/prepare-data.ts` — OSM fetch + parcel gen + scoring → JSON
- `scripts/osm-tags.ts` — OSM tag → category mapping (shared by script)
- `public/data/amenities.json`, `public/data/parcels.json` — committed build output
- `public/data/osm-cache.json` — committed raw Overpass response (network fallback)
- `app/layout.tsx`, `app/page.tsx` — app shell + single page
- `app/components/MapView.tsx` — Leaflet map (client-only)
- `app/components/PersonaRail.tsx` — persona selector + filters
- `app/components/ParcelDrawer.tsx` — parcel detail + explanation
- `app/lib/useLandStore.ts` — client state (selected persona, filters, selected parcel)

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`) and a working test runner (`npm test`).

- [ ] **Step 1: Scaffold Next.js non-interactively**

```bash
npx --yes create-next-app@latest . --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
```

If the directory-not-empty prompt blocks it, scaffold in a temp dir and copy in:
```bash
npx --yes create-next-app@latest .lsapp --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes \
  && cp -r .lsapp/* .lsapp/.eslintrc* . 2>/dev/null; rm -rf .lsapp
```

- [ ] **Step 2: Add runtime + dev dependencies**

```bash
npm install leaflet react-leaflet
npm install -D vitest @vitejs/plugin-react jsdom @types/leaflet tsx
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
  resolve: { alias: { '@': __dirname } },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest",
"prepare-data": "tsx scripts/prepare-data.ts"
```

- [ ] **Step 5: Verify dev server and test runner boot**

Run: `npm run build` (expect success) and `npx vitest run` (expect "No test files found" — acceptable at this point).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Leaflet"
```

---

### Task 2: Shared domain types

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Produces: `Category`, `CATEGORIES`, `Amenity`, `CategoryScores`, `Parcel`, `Persona`. Every later task imports from here.

- [ ] **Step 1: Write `lib/types.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared domain types"
```

---

### Task 3: Persona weight configs

**Files:**
- Create: `lib/personas.ts`
- Test: `lib/personas.test.ts`

**Interfaces:**
- Consumes: `Persona`, `CATEGORIES` from `lib/types`.
- Produces: `PERSONAS: Persona[]`, `getPersona(id): Persona`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { PERSONAS } from './personas';
import { CATEGORIES } from './types';

describe('personas', () => {
  it('has all four personas', () => {
    expect(PERSONAS.map((p) => p.id).sort()).toEqual(
      ['family', 'investor', 'professional', 'student'],
    );
  });

  it('every persona weight set sums to 1', () => {
    for (const p of PERSONAS) {
      const sum = CATEGORIES.reduce((acc, c) => acc + p.weights[c], 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/personas.test.ts`
Expected: FAIL — cannot find module `./personas`.

- [ ] **Step 3: Write `lib/personas.ts`**

```ts
import { Persona } from './types';

export const PERSONAS: Persona[] = [
  {
    id: 'family',
    label: 'Family',
    weights: {
      education: 0.30, healthcare: 0.25, connectivity: 0.15,
      lifestyle: 0.10, infrastructure: 0.12, economic: 0.08,
    },
  },
  {
    id: 'student',
    label: 'Student',
    weights: {
      education: 0.28, connectivity: 0.25, lifestyle: 0.20,
      infrastructure: 0.10, economic: 0.10, healthcare: 0.07,
    },
  },
  {
    id: 'professional',
    label: 'Working Professional',
    weights: {
      connectivity: 0.28, economic: 0.22, lifestyle: 0.18,
      healthcare: 0.15, infrastructure: 0.10, education: 0.07,
    },
  },
  {
    id: 'investor',
    label: 'Investor',
    weights: {
      economic: 0.35, connectivity: 0.25, infrastructure: 0.15,
      lifestyle: 0.10, education: 0.08, healthcare: 0.07,
    },
  },
];

export function getPersona(id: Persona['id']): Persona {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona: ${id}`);
  return p;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/personas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/personas.ts lib/personas.test.ts
git commit -m "feat: add persona weight configs"
```

---

### Task 4: Geo distance helper

**Files:**
- Create: `lib/scoring/geo.ts`
- Test: `lib/scoring/geo.test.ts`

**Interfaces:**
- Produces: `haversine(aLat, aLng, bLat, bLng): number` — meters between two lat/lng points.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { haversine } from './geo';

describe('haversine', () => {
  it('is zero for identical points', () => {
    expect(haversine(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  it('measures ~1113 m for 0.01 deg of latitude', () => {
    const d = haversine(12.97, 77.59, 12.98, 77.59);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/geo.test.ts`
Expected: FAIL — cannot find module `./geo`.

- [ ] **Step 3: Write `lib/scoring/geo.ts`**

```ts
const R = 6_371_000; // Earth radius in meters

export function haversine(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/geo.ts lib/scoring/geo.test.ts
git commit -m "feat: add haversine distance helper"
```

---

### Task 5: Amenity scoring engine

**Files:**
- Create: `lib/scoring/amenityScore.ts`
- Test: `lib/scoring/amenityScore.test.ts`

**Interfaces:**
- Consumes: `Amenity`, `Category`, `CategoryScores`, `CATEGORIES` from `lib/types`; `haversine` from `./geo`.
- Produces:
  - `CATEGORY_SCALE: Record<Category, number>` (decay scale, meters)
  - `saturate(sum: number): number`
  - `categoryScore(lat: number, lng: number, amenities: Amenity[], category: Category): number`
  - `scoreParcel(lat: number, lng: number, amenities: Amenity[]): CategoryScores`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { categoryScore, scoreParcel } from './amenityScore';
import { Amenity } from '../types';

const school = (id: string, lat: number, lng: number): Amenity => ({
  id, category: 'education', subtype: 'school', name: id, lat, lng,
});

describe('amenityScore', () => {
  it('scores a nearby amenity higher than a far one', () => {
    const near = categoryScore(12.97, 77.59, [school('a', 12.971, 77.591)], 'education');
    const far = categoryScore(12.97, 77.59, [school('b', 13.10, 77.75)], 'education');
    expect(near).toBeGreaterThan(far);
  });

  it('returns 0 for a category with no amenities', () => {
    expect(categoryScore(12.97, 77.59, [school('a', 12.97, 77.59)], 'healthcare')).toBe(0);
  });

  it('saturates: 50 nearby amenities do not exceed 100 and beat 1', () => {
    const one = categoryScore(12.97, 77.59, [school('a', 12.9705, 77.59)], 'education');
    const many = Array.from({ length: 50 }, (_, i) =>
      school(`s${i}`, 12.9705 + i * 1e-5, 77.59));
    const manyScore = categoryScore(12.97, 77.59, many, 'education');
    expect(manyScore).toBeGreaterThan(one);
    expect(manyScore).toBeLessThanOrEqual(100);
  });

  it('scoreParcel returns all six categories', () => {
    const scores = scoreParcel(12.97, 77.59, [school('a', 12.97, 77.59)]);
    expect(Object.keys(scores).sort()).toEqual(
      ['connectivity', 'economic', 'education', 'healthcare', 'infrastructure', 'lifestyle'],
    );
    expect(scores.education).toBeGreaterThan(0);
    expect(scores.healthcare).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/amenityScore.test.ts`
Expected: FAIL — cannot find module `./amenityScore`.

- [ ] **Step 3: Write `lib/scoring/amenityScore.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/amenityScore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/amenityScore.ts lib/scoring/amenityScore.test.ts
git commit -m "feat: add amenity scoring engine"
```

---

### Task 6: Compatibility scoring

**Files:**
- Create: `lib/scoring/compatibility.ts`
- Test: `lib/scoring/compatibility.test.ts`

**Interfaces:**
- Consumes: `CategoryScores`, `Persona`, `CATEGORIES` from `lib/types`.
- Produces: `compatibility(scores: CategoryScores, persona: Persona): number` — a 0–100 weighted blend.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { compatibility } from './compatibility';
import { getPersona } from '../personas';
import { CategoryScores } from '../types';

const scores: CategoryScores = {
  education: 90, healthcare: 80, connectivity: 40,
  lifestyle: 50, economic: 30, infrastructure: 60,
};

describe('compatibility', () => {
  it('returns a value between 0 and 100', () => {
    const c = compatibility(scores, getPersona('family'));
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(100);
  });

  it('scores the same parcel differently for different personas', () => {
    const family = compatibility(scores, getPersona('family'));
    const investor = compatibility(scores, getPersona('investor'));
    // This parcel has strong education/healthcare, weak economic:
    // family (education-heavy) should rate it higher than investor (economic-heavy).
    expect(family).toBeGreaterThan(investor);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/compatibility.test.ts`
Expected: FAIL — cannot find module `./compatibility`.

- [ ] **Step 3: Write `lib/scoring/compatibility.ts`**

```ts
import { CategoryScores, Persona, CATEGORIES } from '../types';

export function compatibility(scores: CategoryScores, persona: Persona): number {
  let total = 0;
  for (const c of CATEGORIES) {
    total += scores[c] * persona.weights[c];
  }
  return total; // weights sum to 1, scores 0–100 → result 0–100
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/compatibility.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/compatibility.ts lib/scoring/compatibility.test.ts
git commit -m "feat: add persona compatibility scoring"
```

---

### Task 7: Explainability line-items

**Files:**
- Create: `lib/scoring/explain.ts`
- Test: `lib/scoring/explain.test.ts`

**Interfaces:**
- Consumes: `CategoryScores`, `Persona`, `Category`, `CATEGORY_LABELS`, `CATEGORIES` from `lib/types`.
- Produces:
  - `interface Contribution { category: Category; label: string; points: number; score: number; }`
  - `explain(scores: CategoryScores, persona: Persona): Contribution[]` — signed points, sorted high→low.

  **Math:** `points = (score − 50) × weight`. Because weights sum to 1, `50 + Σ points === compatibility(scores, persona)`. Positive points = category pulls the parcel above neutral; negative = drags it down. This makes the line-items reconcile exactly with the compatibility score.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { explain } from './explain';
import { compatibility } from './compatibility';
import { getPersona } from '../personas';
import { CategoryScores } from '../types';

const scores: CategoryScores = {
  education: 92, healthcare: 80, connectivity: 40,
  lifestyle: 41, economic: 30, infrastructure: 60,
};

describe('explain', () => {
  it('line-items plus a 50 baseline reconcile to the compatibility score', () => {
    const persona = getPersona('family');
    const items = explain(scores, persona);
    const sum = 50 + items.reduce((acc, i) => acc + i.points, 0);
    expect(sum).toBeCloseTo(compatibility(scores, persona), 5);
  });

  it('is sorted from most positive to most negative', () => {
    const items = explain(scores, getPersona('family'));
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].points).toBeGreaterThanOrEqual(items[i].points);
    }
  });

  it('marks a strong high-weight category as positive for its persona', () => {
    const items = explain(scores, getPersona('family'));
    const edu = items.find((i) => i.category === 'education')!;
    expect(edu.points).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/explain.test.ts`
Expected: FAIL — cannot find module `./explain`.

- [ ] **Step 3: Write `lib/scoring/explain.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/explain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/explain.ts lib/scoring/explain.test.ts
git commit -m "feat: add explainability line-items"
```

---

### Task 8: Confidence score

**Files:**
- Create: `lib/scoring/confidence.ts`
- Test: `lib/scoring/confidence.test.ts`

**Interfaces:**
- Consumes: `CategoryScores`, `CATEGORIES` from `lib/types`.
- Produces: `confidence(scores: CategoryScores): number` — 0–100, the share of categories that have meaningful nearby data.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { confidence } from './confidence';
import { CategoryScores } from '../types';

const full: CategoryScores = {
  education: 80, healthcare: 70, connectivity: 60,
  lifestyle: 55, economic: 40, infrastructure: 65,
};
const sparse: CategoryScores = {
  education: 80, healthcare: 0, connectivity: 0,
  lifestyle: 0, economic: 0, infrastructure: 0,
};

describe('confidence', () => {
  it('is 100 when every category has data', () => {
    expect(confidence(full)).toBe(100);
  });

  it('is low when most categories are empty', () => {
    expect(confidence(sparse)).toBeLessThan(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/scoring/confidence.test.ts`
Expected: FAIL — cannot find module `./confidence`.

- [ ] **Step 3: Write `lib/scoring/confidence.ts`**

```ts
import { CategoryScores, CATEGORIES } from '../types';

/** A category counts as "has data" if its score clears this floor. */
const PRESENCE_FLOOR = 5;

export function confidence(scores: CategoryScores): number {
  const present = CATEGORIES.filter((c) => scores[c] >= PRESENCE_FLOOR).length;
  return Math.round((100 * present) / CATEGORIES.length);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/scoring/confidence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/confidence.ts lib/scoring/confidence.test.ts
git commit -m "feat: add confidence score"
```

---

### Task 9: OSM tag mapping

**Files:**
- Create: `scripts/osm-tags.ts`
- Test: `scripts/osm-tags.test.ts`

**Interfaces:**
- Consumes: `Category` from `lib/types`.
- Produces:
  - `OVERPASS_QUERY_BODY: string` — the Overpass QL selectors (without header/footer).
  - `classify(tags: Record<string, string>): { category: Category; subtype: string } | null` — maps an OSM element's tags to a category, or null if it matches none.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/osm-tags.test.ts` (temporarily allow via `npx vitest run scripts/osm-tags.test.ts` — it matches the file directly).
Expected: FAIL — cannot find module `./osm-tags`.

- [ ] **Step 3: Write `scripts/osm-tags.ts`**

```ts
import { Category } from '../lib/types';

type Rule = { match: (t: Record<string, string>) => boolean; category: Category; subtype: string };

const RULES: Rule[] = [
  { match: (t) => ['school', 'college', 'university'].includes(t.amenity), category: 'education', subtype: 'school' },
  { match: (t) => t.office === 'educational_institution', category: 'education', subtype: 'institute' },
  { match: (t) => ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(t.amenity), category: 'healthcare', subtype: 'health' },
  { match: (t) => t.railway === 'station', category: 'connectivity', subtype: t.station === 'subway' ? 'metro' : 'rail' },
  { match: (t) => t.highway === 'bus_stop', category: 'connectivity', subtype: 'bus_stop' },
  { match: (t) => ['trunk', 'primary'].includes(t.highway), category: 'connectivity', subtype: 'major_road' },
  { match: (t) => ['park', 'fitness_centre'].includes(t.leisure), category: 'lifestyle', subtype: t.leisure },
  { match: (t) => t.shop === 'mall', category: 'lifestyle', subtype: 'mall' },
  { match: (t) => ['restaurant', 'cinema'].includes(t.amenity), category: 'lifestyle', subtype: t.amenity },
  { match: (t) => t.office === 'it' || t.office === 'company', category: 'economic', subtype: 'office' },
  { match: (t) => t.landuse === 'commercial', category: 'economic', subtype: 'commercial' },
  { match: (t) => t.amenity === 'marketplace', category: 'economic', subtype: 'market' },
  { match: (t) => t.amenity === 'bank', category: 'infrastructure', subtype: 'bank' },
  { match: (t) => t.man_made === 'water_works', category: 'infrastructure', subtype: 'water' },
  { match: (t) => !!t.power, category: 'infrastructure', subtype: 'power' },
];

export function classify(tags: Record<string, string>): { category: Category; subtype: string } | null {
  for (const r of RULES) {
    if (r.match(tags)) return { category: r.category, subtype: r.subtype };
  }
  return null;
}

/** Overpass QL selectors for the Bengaluru bounding box (bbox supplied by the caller). */
export const OVERPASS_QUERY_BODY = `
  nwr["amenity"~"^(school|college|university|hospital|clinic|doctors|pharmacy|restaurant|cinema|marketplace|bank)$"]({{bbox}});
  nwr["office"~"^(educational_institution|it|company)$"]({{bbox}});
  nwr["railway"="station"]({{bbox}});
  nwr["highway"~"^(bus_stop|trunk|primary)$"]({{bbox}});
  nwr["leisure"~"^(park|fitness_centre)$"]({{bbox}});
  nwr["shop"="mall"]({{bbox}});
  nwr["landuse"="commercial"]({{bbox}});
  nwr["man_made"="water_works"]({{bbox}});
  nwr["power"]({{bbox}});
`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/osm-tags.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `vitest.config.ts` include to cover scripts, then commit**

Change `include` to `['lib/**/*.test.ts', 'scripts/**/*.test.ts']`.

```bash
git add scripts/osm-tags.ts scripts/osm-tags.test.ts vitest.config.ts
git commit -m "feat: add OSM tag classification"
```

---

### Task 10: Data preparation script

**Files:**
- Create: `scripts/prepare-data.ts`
- Create (output, committed): `public/data/amenities.json`, `public/data/parcels.json`, `public/data/osm-cache.json`

**Interfaces:**
- Consumes: `classify`, `OVERPASS_QUERY_BODY` from `./osm-tags`; `scoreParcel` from `../lib/scoring/amenityScore`; `confidence` from `../lib/scoring/confidence`; `Amenity`, `Parcel` from `../lib/types`.
- Produces: two committed JSON files the app reads. No app code imports this script.

**Notes:** Bengaluru CBD ≈ `12.9767, 77.5713`. Parcels are generated with a seeded PRNG so runs are reproducible (no `Math.random()` reproducibility concerns for the demo).

- [ ] **Step 1: Write `scripts/prepare-data.ts`**

```ts
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { classify, OVERPASS_QUERY_BODY } from './osm-tags';
import { scoreParcel } from '../lib/scoring/amenityScore';
import { confidence } from '../lib/scoring/confidence';
import { haversine } from '../lib/scoring/geo';
import { Amenity, Parcel } from '../lib/types';

const BBOX = { s: 12.80, w: 77.45, n: 13.14, e: 77.78 };
const CBD = { lat: 12.9767, lng: 77.5713 };
const OUT_DIR = join(process.cwd(), 'public', 'data');
const CACHE = join(OUT_DIR, 'osm-cache.json');
const N_PARCELS = 300;

// --- seeded PRNG (mulberry32) so parcel generation is reproducible ---
function makeRng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function fetchOverpass(): Promise<any> {
  const bbox = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
  const query = `[out:json][timeout:120];(${OVERPASS_QUERY_BODY.replaceAll('{{bbox}}', bbox)});out center tags;`;
  const url = 'https://overpass-api.de/api/interpreter';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', body: query });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      writeFileSync(CACHE, JSON.stringify(json));
      return json;
    } catch (err) {
      console.warn(`Overpass attempt ${attempt} failed: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  if (existsSync(CACHE)) {
    console.warn('Using committed OSM cache as fallback.');
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  }
  throw new Error('Overpass failed and no cache available.');
}

function toAmenities(osm: any): Amenity[] {
  const out: Amenity[] = [];
  for (const el of osm.elements ?? []) {
    const tags = el.tags ?? {};
    const cls = classify(tags);
    if (!cls) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    out.push({
      id: `${el.type}/${el.id}`,
      category: cls.category,
      subtype: cls.subtype,
      name: tags.name ?? cls.subtype,
      lat, lng,
    });
  }
  return out;
}

function generateParcels(amenities: Amenity[], rng: () => number): Parcel[] {
  const parcels: Parcel[] = [];
  let made = 0, tries = 0;
  const landUses: Parcel['landUse'][] = ['residential', 'commercial', 'mixed', 'industrial'];
  while (made < N_PARCELS && tries < N_PARCELS * 20) {
    tries++;
    const lat = BBOX.s + rng() * (BBOX.n - BBOX.s);
    const lng = BBOX.w + rng() * (BBOX.e - BBOX.w);
    // Bias toward populated areas: reject points with no amenity within 1.2 km.
    const hasNeighbor = amenities.some((a) => haversine(lat, lng, a.lat, a.lng) < 1200);
    if (!hasNeighbor) continue;

    const scores = scoreParcel(lat, lng, amenities);
    const distKm = haversine(lat, lng, CBD.lat, CBD.lng) / 1000;
    const density = (scores.economic + scores.lifestyle + scores.connectivity) / 3;
    // Hidden valuation model (₹/sq.ft): central + amenity-rich = pricier.
    const estimatedValue = Math.round(
      2500 + 4000 * Math.exp(-distKm / 12) + 20 * density,
    );
    const noise = 1 + (rng() - 0.5) * 0.4; // ±20% listing noise
    const listedPrice = Math.round(estimatedValue * noise);

    parcels.push({
      id: `parcel-${made}`,
      lat, lng,
      area: Math.round((1200 + rng() * 8800) / 100) * 100,
      landUse: landUses[Math.floor(rng() * landUses.length)],
      listedPrice,
      estimatedValue,
      scores,
      confidence: confidence(scores),
    });
    made++;
  }
  return parcels;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const osm = await fetchOverpass();
  const amenities = toAmenities(osm);
  console.log(`Categorized ${amenities.length} amenities.`);
  const parcels = generateParcels(amenities, makeRng(42));
  console.log(`Generated ${parcels.length} parcels.`);
  writeFileSync(join(OUT_DIR, 'amenities.json'), JSON.stringify(amenities));
  writeFileSync(join(OUT_DIR, 'parcels.json'), JSON.stringify(parcels));
  console.log('Wrote public/data/amenities.json and parcels.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the script**

Run: `npm run prepare-data`
Expected: logs a non-zero amenity count and 300 parcels; creates the three JSON files. If the network blocks Overpass and no cache exists, retry later — the demo needs this data committed once.

- [ ] **Step 3: Sanity-check the output**

Run: `node -e "const p=require('./public/data/parcels.json'); console.log(p.length, p[0].scores, p[0].confidence)"`
Expected: `300`, a scores object with six numeric fields, and a confidence 0–100.

- [ ] **Step 4: Commit (including generated data)**

```bash
git add scripts/prepare-data.ts public/data/amenities.json public/data/parcels.json public/data/osm-cache.json
git commit -m "feat: add data prep script and committed Bengaluru data"
```

---

### Task 11: Client state store

**Files:**
- Create: `app/lib/useLandStore.ts`

**Interfaces:**
- Consumes: `Parcel`, `Persona` from `@/lib/types`; `PERSONAS` from `@/lib/personas`; `compatibility` from `@/lib/scoring/compatibility`.
- Produces: `useLandStore()` React hook returning `{ parcels, personaId, setPersonaId, budget, setBudget, landUse, setLandUse, selectedId, setSelectedId, persona, ranked, visible }`.
  - `ranked: (Parcel & { compat: number })[]` — all parcels with compatibility for the active persona, sorted desc.
  - `visible` — `ranked` filtered by budget (₹/sq.ft ceiling) and landUse (`'all'` or a specific use).

- [ ] **Step 1: Write `app/lib/useLandStore.ts`**

```ts
'use client';
import { useMemo, useState } from 'react';
import parcelsData from '@/public/data/parcels.json';
import { Parcel, Persona } from '@/lib/types';
import { PERSONAS, getPersona } from '@/lib/personas';
import { compatibility } from '@/lib/scoring/compatibility';

const PARCELS = parcelsData as Parcel[];
const MAX_PRICE = Math.max(...PARCELS.map((p) => p.listedPrice));

export function useLandStore() {
  const [personaId, setPersonaId] = useState<Persona['id']>('family');
  const [budget, setBudget] = useState(MAX_PRICE);
  const [landUse, setLandUse] = useState<'all' | Parcel['landUse']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const persona = getPersona(personaId);

  const ranked = useMemo(
    () =>
      PARCELS.map((p) => ({ ...p, compat: compatibility(p.scores, persona) }))
        .sort((a, b) => b.compat - a.compat),
    [persona],
  );

  const visible = useMemo(
    () =>
      ranked.filter(
        (p) => p.listedPrice <= budget && (landUse === 'all' || p.landUse === landUse),
      ),
    [ranked, budget, landUse],
  );

  return {
    parcels: PARCELS, personas: PERSONAS, persona,
    personaId, setPersonaId, budget, setBudget, maxPrice: MAX_PRICE,
    landUse, setLandUse, selectedId, setSelectedId, ranked, visible,
  };
}
```

- [ ] **Step 2: Ensure JSON import compiles**

In `tsconfig.json`, confirm `"resolveJsonModule": true` and `"esModuleInterop": true` (create-next-app sets these). If missing, add them under `compilerOptions`.

- [ ] **Step 3: Commit**

```bash
git add app/lib/useLandStore.ts tsconfig.json
git commit -m "feat: add client land store with persona ranking and filters"
```

---

### Task 12: Map view

**Files:**
- Create: `app/components/MapView.tsx`

**Interfaces:**
- Consumes: the `useLandStore` return shape; `Parcel` from `@/lib/types`.
- Produces: `<MapView store={store} />` — a Leaflet map with one circle marker per visible parcel, colored by `compat` (red→green), clicking sets `selectedId`.

- [ ] **Step 1: Write `app/components/MapView.tsx`**

```tsx
'use client';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLandStore } from '@/app/lib/useLandStore';

/** Map a 0–100 score to a red→amber→green hue. */
function scoreColor(v: number): string {
  const hue = (v / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 75%, 45%)`;
}

export default function MapView({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { visible, selectedId, setSelectedId } = store;
  return (
    <MapContainer center={[12.9767, 77.5713]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      {visible.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.id === selectedId ? 10 : 6}
          pathOptions={{
            color: p.id === selectedId ? '#111' : scoreColor(p.compat),
            fillColor: scoreColor(p.compat),
            fillOpacity: 0.85,
            weight: p.id === selectedId ? 2 : 1,
          }}
          eventHandlers={{ click: () => setSelectedId(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/MapView.tsx
git commit -m "feat: add Leaflet map view colored by compatibility"
```

---

### Task 13: Persona rail & filters

**Files:**
- Create: `app/components/PersonaRail.tsx`

**Interfaces:**
- Consumes: the `useLandStore` return shape.
- Produces: `<PersonaRail store={store} />` — persona buttons, budget slider, land-use select, and a top-5 "Best matches" list (clicking selects + is consumed by the map via shared `selectedId`).

- [ ] **Step 1: Write `app/components/PersonaRail.tsx`**

```tsx
'use client';
import { useLandStore } from '@/app/lib/useLandStore';

export default function PersonaRail({ store }: { store: ReturnType<typeof useLandStore> }) {
  const {
    personas, personaId, setPersonaId, budget, setBudget, maxPrice,
    landUse, setLandUse, visible, setSelectedId,
  } = store;

  return (
    <aside style={{ padding: 16, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>LandSense AI</h1>
      <p style={{ fontSize: 12, color: '#666', marginTop: 0 }}>Bengaluru · {visible.length} parcels</p>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888' }}>I am a…</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersonaId(p.id)}
            style={{
              padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
              border: '1px solid #ddd', borderRadius: 8,
              background: p.id === personaId ? '#111' : '#fff',
              color: p.id === personaId ? '#fff' : '#111',
            }}
          >{p.label}</button>
        ))}
      </div>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Budget (₹/sq.ft)</h2>
      <input
        type="range" min={1000} max={maxPrice} value={budget}
        onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%' }}
      />
      <div style={{ fontSize: 12 }}>≤ ₹{budget.toLocaleString('en-IN')}</div>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Land use</h2>
      <select value={landUse} onChange={(e) => setLandUse(e.target.value as typeof landUse)} style={{ width: '100%', padding: 6 }}>
        {['all', 'residential', 'commercial', 'mixed', 'industrial'].map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: '#888', marginTop: 20 }}>Best matches</h2>
      <ol style={{ paddingLeft: 18, fontSize: 13 }}>
        {visible.slice(0, 5).map((p) => (
          <li key={p.id} style={{ marginBottom: 4, cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>
            {p.id} — {Math.round(p.compat)}%
          </li>
        ))}
      </ol>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/PersonaRail.tsx
git commit -m "feat: add persona rail with filters and best-matches list"
```

---

### Task 14: Parcel drawer with explanation

**Files:**
- Create: `app/components/ParcelDrawer.tsx`

**Interfaces:**
- Consumes: the `useLandStore` return shape; `explain` from `@/lib/scoring/compatibility`… (correction) `explain` from `@/lib/scoring/explain`; `CATEGORY_LABELS`, `CATEGORIES` from `@/lib/types`.
- Produces: `<ParcelDrawer store={store} />` — shows the selected parcel's category bars, compatibility, price + valuation flag, confidence, and "Why this parcel?" line-items. Renders nothing when no parcel is selected.

- [ ] **Step 1: Write `app/components/ParcelDrawer.tsx`**

```tsx
'use client';
import { useLandStore } from '@/app/lib/useLandStore';
import { explain } from '@/lib/scoring/explain';
import { compatibility } from '@/lib/scoring/compatibility';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export default function ParcelDrawer({ store }: { store: ReturnType<typeof useLandStore> }) {
  const { visible, ranked, selectedId, setSelectedId, persona } = store;
  const parcel = ranked.find((p) => p.id === selectedId);
  if (!parcel) return null;

  const compat = compatibility(parcel.scores, persona);
  const items = explain(parcel.scores, persona);
  const gap = (parcel.listedPrice - parcel.estimatedValue) / parcel.estimatedValue;
  const flag = gap < -0.08 ? 'Potentially Undervalued' : gap > 0.08 ? 'Potentially Overpriced' : 'Fairly Priced';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
      background: '#fff', boxShadow: '-2px 0 12px rgba(0,0,0,0.12)', padding: 16,
      overflowY: 'auto', zIndex: 1000, boxSizing: 'border-box',
    }}>
      <button onClick={() => setSelectedId(null)} style={{ float: 'right', cursor: 'pointer' }}>✕</button>
      <h2 style={{ marginTop: 0 }}>{parcel.id}</h2>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(compat)}<span style={{ fontSize: 14 }}>/100 match</span></div>
      <div style={{ fontSize: 12, color: '#666' }}>Confidence: {parcel.confidence}%</div>

      <p style={{ fontSize: 13 }}>
        {parcel.area.toLocaleString('en-IN')} sq.ft · {parcel.landUse}<br />
        Listed ₹{parcel.listedPrice.toLocaleString('en-IN')}/sq.ft · Est. ₹{parcel.estimatedValue.toLocaleString('en-IN')}<br />
        <strong>{flag}</strong>
      </p>

      <h3 style={{ fontSize: 13 }}>Amenity profile</h3>
      {CATEGORIES.map((c) => (
        <div key={c} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>{CATEGORY_LABELS[c]}</span><span>{Math.round(parcel.scores[c])}</span>
          </div>
          <div style={{ background: '#eee', height: 6, borderRadius: 3 }}>
            <div style={{ width: `${parcel.scores[c]}%`, height: 6, borderRadius: 3, background: '#2b7' }} />
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 13 }}>Why this parcel?</h3>
      <ul style={{ paddingLeft: 16, fontSize: 13 }}>
        {items.filter((i) => Math.abs(i.points) >= 0.5).slice(0, 6).map((i) => (
          <li key={i.category} style={{ color: i.points >= 0 ? '#178' : '#b33' }}>
            {i.points >= 0 ? '+' : ''}{i.points.toFixed(0)} — {i.label} ({Math.round(i.score)})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ParcelDrawer.tsx
git commit -m "feat: add parcel drawer with explanation and valuation flag"
```

---

### Task 15: Wire the page together

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css` (reset margins so the map fills the viewport)

**Interfaces:**
- Consumes: `useLandStore`, `PersonaRail`, `ParcelDrawer`, and a dynamically-imported `MapView` (Leaflet must not SSR).

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
'use client';
import dynamic from 'next/dynamic';
import { useLandStore } from '@/app/lib/useLandStore';
import PersonaRail from '@/app/components/PersonaRail';
import ParcelDrawer from '@/app/components/ParcelDrawer';

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false });

export default function Page() {
  const store = useLandStore();
  return (
    <main style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh' }}>
      <PersonaRail store={store} />
      <div style={{ position: 'relative' }}>
        <MapView store={store} />
        <ParcelDrawer store={store} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Reset body margin in `app/globals.css`**

Add at the top:
```css
html, body { margin: 0; padding: 0; }
* { box-sizing: border-box; }
```

- [ ] **Step 3: Run the app and verify manually in the browser**

Run: `npm run dev`, open `http://localhost:3000`. Confirm:
- Map shows ~300 colored parcels across Bengaluru.
- Switching persona visibly re-colors the map and reorders "Best matches".
- Dragging the budget slider / changing land use removes parcels.
- Clicking a parcel opens the drawer with category bars, compatibility, valuation flag, confidence, and "+/−" explanation lines.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all scoring + persona + osm-tags tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: wire map, persona rail, and parcel drawer into the page"
```

---

### Task 16: Production build & deploy

**Files:**
- Modify: `README.md` (short run/deploy notes)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Verify a clean production build**

Run: `npm run build`
Expected: build succeeds with no type errors. Fix any strict-mode type errors surfaced here.

- [ ] **Step 2: Write `README.md`**

```markdown
# LandSense AI

Interactive land-intelligence prototype for Bengaluru. Synthetic parcels scored
against real OpenStreetMap amenities, re-ranked live by user persona.

## Develop
    npm install
    npm run prepare-data   # (re)fetch OSM + regenerate parcels — data is committed
    npm run dev

## Test
    npm test

## Deploy
Push to a Vercel-linked repo, or run `vercel`. No env vars required.
```

- [ ] **Step 3: Commit and (optionally) deploy**

```bash
git add README.md
git commit -m "docs: add README with run and deploy notes"
```

Deploy with the `vercel:deploy` skill or `vercel` CLI when ready.

---

## Self-Review

**Spec coverage:**
- Interactive map (spec §1) → Tasks 12, 15.
- Amenity Intelligence Engine (spec §2, §5) → Tasks 4–5.
- Persona weighting (spec §3, §5) → Tasks 3, 6, 11.
- Explainability (spec §5.3, §11) → Tasks 7, 14.
- Confidence (spec §5.4, §14) → Tasks 8, 14.
- Price valuation flag (spec §7 fast-follow) → Tasks 10 (model), 14 (surfacing).
- Best-land-for (spec §10 fast-follow) → Task 13 top-5 list.
- Filters (spec §1) → Tasks 11, 13.
- Data pipeline (spec §4) → Tasks 9, 10.
- Testing & error handling (spec §7) → tests in Tasks 3–9; Overpass retry/cache in Task 10.
- Compare & heatmaps (spec fast-follows) → intentionally deferred; store + amenities.json make them cheap later. Noted, not built — acceptable per DoD.

**Placeholder scan:** No TBD/TODO; every code step has concrete code.

**Type consistency:** `Category`/`CATEGORIES`, `CategoryScores`, `Parcel`, `Persona` used identically across tasks. `scoreParcel`, `compatibility`, `explain`, `confidence`, `classify`, `haversine` signatures match between producer and consumer tasks. `useLandStore` return shape consumed consistently by Tasks 12–15. (Task 14 Step-1 interface note corrects an `explain` import path inline.)
