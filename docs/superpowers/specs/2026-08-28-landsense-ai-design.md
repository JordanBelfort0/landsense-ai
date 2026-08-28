# LandSense AI — Design Spec (Milestone 1)

**Date:** 2026-08-28
**Status:** Approved for implementation planning
**Scope:** First demo-ready vertical slice of the LandSense AI concept.

---

## 1. Context & Goal

LandSense AI is envisioned as an AI-powered "Land Decision Intelligence Platform" spanning ~18 features (interactive map, amenity scoring, personas, ML price prediction, recommendations, heatmaps, explainability, and more).

That full vision is far too large for a single build. This spec deliberately scopes **one coherent, demo-ready vertical slice** centered on the project's actual innovation — the **Amenity Intelligence Engine** — and the features that fall naturally out of it.

**Project goal:** Demo / portfolio / hackathon — an impressive, reliable, end-to-end working prototype. Polish and "wow" matter more than production infrastructure.

**Key decisions driven by that goal:**
- **Target area:** Bengaluru, India. Real amenity geography pulled from OpenStreetMap.
- **Data:** No existing dataset. Amenities are real (OSM); land parcels are **synthetic** (~300 generated points with plausible prices).
- **No real ML in this slice.** With synthetic parcels there is no ground truth to train on — a trained model would just relearn the price-generation formula (circular, fragile on stage). Instead we use a **transparent weighted-scoring engine**, which is more honest, inherently explainable (a spec requirement), and never produces a broken-looking number. Real ML is a future slice, gated on real data.

---

## 2. Feature Scope

### Milestone 1 (this spec — the working demo)
1. **Data pipeline** — OSM amenity fetch + synthetic parcel generation + build-time scoring.
2. **Amenity Intelligence Engine** — per-parcel per-category scores (0–100).
3. **Persona weighting** — Family / Student / Professional / Investor → live Compatibility Score.
4. **Interactive map** — parcels colored by compatibility, click for detail, budget/land-use filters.
5. **Explainability + Confidence** — weighted line-item explanations; data-completeness confidence.

### Fast-follows (same data & engine, small additions — not blocking the demo)
- **"Best land for…"** ranked top-5 list.
- **Land comparison** — 2 parcels side by side + generated trade-off sentence.
- **Category heatmaps** — amenity density layers.
- **Price valuation flag** — undervalued/overpriced (mechanism already produced by the data pipeline; surfacing is trivial).

### Explicitly out of scope (future slices)
Real ML models (Random Forest / XGBoost) for price & recommendation, NL assistant, financial/EMI engine, environmental risk, land-use/zoning legality, feedback-learning loop, user accounts.

---

## 3. Architecture

**Approach: static precompute + Next.js/Leaflet.** A build-time Node script fetches OSM data and generates parcels + scores into committed JSON. The Next.js app loads that JSON and applies persona weighting client-side. No database, no runtime API keys, no live external calls — deploys to Vercel in one step with almost no runtime failure surface.

```
Build time (once, committed):
  Overpass API ──► prepare-data.ts ──► amenities.json
                          │                parcels.json (raw attrs + baked category scores + confidence)
                          └─ synthetic parcel generation + scoring

Runtime (browser):
  parcels.json ──► persona weighting ──► compatibility score ──► map colors + ranking + explanation
```

### Project structure
```
landmatch/
  scripts/prepare-data.ts      # OSM fetch + parcel gen + scoring → JSON
  public/data/                 # committed amenities.json, parcels.json (+ raw OSM cache)
  lib/
    types.ts                   # shared domain types
    scoring/
      amenityScore.ts          # raw POIs → per-category 0–100
      compatibility.ts         # category scores × persona weights → 0–100
      explain.ts               # weighted line-items
      confidence.ts            # data-completeness → 0–100
      *.test.ts                # unit tests (Vitest)
    personas.ts                # persona weight config
  app/
    page.tsx                   # single map-centric page
    components/                # Map, PersonaRail, ParcelDrawer, Filters, ...
  docs/superpowers/specs/      # this document
```

**Stack:** Next.js (App Router) + TypeScript + Leaflet + Vitest. Deployable to Vercel.

---

## 4. Data Model & Pipeline

### 4.1 OSM amenity fetch
`scripts/prepare-data.ts` queries the Overpass API for a Bengaluru bounding box. OSM tag → category mapping:

| Category | OSM tags (representative) |
|---|---|
| Education | `amenity=school\|college\|university`, `office=educational_institution` |
| Healthcare | `amenity=hospital\|clinic\|pharmacy\|doctors` |
| Connectivity | `railway=station` (+ `station=subway` for metro), `highway=bus_stop`, major `highway=trunk\|primary` |
| Lifestyle | `leisure=park\|fitness_centre`, `shop=mall`, `amenity=restaurant\|cinema` |
| Economic | `office=it\|company`, `landuse=commercial`, `amenity=marketplace\|bank` |
| Infrastructure | `amenity=bank`, `power=*`, `man_made=water_works`, public services |

Each amenity stored as `{ id, category, subtype, name, lat, lng }`.

### 4.2 Synthetic parcels (~300)
Random points within the Bengaluru city polygon, biased toward populated areas (avoid lakes/uninhabited zones). Each parcel:
- `area` — sq.ft (plausible distribution)
- `landUse` — hint (residential/commercial/…)
- `listedPrice` — derived from a hidden formula: `f(distance-to-CBD, local amenity density) + noise`.

The **same hidden formula (without noise) is the "estimated market value."** The listed-vs-estimated gap yields the undervalued/overpriced flag for free.

### 4.3 Output artifacts (static JSON)
- `amenities.json` — all categorized POIs (also feeds heatmaps).
- `parcels.json` — parcels with raw attributes **+ precomputed per-category scores + confidence** (scoring baked in so the map is instant on load).

Persona weighting is **not** baked in — applied live in the browser so switching persona re-ranks/re-colors instantly.

### 4.4 Shared types (`lib/types.ts`)
`Amenity`, `Parcel`, `CategoryScores` (education/healthcare/connectivity/lifestyle/economic/infrastructure, each 0–100), `Persona` (id + normalized category weights).

---

## 5. The Amenity Intelligence Engine (core)

### 5.1 Per-category scoring
For a parcel and a category, combine **proximity** (distance to nearest amenity) and **density** (count within radius) via a per-amenity distance-decayed contribution:

```
contribution = exp(-(distance / scale)²)
```

- `scale` is **category-specific**: a hospital stays valuable ~5 km away (large scale); a bus stop needs to be within ~800 m (small scale).
- Sum contributions across all amenities in the category, then squash to **0–100** with a **saturating curve** (diminishing returns — a parcel next to 50 restaurants doesn't blow past 100).

Result: `CategoryScores` per parcel — the "amenity profile," genuinely grounded in real Bengaluru geography.

### 5.2 Compatibility score (persona weighting — live, client-side)
```
compatibility = Σ (categoryScore × personaWeight)     // weights normalized to sum to 1
```
Same parcel → different score per persona. Persona weight tables (`lib/personas.ts`) mirror the spec's Family/Student/Professional/Investor priorities.

### 5.3 Explainability (falls out of the math)
Each category's **weighted contribution** to the final score is exactly its line item. Rank them, narrate the top/bottom few:
- `+24 — Excellent school access (Education 92 × Family weight)`
- `−8 — Few parks nearby (Lifestyle 41)`

The line-items sum to the compatibility score. No separate explanation system.

### 5.4 Confidence score
Function of **data completeness** for that parcel: are there amenities in every category within range, or are some empty? Sparse surroundings + heavier reliance on the synthetic price → lower confidence. Surfaced as e.g. `Confidence: 73%`.

### 5.5 Module boundaries
`lib/scoring/` is pure and dependency-free — `amenityScore.ts`, `compatibility.ts`, `explain.ts`, `confidence.ts`, each a small, independently testable function. This is the intellectual core and the primary test target.

---

## 6. UI & Interaction

Single Next.js page, map-centric, control rail. Everything re-renders instantly on persona/filter change (scoring is client-side).

**Layout:**
- **Left rail** — Persona selector, budget slider, land-use filter, "Best land for…" quick-pick.
- **Center** — Leaflet map; parcels as circle markers **colored by current compatibility score** (red→green). Switching persona visibly re-paints the map — a key demo moment.
- **Right drawer** (on parcel click) — amenity profile (6 category bars), compatibility score, price + valuation flag, confidence, and **"Why this parcel?"** line-items.

**Interactions:**
- **Filter** by budget/land-use → non-matching parcels dim.
- **Best land for…** → ranked top-5, click flies to parcel. *(fast-follow)*
- **Compare** → 2 parcels side by side + generated trade-off sentence. *(fast-follow)*
- **Heatmap toggle** → category density layer from `amenities.json`. *(fast-follow)*

**Aesthetics:** clean, data-dense but legible; map is the hero, controls quiet. Invoke the `frontend-design` skill at build time to avoid a default-template look.

---

## 7. Testing & Error Handling

### Testing
- **`lib/scoring/` unit tests (Vitest)** — the concentration of effort. Fixtures (parcel at a known point + known amenities) assert: distance-decay (closer > farther), saturation caps runaway density, empty category → low score + low confidence, persona weights change ranking, explanation line-items sum to compatibility.
- **`prepare-data.ts`** — light smoke test (valid input → well-formed `parcels.json`). It's a build tool, not heavily covered.
- **UI** — manually verified in the browser for the demo; no heavy E2E for this slice.

### Error handling
- Overpass API flaky/rate-limited → the script retries with backoff and can fall back to a committed raw OSM cache, so a bad network day never blocks the demo.
- Committed JSON means the running app has almost no failure surface — no live API to time out.
- A parcel missing a category shows low score + lower confidence (handled by the model), not an error.

---

## 8. Milestone 1 Definition of Done
- `prepare-data.ts` produces committed `amenities.json` + `parcels.json` for Bengaluru.
- Scoring engine implemented and unit-tested.
- Map renders parcels colored by compatibility; persona switch re-colors live.
- Parcel drawer shows amenity profile, compatibility, price + valuation flag, confidence, and "Why this parcel?" explanation.
- Budget/land-use filters work.
- Deploys to Vercel.

Fast-follows (Best-land-for, Compare, Heatmaps) wired to slot in cleanly but not required for DoD.
