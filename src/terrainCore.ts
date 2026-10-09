// Pure terrain computation (runs inside the build worker).
import { GEO_SUNK, HX, INNER, MAT_LAND, MAT_PLAT, MAT_SAND, PAL_JOINT, STATIC_FIELDS, geoX, jointTrace, stageConsts, staticSample, terrainSample, type Sample } from './world';
import { PAL, rockColor, type RGB } from './palette';
import { lerp, noise2, smoothstep } from './noise';

export interface GridSpec { min: number; size: number; seg: number; tuck: boolean; }
export const INNER_GRID: GridSpec = { min: INNER.min, size: INNER.size, seg: INNER.seg, tuck: false };
export const OUTER_GRID: GridSpec = { min: -720, size: 1440, seg: 360, tuck: true };

export interface GridResult { heights: Float32Array; normals: Float32Array; colors: Float32Array; }

/** Rock colour plus the dark trace of the joint the geo follows (shared with the geo voxel mesh). */
export function rockWithJoint(out: RGB, x: number, y: number, z: number, ny: number, gx = geoX(z)): RGB {
  rockColor(out, x, y, z, ny);
  const j = jointTrace(x, z, gx);
  if (j > 0) { const k = j * 0.72; out[0] = lerp(out[0], PAL_JOINT[0], k); out[1] = lerp(out[1], PAL_JOINT[1], k); out[2] = lerp(out[2], PAL_JOINT[2], k); }
  return out;
}

export function colorFor(out: RGB, x: number, z: number, h: number, m: number, ny: number): RGB {
  if (m === MAT_LAND || ny < 0.55) return rockWithJoint(out, x, h, z, ny);
  const n = 0.5 + 0.5 * noise2(x * 0.15, z * 0.15);
  let a, b, t: number;
  if (m === MAT_SAND) {
    // Fine wave-accreted grain + subtle swash ripples (not a flat tiled slab)
    const grain = 0.5 + 0.5 * noise2(x * 0.7, z * 0.7);
    const grain2 = 0.5 + 0.5 * noise2(x * 1.8 + 2.1, z * 1.6);
    const ripple = 0.5 + 0.5 * Math.sin(x * 1.15 + z * 0.4 + noise2(x * 0.22, z * 0.2) * 2.4);
    if (h > 0.55) {
      a = PAL.sandWet; b = PAL.sand;
      t = smoothstep(0.55, 1.9, h) * (0.72 + 0.18 * grain + 0.1 * ripple);
    } else {
      a = PAL.sandDeep; b = PAL.sandWet;
      t = smoothstep(-2.6, 0.55, h) * (0.68 + 0.2 * grain + 0.12 * grain2);
    }
    out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t);
    // dry crest highlight + wet swash band
    const dry = smoothstep(0.4, 1.5, h) * (0.08 + 0.1 * grain2);
    out[0] = Math.min(1, out[0] + dry * 0.12); out[1] = Math.min(1, out[1] + dry * 0.1); out[2] = Math.min(1, out[2] + dry * 0.07);
    const swash = smoothstep(0.55, -0.05, h) * smoothstep(-1.6, 0.15, h) * (0.12 + 0.1 * ripple);
    out[0] = lerp(out[0], PAL.sandWet.r, swash); out[1] = lerp(out[1], PAL.sandWet.g, swash); out[2] = lerp(out[2], PAL.sandWet.b, swash);
    return out;
  } else if (m === MAT_PLAT) {
    a = PAL.platWet; b = PAL.plat; t = smoothstep(-0.5, 0.35, h) * (0.55 + 0.45 * n);
    // brighter flat apron so students can tell platform from cliff rock
    out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t);
    const al = smoothstep(0.4, 0.85, noise2(x * 0.45, z * 0.45)) * 0.28;
    out[0] = lerp(out[0], PAL.algae.r, al); out[1] = lerp(out[1], PAL.algae.g, al); out[2] = lerp(out[2], PAL.algae.b, al);
    return out;
  } else {
    a = PAL.seabed; b = PAL.seabedShallow; t = smoothstep(-9, -1.5, h) * (0.7 + 0.3 * n);
  }
  out[0] = lerp(a.r, b.r, t); out[1] = lerp(a.g, b.g, t); out[2] = lerp(a.b, b.b, t);
  return out;
}

class Grid {
  readonly n: number;
  readonly step: number;
  readonly stat: Float32Array;
  readonly heights: Float32Array;
  readonly mats: Uint8Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  readonly raw: Float32Array;   // heights before the geo cut-out
  readonly rawM: Uint8Array;
  private prevH: Float32Array;
  private prevM: Uint8Array;
  constructor(readonly spec: GridSpec) {
    this.n = spec.seg + 1;
    this.step = spec.size / spec.seg;
    const N = this.n * this.n;
    this.stat = new Float32Array(N * STATIC_FIELDS);
    for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++) {
      staticSample(spec.min + i * this.step, spec.min + j * this.step, this.stat, (j * this.n + i) * STATIC_FIELDS);
    }
    this.heights = new Float32Array(N);
    this.mats = new Uint8Array(N);
    this.normals = new Float32Array(N * 3);
    this.colors = new Float32Array(N * 3);
    this.raw = new Float32Array(N);
    this.rawM = new Uint8Array(N);
    this.prevH = new Float32Array(N).fill(NaN);
    this.prevM = new Uint8Array(N).fill(255);
  }

  build(s: number, waveDir = 180): GridResult {
    const { n, step, spec, heights: hs, mats: ms } = this;
    const K = stageConsts(s, waveDir);
    const smp: Sample = { h: 0, m: 0 };
    const lo = INNER.min + 1, hi = INNER.min + INNER.size - 1;
    for (let j = 0; j < n; j++) {
      const z = spec.min + j * step;
      for (let i = 0; i < n; i++) {
        const x = spec.min + i * step;
        const v = j * n + i;
        terrainSample(x, z, this.stat, v * STATIC_FIELDS, K, smp);
        let h = smp.h;
        if (spec.tuck && x > lo && x < hi && z > lo && z < hi) h -= 3;
        hs[v] = h; ms[v] = smp.m;
        this.raw[v] = smp.raw!; this.rawM[v] = smp.rawM!;
      }
    }
    const NA = this.normals, CA = this.colors;
    const rgb: RGB = [0, 0, 0];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = j * n + i;
      // normals from the un-cut surface, so ground beside the geo cut-out is not shaded as a slope
      const R = this.raw;
      const hl = R[j * n + Math.max(0, i - 1)], hr = R[j * n + Math.min(n - 1, i + 1)];
      const hd = R[Math.max(0, j - 1) * n + i], hu = R[Math.min(n - 1, j + 1) * n + i];
      const nx = hl - hr, nz = hd - hu, ny = 2 * step;
      const len = Math.hypot(nx, ny, nz);
      const nyn = ny / len;
      const changed = Math.abs(NA[v * 3 + 1] - nyn) > 1e-3 || !(Math.abs(hs[v] - this.prevH[v]) < 1e-3) || ms[v] !== this.prevM[v];
      NA[v * 3] = nx / len; NA[v * 3 + 1] = nyn; NA[v * 3 + 2] = nz / len;
      if (changed) {
        colorFor(rgb, spec.min + i * step, spec.min + j * step, hs[v], ms[v], nyn);
        CA[v * 3] = rgb[0]; CA[v * 3 + 1] = rgb[1]; CA[v * 3 + 2] = rgb[2];
        this.prevH[v] = hs[v]; this.prevM[v] = ms[v];
      }
    }
    return { heights: hs.slice(), normals: NA.slice(), colors: CA.slice() };
  }
}

export class TerrainCore {
  readonly inner = new Grid(INNER_GRID);
  readonly outer = new Grid(OUTER_GRID);

  buildGrids(s: number, waveDir = 180) {
    return { inner: this.inner.build(s, waveDir), outer: this.outer.build(s, waveDir) };
  }

  /** Height of the original (pre geo cut-out) inner heightfield surface, interpolated exactly like its triangles. */
  rawAt(x: number, z: number): number {
    const g = this.inner, n = g.n;
    const fx = x - INNER.min, fz = z - INNER.min;
    const i = Math.max(0, Math.min(n - 2, Math.floor(fx))), j = Math.max(0, Math.min(n - 2, Math.floor(fz)));
    const u = fx - i, v = fz - j;
    const a = g.raw[j * n + i], b = g.raw[j * n + i + 1], c = g.raw[(j + 1) * n + i], d = g.raw[(j + 1) * n + i + 1];
    return u + v < 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
  }
  rawMatAt(x: number, z: number): number {
    const n = this.inner.n;
    const i = Math.max(0, Math.min(n - 1, Math.round(x - INNER.min))), j = Math.max(0, Math.min(n - 1, Math.round(z - INNER.min)));
    return this.inner.rawM[j * n + i];
  }

  /** Land-height texture used by the water shader (depth tint, surf foam, wave attenuation). */
  heightTexture(inner: GridResult, solidAt: (x: number, z: number) => boolean, geoTex: (x: number, z: number, raw: number) => number) {
    const n = this.inner.n;
    const tex = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = j * n + i;
      let h = inner.heights[v];
      const x = INNER.min + i, z = INNER.min + j;
      if (h <= GEO_SUNK + 0.01) {
        // inside the geo: water-filled cleft reads as a shallow, foaming surge channel
        h = geoTex(x, z, this.inner.raw[v]);
      } else if (h < 3) {
        if (x > HX - 20 && x < HX + 20 && z > 85 && z < 152 && solidAt(x, z)) h = 4;
      }
      // Bias dry/wet sand up in the water depth map so foam never "washes through" the tombolo
      if (this.inner.mats[v] === MAT_SAND && h > -1.4) h = Math.max(h, 0.85 + Math.max(0, h) * 0.35);
      const e = Math.max(0, Math.min(255, Math.round(((h + 28) / 72) * 255)));
      tex[v * 4] = e; tex[v * 4 + 1] = e; tex[v * 4 + 2] = e; tex[v * 4 + 3] = 255;
    }
    return tex;
  }
}
