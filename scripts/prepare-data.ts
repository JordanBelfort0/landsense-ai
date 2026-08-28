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
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LandSense/1.0 (+https://github.com/landmatch)',
        },
      });
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
