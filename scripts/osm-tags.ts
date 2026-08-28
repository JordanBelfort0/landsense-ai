import { Category } from '../lib/types';

type Rule = {
  match: (t: Record<string, string>) => boolean;
  category: Category;
  subtype: string | ((t: Record<string, string>) => string);
};

const RULES: Rule[] = [
  { match: (t) => ['school', 'college', 'university'].includes(t.amenity), category: 'education', subtype: 'school' },
  { match: (t) => t.office === 'educational_institution', category: 'education', subtype: 'institute' },
  { match: (t) => ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(t.amenity), category: 'healthcare', subtype: 'health' },
  { match: (t) => t.railway === 'station', category: 'connectivity', subtype: (t) => t.station === 'subway' ? 'metro' : 'rail' },
  { match: (t) => t.highway === 'bus_stop', category: 'connectivity', subtype: 'bus_stop' },
  { match: (t) => ['trunk', 'primary'].includes(t.highway), category: 'connectivity', subtype: 'major_road' },
  { match: (t) => ['park', 'fitness_centre'].includes(t.leisure), category: 'lifestyle', subtype: (t) => t.leisure },
  { match: (t) => t.shop === 'mall', category: 'lifestyle', subtype: 'mall' },
  { match: (t) => ['restaurant', 'cinema'].includes(t.amenity), category: 'lifestyle', subtype: (t) => t.amenity },
  { match: (t) => t.office === 'it' || t.office === 'company', category: 'economic', subtype: 'office' },
  { match: (t) => t.landuse === 'commercial', category: 'economic', subtype: 'commercial' },
  { match: (t) => t.amenity === 'marketplace', category: 'economic', subtype: 'market' },
  { match: (t) => t.amenity === 'bank', category: 'infrastructure', subtype: 'bank' },
  { match: (t) => t.man_made === 'water_works', category: 'infrastructure', subtype: 'water' },
  { match: (t) => !!t.power, category: 'infrastructure', subtype: 'power' },
];

export function classify(tags: Record<string, string>): { category: Category; subtype: string } | null {
  for (const r of RULES) {
    if (r.match(tags)) {
      const subtype = typeof r.subtype === 'function' ? r.subtype(tags) : r.subtype;
      return { category: r.category, subtype };
    }
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
