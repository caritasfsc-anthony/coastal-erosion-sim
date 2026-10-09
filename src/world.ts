// Pure world model: Cheung Chau (長洲) teaching silhouette.
// Every landform is a function of the erosion stage s ∈ [0, 1].
// +X = east, +Z = north. Simplified pedagogical model inspired by 3d.map.gov.hk — not survey data.
import { bump, clamp, fbm2, lerp, noise2, smoothstep } from './noise';

export const H = 20; // typical hill / cliff height scale
/** NE rocky tip axis (海蝕洞→拱→柱 sequence). */
export const HX = 28;
/** Primary 海蝕隙 on the north rocky coast. */
export const GX = -18;
/** Legacy alias — island is now the whole dumbbell; kept for vegetation sampling. */
export const ISLAND = { x: -8, z: 95, r: 42 };
export const TOMB_X = 2; // tombolo centre line (x)

export const INNER = { min: -180, size: 360, seg: 360 }; // detailed terrain (1 unit / cell)

export const MAT_LAND = 0, MAT_SAND = 1, MAT_PLAT = 2, MAT_SEABED = 3;

/** NE tip headland blocks (joint-bounded); each runs cave → arch → stack → stump. */
export interface Segment { a: number; b: number; d: number; }
export const SEGMENTS: Segment[] = [
  { a: 128, b: 148, d: 0.0 },
  { a: 112, b: 128, d: 0.3 },
  { a: 98, b: 112, d: 0.55 },
  { a: 86, b: 98, d: 0.8 },
];
export const HEAD_BODY_END = 86;

export const phase = (s: number, k: number): number => clamp(s - SEGMENTS[k].d);
export const caveZ = (k: number): number => SEGMENTS[k].a + 6;

export function headHalfWidth(z: number): number {
  return lerp(11, 7.5, clamp((z - 86) / 62)) + 1.1 * noise2(z * 0.07, 3.3);
}
export function headTop(x: number, z: number): number {
  return 16 - 0.04 * Math.max(0, z - 90) + 1.0 * fbm2(x * 0.05 + 3.1, z * 0.05, 3);
}

/** Cave/arch geometry for a segment phase p. */
export function caveParams(p: number, w: number) {
  const cp = smoothstep(0.08, 0.38, p);
  const tall = smoothstep(0.18, 0.42, p);
  const ap = smoothstep(0.38, 0.58, p);
  return {
    cp, ap,
    rx: 0.5 + w * 1.12 * cp + 3 * ap,
    ry: lerp(1.1, 5.2, tall) + 6.5 * ap,
    rz: lerp(1.0, 3.0, cp) + 1.6 * ap,
    collapse: smoothstep(0.565, 0.61, p),
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
  const r = lerp(r0, 4.2, smoothstep(0.65, 0.97, p));
  return { zs, r, z0, zEnd };
}

// ---------- Cheung Chau silhouette (dumbbell) ----------
/** South hillmass (larger) — 南氹 / south. */
export const SOUTH = { x: 6, z: -88, rx: 58, rz: 74, peak: 22 };
/** North hillmass (smaller) — rocky north tip. */
export const NORTH = { x: -6, z: 98, rx: 40, rz: 48, peak: 17 };
/** Tombolo / town neck z-range. */
export const NECK_Z0 = -22, NECK_Z1 = 48;

/** Elliptical radial distance to a hillmass (1 = rim). */
function ellDist(x: number, z: number, m: { x: number; z: number; rx: number; rz: number }): number {
  return Math.hypot((x - m.x) / m.rx, (z - m.z) / m.rz);
}

/** Soft island occupancy 0…1 (before stage-dependent retreat). */
export function islandCore(x: number, z: number): number {
  const ds = ellDist(x, z, SOUTH);
  const dn = ellDist(x, z, NORTH);
  const hills = Math.max(smoothstep(1.08, 0.72, ds), smoothstep(1.08, 0.72, dn));
  // narrow central neck (連島沙洲 footprint)
  const tn = clamp((z - NECK_Z0) / (NECK_Z1 - NECK_Z0));
  const neckW = 11 + 9 * Math.pow(Math.abs(2 * tn - 1), 2.2); // wider near hills, narrow mid
  const cx = TOMB_X + 3 * Math.sin(Math.PI * tn);
  const neck = smoothstep(neckW + 4, neckW - 1.5, Math.abs(x - cx)) * smoothstep(-0.08, 0.05, tn) * smoothstep(1.08, 0.95, tn);
  // NE rocky tip bulge for the headland root
  const tip = smoothstep(1.2, 0.55, Math.hypot((x - HX) / 14, (z - 118) / 28)) * smoothstep(85, 100, z);
  return Math.max(hills, neck * 0.95, tip);
}

/** North-facing cliff line (sea to the north / +Z). Retreat moves inland (−Z). */
export function northCoast0(x: number): number {
  const u = clamp((x - NORTH.x) / (NORTH.rx * 1.08), -1, 1);
  let z = NORTH.z + NORTH.rz * Math.sqrt(Math.max(0, 1 - u * u));
  z += 2.2 * noise2(x * 0.04, 9.1) + 1.1 * noise2(x * 0.12, 2.7);
  z += 16 * bump(x, HX, 20);
  return z;
}
export function northCliff(x: number, s: number): number {
  return northCoast0(x) - retreat(s) * (0.55 + 0.45 * smoothstep(-50, 40, x)); // more retreat on exposed east-north
}

/** South-facing cliff line at 南氹 (sea to the south / −Z). Retreat moves inland (+Z). */
export function southCoast0(x: number): number {
  const u = clamp((x - SOUTH.x) / (SOUTH.rx * 1.08), -1, 1);
  let z = SOUTH.z - SOUTH.rz * Math.sqrt(Math.max(0, 1 - u * u));
  z += 2.0 * noise2(x * 0.035, 4.4) + 1.0 * noise2(x * 0.1, 1.8);
  return z;
}
export function southCliff(x: number, s: number): number {
  return southCoast0(x) + retreat(s) * (0.7 + 0.3 * bump(x, 20, 50)); // Nam Tam / SE more active
}

/** Legacy helpers used by debris / splash on the southern teaching cliff (南氹). */
export function coast0(x: number): number { return southCoast0(x); }
export function cliffLine(x: number, s: number): number { return southCliff(x, s); }
export const bayW = (_x: number): number => 0;
export const retreat = (s: number): number => 14 * s;
export const beachWidth = (s: number): number => 10 + 18 * smoothstep(0.05, 0.9, s);

// ---------- geo (海蝕隙) — north coast, cutting inland (−Z) ----------
export const geoX = (z: number): number => GX + 0.7 * Math.sin(z * 0.14) + 0.3 * noise2(z * 0.28, 4.4);
export const geoLength = (s: number): number => 2.5 + 26 * Math.pow(smoothstep(0.04, 1, s), 0.75);
export const PAL_JOINT: [number, number, number] = [0.05, 0.045, 0.04];
export const GEO_RIN = 7, GEO_BAND = 2.8, GEO_SUNK = -6;

export function geoParams(s: number) {
  const clG = northCliff(GX, s);
  const L = geoLength(s);
  const zHead = clG - L;
  const Lr = 6 * smoothstep(0.04, 0.16, s);
  const hwMouth = 1.75 + 0.95 * smoothstep(0, 0.8, s);
  const hwHead = 1.1 + 0.45 * smoothstep(0, 1, s);
  const roofY = 4.2 + 0.8 * s;
  const br = 1.05 * smoothstep(0.14, 0.24, s);
  const bz = zHead - Lr * 0.6;
  const blow = br > 0.05 ? { x: geoX(bz), z: bz, r: br } : null;
  return { s, clG, L, zHead, Lr, hwMouth, hwHead, roofY, blow, zIn: zHead - Lr - 3.5, zSea: clG + 6 };
}
export type GeoParams = ReturnType<typeof geoParams>;

export function geoHalfWidth(z: number, P: GeoParams): number {
  const u = clamp((P.clG - z) / P.L);
  return lerp(P.hwMouth, P.hwHead, Math.pow(u, 0.9)) + Math.max(0, z - P.clG) * 0.2;
}
export function geoStripHalf(z: number, P: GeoParams): number {
  return (z < P.zHead ? P.hwHead : geoHalfWidth(z, P)) + 3.0;
}
export function geoFloor(z: number, P: GeoParams, top: number): number {
  const u = clamp((P.clG - z) / P.L);
  return lerp(lerp(-1.9, -0.8, u), top + 0.6, smoothstep(P.clG + 1, P.zSea - 1, z));
}
export function jointTrace(x: number, z: number, gx: number): number {
  const coast = northCoast0(GX);
  return smoothstep(0.75, 0.12, Math.abs(x - gx)) * smoothstep(coast - 55, coast - 48, z) * smoothstep(coast + 1.5, coast - 0.5, z);
}

/** Tombolo crest height (m). Negative = submerged sand bar. */
export const tomboloCrest = (s: number): number => -1.8 + 4.2 * smoothstep(0.0, 0.55, s);

/** 饅頭石 landmark (SE rocky shore). */
export const MANTOU = { x: 58, z: -78, r: 4.2 };

export interface Sample { h: number; m: number; raw?: number; rawM?: number; }

export const STATIC_FIELDS = 16;
export function staticSample(x: number, z: number, out: Float32Array, o: number) {
  const ds = ellDist(x, z, SOUTH);
  const dn = ellDist(x, z, NORTH);
  const core = islandCore(x, z);
  out[o] = southCoast0(x);           // 0 south coast0
  out[o + 1] = northCoast0(x);       // 1 north coast0
  out[o + 2] = core;                 // 2 island occupancy
  out[o + 3] = ds;                   // 3 south ell dist
  out[o + 4] = dn;                   // 4 north ell dist
  // hill heights
  out[o + 5] = SOUTH.peak * Math.pow(Math.max(0, 1 - ds * 0.92), 1.35) * (0.85 + 0.2 * fbm2(x * 0.02, z * 0.02, 3));
  out[o + 6] = NORTH.peak * Math.pow(Math.max(0, 1 - dn * 0.92), 1.35) * (0.85 + 0.2 * fbm2(x * 0.025 + 2, z * 0.025, 3));
  out[o + 7] = 0.22 * noise2(x * 0.22, z * 0.22) + 0.12 * noise2(x * 0.9, z * 0.9); // platform noise
  out[o + 8] = geoX(z);              // 8 geo joint x
  out[o + 9] = 0.15 * noise2(x * 0.3, z * 0.3); // beach noise
  out[o + 10] = headTop(x, z);       // 10 headland top cache
  out[o + 11] = 0.2 * noise2(x * 0.3, z * 0.3);
  out[o + 12] = 0.12 * noise2(x * 0.4, z * 0.4);
  // seabed base
  out[o + 13] = -2.2 - 10 * (1 - core) + 1.2 * fbm2(x * 0.015, z * 0.015, 3) + 4 * core;
  out[o + 14] = Math.hypot(x - MANTOU.x, z - MANTOU.z);
  out[o + 15] = 0.22 * noise2(x * 0.25, z * 0.25) + 0.1 * noise2(x * 0.8, z * 0.8);
}

export function stageConsts(s: number) {
  const G = geoParams(s);
  return {
    s, R: retreat(s), wb: beachWidth(s), geo: G, geoIn: G.zIn, geoSea: G.zSea,
    crest: tomboloCrest(s),
    nCl: (x: number) => northCliff(x, s),
    sCl: (x: number) => southCliff(x, s),
  };
}
export type StageConsts = ReturnType<typeof stageConsts>;

/** Height + material of the heightfield at (x, z) for stage s. */
export function terrainSample(x: number, z: number, S: Float32Array, o: number, K: StageConsts, out: Sample): Sample {
  const s = K.s;
  const sCoast = S[o], nCoast = S[o + 1];
  const ds = S[o + 3], dn = S[o + 4];
  const sCl = sCoast + K.R * (0.7 + 0.3 * bump(x, 20, 50));
  const nCl = nCoast - K.R * (0.55 + 0.45 * smoothstep(-50, 40, x));
  const seabed = S[o + 13];

  let h = seabed;
  let m = MAT_SEABED;

  // --- south hillmass (南氹 side) ---
  if (ds < 1.25) {
    const inland = z - sCl; // >0 = inland of south cliff
    if (inland > 0) {
      const hill = S[o + 5] * smoothstep(0, 8, inland);
      const cliffFace = S[o + 5] * 0.55 * smoothstep(-0.5, 2.5, inland);
      const landH = Math.max(hill, cliffFace);
      if (landH > h) { h = landH; m = MAT_LAND; }
    } else {
      // wave-cut platform south of cliff (Nam Tam)
      const dz = -inland;
      const platW = (sCoast - sCl) + 8 + 10 * s;
      const hPlat = 0.05 - 0.04 * dz + 0.65 * S[o + 7];
      const pEdge = smoothstep(platW, platW + 12, dz);
      const hp = lerp(hPlat, seabed, pEdge);
      if (hp > h) { h = hp; m = pEdge < 0.55 && hp > -1.2 ? MAT_PLAT : MAT_SEABED; }
    }
  }

  // --- north hillmass ---
  if (dn < 1.25) {
    const inland = nCl - z; // >0 = inland of north cliff
    if (inland > 0) {
      const hill = S[o + 6] * smoothstep(0, 7, inland);
      const cliffFace = S[o + 6] * 0.5 * smoothstep(-0.5, 2.2, inland);
      const landH = Math.max(hill, cliffFace);
      if (landH > h) { h = landH; m = MAT_LAND; }
    } else {
      const dz = -inland;
      const platW = (nCoast - nCl) + 5 + 6 * s;
      const hPlat = 0.02 - 0.045 * dz + 0.6 * S[o + 7];
      const pEdge = smoothstep(platW, platW + 10, dz);
      const hp = lerp(hPlat, seabed, pEdge);
      if (hp > h) { h = hp; m = pEdge < 0.55 && hp > -1.2 ? MAT_PLAT : MAT_SEABED; }
    }
  }

  // --- secondary north clefts (decorative V-slots, photo 02) ---
  if (s > 0.08) {
    for (const gx of [-38, 8]) {
      const cl = nCl + (gx + 18) * 0.02;
      const L = 8 + 12 * smoothstep(0.08, 0.9, s);
      if (z < cl + 2 && z > cl - L) {
        const hw = 0.9 + 0.5 * smoothstep(0, 1, s) + Math.max(0, z - cl) * 0.15;
        const ax = Math.abs(x - (gx + 0.5 * Math.sin(z * 0.2)));
        if (ax < hw) {
          const floor = lerp(-1.4, -0.5, clamp((cl - z) / L));
          if (floor < h) { h = floor; m = MAT_SEABED; }
        }
      }
    }
  }

  // --- NE headland root + surrounding platform ---
  const ax = Math.abs(x - HX);
  if (z > 80 && z < 155 && ax < 28) {
    const w = headHalfWidth(clamp(z, 86, 148));
    if (z < 90) {
      const shrink = smoothstep(86, 89, z);
      const top = (S[o + 10] - shrink * 0.8) * smoothstep(w - shrink + 0.2, w - shrink - 1.1, ax);
      if (top > h) { h = top; m = MAT_LAND; }
    }
    if (z > 88) {
      const outD = Math.max(0, ax - w) + Math.max(0, z - 148);
      const hp = -0.02 - 0.05 * outD + 0.65 * S[o + 15] - 11 * smoothstep(2.5 + 5 * s, 9 + 8 * s, outD + 8 * S[o + 7]);
      if (hp > h) { h = hp; m = hp > -1.2 ? MAT_PLAT : MAT_SEABED; }
    }
  }

  // --- tombolo neck (連島沙洲) ---
  const t = (z - NECK_Z0) / (NECK_Z1 - NECK_Z0);
  if (t > -0.12 && t < 1.12) {
    const tc = clamp(t);
    const cx = TOMB_X + 3 * Math.sin(Math.PI * tc);
    const hw = 10 + 8 * Math.pow(Math.abs(2 * tc - 1), 2.4);
    const dx = (x - cx) / hw;
    const ht = K.crest - 2.8 * dx * dx + S[o + 12];
    if (ht > h) { h = ht; m = ht > -2.6 ? MAT_SAND : MAT_SEABED; }
  }

  // --- 東灣 beach (east crescent on the tombolo) ---
  if (t > 0.08 && t < 0.92 && x > TOMB_X - 2) {
    const tc = clamp(t);
    const beachR = K.wb * (0.85 + 0.25 * Math.sin(Math.PI * tc)); // crescent
    const shoreX = TOMB_X + 9 + 6 * Math.pow(Math.abs(2 * tc - 1), 1.8);
    const dx = x - shoreX;
    if (dx > -2 && dx < beachR + 14) {
      const hb = 2.4 - 4.2 * (Math.max(0, dx) / beachR) + S[o + 9];
      const edge = smoothstep(beachR, beachR + 14, dx);
      const hh = lerp(hb, seabed, edge);
      if (hh > h) { h = hh; m = hh > -2.4 ? MAT_SAND : MAT_SEABED; }
    }
  }

  // --- west typhoon-shelter bay (slight indent + shallow) ---
  if (t > 0.15 && t < 0.85 && x < TOMB_X - 6) {
    const bay = bump(x, TOMB_X - 22, 18) * bump(z, 12, 35);
    if (bay > 0.05) {
      const hb = -1.2 - 2.5 * bay + S[o + 11];
      if (hb > h && h < 1.5) { h = Math.max(h, hb); if (h < 0.2) m = MAT_SEABED; }
    }
  }

  // --- 饅頭石 (rounded boulder on SE platform) ---
  const dM = S[o + 14];
  if (dM < MANTOU.r + 8) {
    const br = MANTOU.r * (0.85 + 0.15 * s);
    const rock = Math.max(0, br - dM) * 1.35 + 0.4 * smoothstep(br + 3, br - 0.5, dM);
    const hy = 0.3 + rock * (1.1 - 0.15 * dM / Math.max(0.1, br));
    // bun-like dome
    const dome = Math.sqrt(Math.max(0, 1 - (dM / (br + 0.01)) ** 2)) * 5.2;
    const hh = Math.max(hy, dome * smoothstep(br + 0.5, br - 0.2, dM));
    if (hh > h) { h = hh; m = dM < br + 1.5 ? MAT_LAND : (hh > -0.8 ? MAT_PLAT : MAT_SEABED); }
  }

  // --- SE rocky platform apron around Mantou ---
  if (x > 35 && x < 80 && z > -110 && z < -50) {
    const plat = 0.15 - 0.03 * Math.max(0, -(z + 70)) + 0.55 * S[o + 7]
      - 8 * smoothstep(0.4, 1.1, ellDist(x, z, { x: 50, z: -75, rx: 28, rz: 22 }));
    if (plat > h && plat > -1.5) { h = plat; m = plat > -0.9 ? MAT_PLAT : MAT_SEABED; }
  }

  // --- geo cut-out ---
  out.raw = h; out.rawM = m;
  if (z > K.geoIn && z < K.geoSea) {
    const adx = Math.abs(x - S[o + 8]);
    if (adx < GEO_RIN && adx < geoStripHalf(z, K.geo)) { h = GEO_SUNK; m = MAT_SEABED; }
  }

  out.h = h; out.m = m;
  return out;
}

const _gs = new Float32Array(STATIC_FIELDS);
const _smp: Sample = { h: 0, m: 0 };
export function groundRaw(x: number, z: number, K: StageConsts): number {
  staticSample(x, z, _gs, 0);
  return terrainSample(x, z, _gs, 0, K, _smp).raw!;
}
