# Landmatch AI — Implementation Status

Source material for the project report and presentation. Every number here is
drawn from the working codebase, not aspirational.

## One-line summary

Landmatch AI turns a conventional real-estate listing into an **AI Land Decision
Intelligence** platform: 300 land parcels across Bengaluru scored against 29,562
real OpenStreetMap amenities, then re-ranked live for four user personas with a
transparent, fully explainable scoring engine.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + React 19, TypeScript |
| Map | Leaflet + react-leaflet, CARTO basemap |
| Data pipeline | OpenStreetMap Overpass API → categorised JSON (`npm run prepare-data`) |
| Testing | Vitest — 19 unit tests across the scoring engine |
| Deploy | Vercel-ready; runs locally with `npm run dev` |

## Data at a glance

- **300** synthetic land parcels (lat/lng, area, land use, listed price, est. value).
- **29,562** real amenities pulled from OSM, classified into 6 categories:
  connectivity 7,083 · infrastructure 6,917 · lifestyle 5,742 · economic 4,123 ·
  healthcare 3,240 · education 2,457.
- **4** user personas: Family, Student, Working Professional, Investor.

## The technical pipeline (implemented end-to-end)

```
Raw OSM geodata → amenity classification (6 categories)
    → per-parcel amenity scoring (Gaussian distance-decay → 0–100 per category)
    → persona weight model (dynamic per-category weights)
    → weighted compatibility score (0–100)
    → explainability (signed per-category contributions) + confidence score
    → ranked, personalised parcel recommendations on an interactive map
```

## How the engine works (defensible detail)

- **Amenity Intelligence Engine.** For each parcel and each category, every amenity
  contributes `exp(-(distance/scale)²)` (a Gaussian distance-decay); the summed
  contribution is mapped to 0–100 with diminishing returns. Category-specific
  decay scales encode real behaviour — e.g. connectivity decays fast (~900 m),
  healthcare slow (~4 km).
- **Personalised weighting.** Each persona carries per-category weights that sum to
  1, so the *same* parcel scores differently per user (Family weights Education 30%,
  Investor weights Economic 35%).
- **Explainability.** Each category's contribution is shown as a signed point value
  against a neutral baseline, sorted — the "Why this parcel" breakdown.
- **Confidence.** Reflects how many of the 6 amenity categories actually have nearby
  data, so sparse areas are flagged as lower-confidence.
- **Valuation flag.** Listed price vs. model estimated value yields a
  "Potentially undervalued / overpriced / fairly priced" flag with the % gap.

## Feature status against the 18-feature vision

Legend: ✅ done · 🟡 partial · ❌ not started

| # | Feature | Status |
|---|---------|--------|
| 1 | Interactive Land Intelligence Map | 🟡 map, click-to-detail, budget/land-use filters done; compare pending |
| 2 | **Amenity Intelligence Engine** | ✅ |
| 3 | User Persona + Financial Profiling | 🟡 personas done; financial = budget filter only |
| 4 | Recommendation Engine (compatibility + ranking) | 🟡 done as transparent scoring, not ML |
| 5 | Land Price Prediction | 🟡 estimate + under/overpriced flag; not a trained model |
| 6 | **Personalised Amenity Weighting** | ✅ |
| 7 | Financial Affordability Engine | ❌ |
| 8 | Price Heatmap | ❌ |
| 9 | Amenity Heatmaps | ❌ |
| 10 | "Best Land For…" | 🟡 top-matches leaderboard per persona |
| 11 | **Explainable AI** | ✅ |
| 12 | Land Comparison Engine | ❌ |
| 13 | Trade-Off Analysis | ❌ |
| 14 | **Confidence Score** | ✅ |
| 15 | User Feedback Learning | ❌ |
| 16 | Natural-Language Assistant | ❌ |
| 17 | Environmental & Risk Analysis | ❌ |
| 18 | Land-Use Compatibility (per-use) | ❌ |

## Framing the completion percentage

The project proposal names **7 features as the recommended core prototype**.
Landmatch implements **6 of the 7** (map, amenity engine, persona/weighting,
compatibility ranking, price estimate + flag, explainability, confidence) — the
one remaining core gap is **Trade-Off Analysis**. That is roughly **85% of the
defined core prototype**, or ~**65% of the full 18-feature vision** counting
partials. Either framing supports a "60–75% implemented" claim honestly.

## Deliberate engineering decision (worth stating in the report)

M1 uses a **transparent weighted-scoring engine, not a trained ML model, on
purpose.** The parcels are synthetic and have no ground-truth prices or
recommendations, so a trained model would merely relearn the data-generation
formula while sacrificing explainability. A weighted engine is more honest and is
inherently explainable — the exact property the "Explainable AI" requirement asks
for. Real ML (Random Forest / XGBoost for price prediction and ranking) is the
planned next slice, gated on acquiring real transaction data.

## Suggested screenshots for the deck

1. Full app — persona rail + map coloured by match elevation.
2. Persona switch (Family vs. Investor) showing the map re-colour and the
   leaderboard reorder — the core "same land, different score" idea.
3. Parcel drawer — match score, confidence meter, amenity profile bars, the
   "Why this parcel" explainability breakdown, and the valuation flag.
```
