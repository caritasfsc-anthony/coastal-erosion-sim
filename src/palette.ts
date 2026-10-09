// Shared earthy palette (linear-space RGB) for terrain + headland vertex colours.
import { Color } from 'three';
import { lerp, noise2, smoothstep } from './noise';

const c = (hex: number) => new Color(hex);
export const PAL = {
  // Cheung Chau volcanic / granite-like: warm ochre, cool grey facets, pale strata
  rockA: c(0x9a8570), rockB: c(0x5e5348), rockC: c(0xc4b39a), rockWet: c(0x2e2924),
  rockDark: c(0x3a342e), rockLite: c(0xd2c4ab),
  algae: c(0x3a4a32), grass: c(0x56703c), grassDry: c(0x9a8f5c), shrub: c(0x31492a),
  sand: c(0xe8d4ae), sandWet: c(0xa88868), sandDeep: c(0x6f6a55),
  plat: c(0xb8aea0), platWet: c(0x655c50),
  seabed: c(0x354844), seabedShallow: c(0x6e6c56),
};

export type RGB = [number, number, number];

function mix(out: RGB, a: Color, b: Color, t: number) {
  out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t);
}
function mixInto(out: RGB, b: Color, t: number) {
  out[0] = lerp(out[0], b.r, t); out[1] = lerp(out[1], b.g, t); out[2] = lerp(out[2], b.b, t);
}

/** Layered rock with strong strata bands, joint shadows, and a dark wet / algae splash zone. */
export function rockColor(out: RGB, x: number, y: number, z: number, ny: number): RGB {
  const n = noise2(x * 0.07 + z * 0.04, y * 0.55);
  const n2 = noise2(x * 0.35, z * 0.35 + y * 0.2);
  const steep = smoothstep(0.7, 0.18, ny);
  // strong horizontal strata — especially readable on cliff faces
  const band = 0.5 + 0.5 * Math.sin(y * 1.9 + n * 2.2);
  mix(out, PAL.rockA, PAL.rockB, band * 0.92 + 0.06 * n2);
  const light = smoothstep(0.7, 0.97, Math.sin(y * 0.9 + 1.1 + n * 0.55));
  mixInto(out, PAL.rockLite, light * (0.4 + 0.4 * steep));
  // cool grey granite facets on steep faces
  mixInto(out, PAL.rockDark, steep * (0.25 + 0.2 * Math.abs(n2)));
  // subtle top highlight (no vegetation)
  const cap = smoothstep(0.78, 0.98, ny) * smoothstep(14, 26, y) * 0.2;
  if (cap > 0) mixInto(out, PAL.rockC, cap);
  // wet splash zone — darker + algae
  const wet = smoothstep(3.4, 0.1, y);
  mixInto(out, PAL.rockWet, wet * 0.92);
  mixInto(out, PAL.algae, smoothstep(1.7, 0.05, y) * smoothstep(-1.8, 0.2, y) * 0.58);
  const v = 0.88 + 0.2 * noise2(x * 0.9, z * 0.9 + y * 0.35);
  out[0] *= v; out[1] *= v; out[2] *= v;
  return out;
}
