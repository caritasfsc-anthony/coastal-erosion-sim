// Pure world model: every landform is a function of the erosion stage s ∈ [0, 1].
import { bump, clamp, fbm2, lerp, noise2, smoothstep } from './noise';

export const H = 20; // mainland cliff height
export const HX = 20; // headland axis (x)
export const GX = 96; // geo (海蝕隙) x position
export const ISLAND = { x: -128, z: 98, r: 21 };
export const TOMB_X = -128;

export const INNER = { min: -160, size: 320, seg: 320 }; // detailed terrain region (1 unit / cell)

export const MAT_LAND = 0, MAT_SAND = 1, MAT_PLAT = 2, MAT_SEABED = 3;

/** Headland is split into joint-bounded blocks; each runs cave → arch → stack → stump with a delay. */
export interface Segment { a: number; b: number; d: number; }
export const SEGMENTS: Segment[] = [
  { a: 80, b: 100, d: 0.0 },
  { a: 62, b: 80, d: 0.3 },
  { a: 44, b: 62, d: 0.55 },
  { a: 28, b: 44, d: 0.8 },
];
export const HEAD_BODY_END = 28;

export const phase = (s: number, k: number): number => clamp(s - SEGMENTS[k].d);
export const caveZ = (k: number): number => SEGMENTS[k].a + 6;

export function headHalfWidth(z: number): number {
  return lerp(16, 10.5, clamp((z - 10) / 90)) + 1.4 * noise2(z * 0.07, 3.3);
}
export function headTop(x: number, z: number): number {
  return H - 0.045 * Math.max(0, z - 10) + 1.1 * fbm2(x * 0.045 + 3.1, z * 0.045, 3);
}

/** Cave/arch geometry parameters for a segment phase p. */
export function caveParams(p: number, w: number) {
  const cp = smoothstep(0.08, 0.38, p);
  const ap = smoothstep(0.38, 0.58, p);
  return {
    cp, ap,
    rx: 0.5 + w * 1.12 * cp + 3 * ap,
    ry: lerp(1.2, 5.2, cp) + 6.5 * ap,
    rz: lerp(1.0, 3.0, cp) + 1.6 * ap,
    collapse: smoothstep(0.56, 0.66, p),
    stack: smoothstep(0.62, 0.85, p),
    stump: smoothstep(0.85, 1.0, p),
  };
}

export function stackGeom(k: number, p: number) {
  const seg = SEGMENTS[k];
  const zc = caveZ(k);
  const cv = caveParams(p, headHalfWidth(zc));
  const z0 = zc + cv.rz;
  const zEnd = seg.b - 3.5 * smoothstep(0.6, 1, p);
  const zs = (z0 + zEnd) * 0.5;
  const r0 = Math.min(headHalfWidth(zs), (zEnd - z0) * 0.5);
  const r = lerp(r0, 4.6, smoothstep(0.65, 0.97, p));
  return { zs, r, z0, zEnd };
}

// ---------- coastline ----------
export function coast0(x: number): number {
  let c = 8 + 3 * noise2(x * 0.035, 7.1) + 1.4 * noise2(x * 0.11, 2.3);
  c -= 46 * bump(x, -52, 50);
  c += 14 * smoothstep(-96, -118, x);
  return c;
}
export const bayW = (x: number): number => clamp(bump(x, -52, 50) * 2.2);
export const retreat = (s: number): number => 16 * s;
export const cliffLine = (x: number, s: number): number => coast0(x) - retreat(s) * (1 - bayW(x));
export const beachWidth = (s: number): number => 9 + 20 * smoothstep(0, 1, s);
export const geoLength = (s: number): number => 3 + 28 * smoothstep(0.08, 1, s);
export const tomboloCrest = (s: number): number => -3.2 + 4.6 * smoothstep(0.12, 0.88, s);

export interface Sample { h: number; m: number; }

/** Stage-independent terrain terms, cached per vertex (all the expensive noise lives here). */
export const STATIC_FIELDS = 14;
export function staticSample(x: number, z: number, out: Float32Array, o: number) {
  const c0 = coast0(x);
  const dz0 = z - c0;
  const shelter = Math.exp(-(((x - TOMB_X) / 34) ** 2)) * smoothstep(5, 30, z) * smoothstep(110, 80, z);
  const dxI = x - ISLAND.x, dzI = z - ISLAND.z;
  const ang = Math.atan2(dzI, dxI);
  const dI = Math.hypot(dxI, dzI) + 2.4 * noise2(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2);
  out[o] = c0;
  out[o + 1] = bayW(x);
  out[o + 2] = -1.5 - 11 * smoothstep(-4, 70, dz0) + 1.3 * fbm2(x * 0.02, z * 0.02, 3) + 7.5 * shelter;
  out[o + 3] = H + 5 * fbm2(x * 0.012, z * 0.012, 4) + 9 * smoothstep(-30, -160, z) * (0.5 + 0.5 * fbm2(x * 0.006 + 4, z * 0.006, 3)) + Math.max(0, -z - 160) * 0.12;
  out[o + 4] = 0.22 * noise2(x * 0.22, z * 0.22) + 0.12 * noise2(x * 0.9, z * 0.9);
  out[o + 5] = 0.15 * noise2(x * 0.3, z * 0.3);
  out[o + 6] = Math.abs(x - HX) < 40 && z < 12 && z > -60 ? headTop(x, z) : 0;
  out[o + 7] = 0.22 * noise2(x * 0.25, z * 0.25) + 0.1 * noise2(x * 0.8, z * 0.8);
  out[o + 8] = GX + 1.4 * Math.sin(z * 0.19) + 0.6 * noise2(z * 0.3, 4.4);
  out[o + 9] = -1.6 + 0.3 * noise2(x * 0.5, z * 0.5);
  out[o + 10] = dI;
  out[o + 11] = dI < ISLAND.r + 16 ? 15 + 3 * fbm2(x * 0.05, z * 0.05, 3) - dI * 0.12 : 0;
  out[o + 12] = 0.2 * noise2(x * 0.3, z * 0.3);
  out[o + 13] = 0.12 * noise2(x * 0.4, z * 0.4);
}

/** Per-stage constants shared by all vertices. */
export function stageConsts(s: number) {
  const rI = ISLAND.r - 2.5 * s;
  return {
    s, R: retreat(s), wb: beachWidth(s), clG: cliffLine(GX, s), L: geoLength(s), rI,
    tz0: cliffLine(TOMB_X, s) - 3, tz1: ISLAND.z - rI + 3, crest: tomboloCrest(s),
  };
}
export type StageConsts = ReturnType<typeof stageConsts>;

/** Height + material of the heightfield terrain at (x, z) for stage s (cheap: arithmetic only). */
export function terrainSample(x: number, z: number, S: Float32Array, o: number, K: StageConsts, out: Sample): Sample {
  const s = K.s;
  const c0 = S[o], bw = S[o + 1], seabed = S[o + 2];
  const cl = c0 - K.R * (1 - bw);
  const dIn = cl - z;
  let h: number, m: number;

  if (dIn > 0) {
    const hills = S[o + 3];
    const cliffH = hills * smoothstep(-0.2, 1.4, dIn);
    const bayLand = lerp(2.6, hills, smoothstep(2, 40, dIn));
    h = lerp(cliffH, bayLand, bw);
    m = MAT_LAND;
  } else {
    const dz = -dIn;
    const platW = c0 + 6 - cl;
    const hPlat = 0.62 - 0.03 * dz + S[o + 4];
    const pEdge = smoothstep(platW, platW + 10, dz);
    const hRock = lerp(hPlat, seabed, pEdge);
    const hBeach = 2.6 - 4.6 * (dz / K.wb) + S[o + 5];
    const hb = lerp(hBeach, seabed, smoothstep(K.wb, K.wb + 16, dz));
    h = lerp(hRock, hb, bw);
    if (bw > 0.5) m = h > -2.6 ? MAT_SAND : MAT_SEABED;
    else m = pEdge < 0.55 && h > -1.2 ? MAT_PLAT : MAT_SEABED;
  }

  // --- headland root + surrounding wave-cut platform ---
  const ax = Math.abs(x - HX);
  if (z > -60 && z < 120 && ax < 40) {
    const w = headHalfWidth(clamp(z, 10, 104));
    if (z < 11.6) {
      const shrink = smoothstep(8.6, 10.6, z);
      const top = (S[o + 6] - shrink * 0.9) * smoothstep(w - shrink * 1.1 + 0.2, w - shrink * 1.1 - 1.2, ax);
      if (top > h) { h = top; m = MAT_LAND; }
    }
    if (z > 8) {
      const outD = Math.max(0, ax - w) + Math.max(0, z - 101);
      const hp = 0.55 - 0.04 * outD + S[o + 7] - 12 * smoothstep(2.5 + 5 * s, 9 + 8 * s, outD + 9 * S[o + 4]);
      if (hp > h) { h = hp; m = hp > -1.2 ? MAT_PLAT : MAT_SEABED; }
    }
  }

  // --- geo (海蝕隙): a narrow cleft cut along a joint ---
  if (z > K.clG - K.L - 3 && z < K.clG + 4) {
    const t = clamp((K.clG - z) / K.L);
    const hw = lerp(2.7, 0.9, t);
    const dx = Math.abs(x - S[o + 8]);
    if (dx < hw + 1.3) {
      const k = smoothstep(hw + 1.3, hw, dx) * smoothstep(K.clG - K.L - 1.5, K.clG - K.L + 1.5, z);
      const floor = S[o + 9];
      if (floor < h) { h = lerp(h, floor, k); if (k > 0.5) m = MAT_SEABED; }
    }
  }

  // --- offshore island ---
  const dI = S[o + 10], rI = K.rI;
  if (dI < rI + 16) {
    const hI = S[o + 11] * smoothstep(rI + 0.5, rI - 1.2, dI);
    if (hI > h) { h = hI; m = MAT_LAND; }
    const ring = 0.5 - 0.06 * (dI - rI) + S[o + 12] - 10 * smoothstep(3 + 5 * s, 9 + 6 * s, dI - rI);
    if (dI > rI - 1 && ring > h) { h = ring; m = ring > -1.2 ? MAT_PLAT : MAT_SEABED; }
  }

  // --- tombolo (連島沙洲) ---
  const t = (z - K.tz0) / (K.tz1 - K.tz0);
  if (t > -0.15 && t < 1.15) {
    const tc = clamp(t);
    const cx = TOMB_X + 5 * Math.sin(Math.PI * tc);
    const hw = 5.5 + 15 * Math.pow(Math.abs(2 * tc - 1), 3);
    const dx = (x - cx) / hw;
    const ht = K.crest - 3.2 * dx * dx + S[o + 13];
    if (ht > h) { h = ht; m = ht > -2.8 ? MAT_SAND : MAT_SEABED; }
  }

  out.h = h; out.m = m;
  return out;
}
