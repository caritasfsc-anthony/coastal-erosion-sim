// Shared earthy palette (linear-space RGB) for terrain + headland vertex colours.
import { Color } from 'three';
import { clamp, lerp, noise2, smoothstep } from './noise';

const c = (hex: number) => new Color(hex);
export const PAL = {
  rockA: c(0x8f7c66), rockB: c(0x6c5d4f), rockC: c(0xb3a184), rockWet: c(0x3d362f),
  algae: c(0x3e4a33), grass: c(0x56703c), grassDry: c(0x9a8f5c), shrub: c(0x31492a),
  sand: c(0xdcc69c), sandWet: c(0xa38c6b), sandDeep: c(0x7f7a63),
  plat: c(0x8a8070), platWet: c(0x5c554b),
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
  const g = smoothstep(0.62, 0.86, ny) * smoothstep(3, 7, y);
  if (g > 0) {
    const dry = clamp(0.5 + 0.5 * noise2(x * 0.05, z * 0.05));
    const gr: RGB = [0, 0, 0];
    mix(gr, PAL.grass, PAL.grassDry, dry * 0.75);
    const sh = smoothstep(0.05, 0.55, noise2(x * 0.028 + 7, z * 0.028)) * 0.8;
    gr[0] = lerp(gr[0], PAL.shrub.r, sh); gr[1] = lerp(gr[1], PAL.shrub.g, sh); gr[2] = lerp(gr[2], PAL.shrub.b, sh);
    out[0] = lerp(out[0], gr[0], g); out[1] = lerp(out[1], gr[1], g); out[2] = lerp(out[2], gr[2], g);
  }
  const wet = smoothstep(2.4, 0.3, y);
  mixInto(out, PAL.rockWet, wet * 0.85);
  mixInto(out, PAL.algae, smoothstep(1.2, 0.2, y) * smoothstep(-1.5, 0, y) * 0.5);
  const v = 0.92 + 0.16 * noise2(x * 0.7, z * 0.7 + y);
  out[0] *= v; out[1] *= v; out[2] *= v;
  return out;
}
