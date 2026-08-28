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
