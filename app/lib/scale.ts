/**
 * Compatibility read as a fitness signal: a traffic-light ramp where a high
 * score reads as "good" the way people already expect — red poor → amber →
 * yellow → green peak. One ramp drives every score surface (map markers,
 * amenity bars, rank markers) so green consistently means best fit.
 */
const RAMP: Array<[number, [number, number, number]]> = [
  [0.0, [0xc0, 0x50, 0x3a]], // poor — red
  [0.3, [0xce, 0x8a, 0x34]], // amber
  [0.55, [0xc9, 0xb2, 0x3c]], // yellow
  [0.78, [0x8f, 0xa8, 0x47]], // yellow-green
  [1.0, [0x3e, 0x8e, 0x4f]], // peak — green
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
  return '#2d6639';
}
