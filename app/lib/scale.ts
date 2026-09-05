/**
 * The signature of the design: compatibility read as terrain elevation.
 * A single ramp — deep slate-teal lowland → moss → ochre → summit gold —
 * drives every score surface (map markers, amenity bars, rank markers) so a
 * high score literally reads as "high ground." Colorblind-safer than red→green.
 */
const RAMP: Array<[number, [number, number, number]]> = [
  [0.0, [0x33, 0x47, 0x5a]], // lowland slate
  [0.3, [0x2f, 0x73, 0x72]], // teal
  [0.55, [0x5e, 0x94, 0x5f]], // moss
  [0.8, [0xc0, 0x92, 0x40]], // ochre
  [1.0, [0xe7, 0xb8, 0x4b]], // summit gold
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Map a 0–100 score to a terrain-elevation color. */
export function elevationColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 100));
  for (let i = 1; i < RAMP.length; i++) {
    const [p1, c1] = RAMP[i];
    if (t <= p1) {
      const [p0, c0] = RAMP[i - 1];
      const k = (t - p0) / (p1 - p0);
      return `rgb(${lerp(c0[0], c1[0], k)}, ${lerp(c0[1], c1[1], k)}, ${lerp(c0[2], c1[2], k)})`;
    }
  }
  const [, last] = RAMP[RAMP.length - 1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/** A darker edge of the same hue, for marker strokes / bar tracks. */
export function elevationStroke(v: number): string {
  const t = Math.max(0, Math.min(1, v / 100));
  for (let i = 1; i < RAMP.length; i++) {
    const [p1, c1] = RAMP[i];
    if (t <= p1) {
      const [p0, c0] = RAMP[i - 1];
      const k = (t - p0) / (p1 - p0);
      const shade = 0.72;
      return `rgb(${Math.round(lerp(c0[0], c1[0], k) * shade)}, ${Math.round(
        lerp(c0[1], c1[1], k) * shade,
      )}, ${Math.round(lerp(c0[2], c1[2], k) * shade)})`;
    }
  }
  return '#b98f34';
}
