'use client';
import { useMemo, useState } from 'react';
import parcelsData from '@/public/data/parcels.json';
import { Parcel, Persona, CategoryScores, Category } from '@/lib/types';
import { PERSONAS, getPersona } from '@/lib/personas';
import { compatibility } from '@/lib/scoring/compatibility';
import { adjustWeight } from '@/lib/scoring/weights';
import { confidence } from '@/lib/scoring/confidence';

// public/data/parcels.json bakes `confidence` in at data-generation time
// (scripts/prepare-data.ts). Recompute it here from each parcel's own
// `scores` so the app always reflects the current confidence formula
// without needing a full data regeneration (a live Overpass fetch) just
// to pick up a scoring-logic change.
const PARCELS = (parcelsData as Parcel[]).map((p) => ({ ...p, confidence: confidence(p.scores) }));
const MAX_PRICE = Math.max(...PARCELS.map((p) => p.listedPrice));
const MAX_COMPARE = 3;

export function useLandStore() {
  const [personaId, setPersonaIdRaw] = useState<Persona['id']>('family');
  // null = using the preset's own weights untouched; set once a slider moves.
  const [customWeights, setCustomWeights] = useState<CategoryScores | null>(null);
  const [budget, setBudget] = useState(MAX_PRICE);
  const [landUse, setLandUse] = useState<'all' | Parcel['landUse']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const isComparing = (id: string) => compareIds.includes(id);

  // Toggle a parcel in the compare set; adds are capped at MAX_COMPARE.
  const toggleCompare = (id: string) =>
    setCompareIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length >= MAX_COMPARE
          ? ids
          : [...ids, id],
    );

  const clearCompare = () => {
    setCompareIds([]);
    setCompareOpen(false);
  };

  // Picking a preset always snaps back to that preset's exact weights —
  // the 4 archetypes themselves (lib/personas.ts) are never edited.
  const setPersonaId = (id: Persona['id']) => {
    setPersonaIdRaw(id);
    setCustomWeights(null);
  };

  const basePersona = getPersona(personaId);
  const isCustom = customWeights !== null;
  const activeWeights = customWeights ?? basePersona.weights;

  // Dragging a slider moves off the preset into "Custom" — every consumer
  // (map, drawer, compare) reads this `persona`, so nothing else needs to
  // know whether its weights came from a preset or from the sliders.
  // Memoized so `ranked` below doesn't re-sort 300 parcels every render.
  const persona: Persona = useMemo(
    () => (isCustom ? { ...basePersona, label: 'Custom', weights: activeWeights } : basePersona),
    [isCustom, basePersona, activeWeights],
  );

  const setWeight = (category: Category, value: number) =>
    setCustomWeights(adjustWeight(activeWeights, category, value));

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
    parcels: PARCELS, personas: PERSONAS, persona, basePersona,
    personaId, setPersonaId, budget, setBudget, maxPrice: MAX_PRICE,
    landUse, setLandUse, selectedId, setSelectedId, ranked, visible,
    compareIds, isComparing, toggleCompare, clearCompare, maxCompare: MAX_COMPARE,
    compareOpen, setCompareOpen,
    isCustom, activeWeights, setWeight,
  };
}
