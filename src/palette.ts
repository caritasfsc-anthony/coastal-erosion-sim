// Shared earthy palette (linear-space RGB) for terrain + headland vertex colours.
import { Color } from 'three';
import { lerp, noise2, smoothstep } from './noise';

const c = (hex: number) => new Color(hex);
export const PAL = {
  rockA: c(0x8f7c66), rockB: c(0x6c5d4f), rockC: c(0xb3a184), rockWet: c(0x3d362f),
  algae: c(0x3e4a33), grass: c(0x56703c), grassDry: c(0x9a8f5c), shrub: c(0x31492a),
  sand: c(0xe2cda3), sandWet: c(0xb0926e), sandDeep: c(0x7f7a63),
  plat: c(0xb0a898), platWet: c(0x6e6558),
  seabed: c(0x3f514d), seabedShallow: c(0x7c7a62),
};

export type RGB = [number, number, number];

function mix(out: RGB, a: Color, b: Color, t: number) {
  out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t);
}
function mixInto(out: RGB, b: Color, t: number) {
  out[0] = lerp(out[0], b.r, t); out[1] = lerp(out[1], b.g, t); out[2] = lerp(out[2], b.b, t);
}

/** Layered sedimentary rock with grass caps and a dark wet / algae band at the waterline. */
export function rockColor(out: RGB, x: number, y: number, z: number, ny: number): RGB {
  const n = noise2(x * 0.08 + z * 0.05, y * 0.6);
  const band = 0.5 + 0.5 * Math.sin(y * 1.25 + n * 1.6);
  mix(out, PAL.rockA, PAL.rockB, band);
  const light = smoothstep(0.82, 0.95, Math.sin(y * 0.52 + 1.3 + n * 0.4));
  mixInto(out, PAL.rockC, light * 0.7);
  // clean rock teaching look — no vegetation canopy
  const g = smoothstep(0.72, 0.95, ny) * smoothstep(8, 14, y) * 0.18;
  if (g > 0) mixInto(out, PAL.rockC, g);
  const wet = smoothstep(2.4, 0.3, y);
  mixInto(out, PAL.rockWet, wet * 0.85);
  mixInto(out, PAL.algae, smoothstep(1.2, 0.2, y) * smoothstep(-1.5, 0, y) * 0.5);
  const v = 0.92 + 0.16 * noise2(x * 0.7, z * 0.7 + y);
  out[0] *= v; out[1] *= v; out[2] *= v;
  return out;
}
