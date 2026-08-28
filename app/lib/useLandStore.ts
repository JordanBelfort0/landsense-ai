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
