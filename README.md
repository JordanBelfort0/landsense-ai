# LandMatch AI

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
