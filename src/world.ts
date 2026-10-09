// Pure world model: generic dumbbell-island teaching silhouette.
// Every landform is a function of the erosion stage s ∈ [0, 1].
// +X = east, +Z = north. Simplified pedagogical sample — not a real place / survey data.
import { bump, clamp, fbm2, lerp, noise2, smoothstep } from './noise';

export const H = 32; // typical hill / cliff height scale
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
  // angular plan: facets instead of soft ellipse
  const facet = 1.4 * Math.abs(noise2(z * 0.09, 3.3)) + 0.7 * noise2(z * 0.18, 8.1);
  return lerp(12, 7.2, clamp((z - 86) / 62)) + facet;
}
export function headTop(x: number, z: number): number {
  // taller NE tip with stepped granite top
  const base = 22 - 0.05 * Math.max(0, z - 90);
  const step = 1.8 * Math.floor((fbm2(x * 0.04 + 3.1, z * 0.04, 3) + 1) * 1.6) / 3.2;
  return base + step + 0.6 * noise2(x * 0.12, z * 0.12);
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
  // Fixed offshore park once the arch collapses — never slides while scrubbing the timeline.
  const r = lerp(Math.min(headHalfWidth(zc + 4), 5.0), 3.4, smoothstep(0.65, 0.97, p));
  const gapClear = 16; // readable water channel between remaining tip & stack
  const zs = seg.b + 26; // anchored world Z (stable hotspot / mesh)
  const z0 = zs - r - 1.0;
  const zEnd = zs + r + 2.5;
  const cutSea = Math.min(z0 - gapClear, seg.b - 2);
  return { zs, r, z0, zEnd, cutSea, gapClear };
}

// ---------- Dumbbell teaching silhouette ----------
// Elongated N–S dumbbell (not soft cylinders). Early stage = two separate islands.
// Coordinates: +X east, +Z north. Rings are closed CCW.

/** South hillmass (larger) — tall teaching cliffs on the south shore. */
export const SOUTH = { x: 4, z: -92, rx: 58, rz: 78, peak: 44 };
/** North hillmass (smaller) — rocky north tip. */
export const NORTH = { x: -4, z: 102, rx: 42, rz: 52, peak: 28 };
/** Tombolo / town neck z-range (open water early; sand bridge later). */
export const NECK_Z0 = -18, NECK_Z1 = 48;

/**
 * Irregular rocky outline of the southern mass (plan view).
 * Elongated N–S with coves & headlands — generic teaching outline.
 */
export const SOUTH_RING: [number, number][] = [
  // neck-facing north — narrow waist (tombolo attaches here)
  [-10, -16], [0, -10], [12, -14], [20, -22],
  // SE rocky headlands / deep coves (not a smooth oval)
  [26, -36], [18, -48], [34, -54], [46, -48], [54, -62], [42, -74],
  [58, -82], [64, -96], [50, -108], [60, -118], [44, -128], [52, -142],
  [34, -150], [18, -164], [4, -172], [-12, -166], [-24, -154],
  // SW granite: indented coves
  [-18, -140], [-34, -146], [-46, -134], [-36, -120], [-54, -112],
  [-48, -96], [-60, -84], [-44, -76], [-58, -64], [-50, -50],
  [-62, -40], [-48, -30], [-34, -24], [-22, -16],
];
/**
 * Irregular rocky outline of the northern mass (plan view).
 * Smaller elongated mass with jagged tip — gap to south stays open until tombolo.
 */
export const NORTH_RING: [number, number][] = [
  // neck-facing south — narrow waist
  [-14, 48], [-2, 44], [10, 48], [18, 56],
  // east lobe toward NE teaching tip (asymmetric)
  [22, 68], [14, 78], [28, 86], [38, 80], [46, 92], [36, 104],
  [48, 116], [40, 130], [28, 142], [14, 154], [0, 160],
  // north tip jagged / clefts
  [-12, 156], [-24, 146], [-18, 132], [-32, 124], [-42, 112],
  // west rocky shore
  [-34, 98], [-48, 90], [-40, 76], [-54, 66], [-42, 56], [-26, 50], [-16, 48],
];

/** Signed distance to closed ring (negative = inside). */
export function polySDF(x: number, z: number, ring: [number, number][]): number {
  let d2 = 1e20, inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    // ray cast for winding
    if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi)) inside = !inside;
    // distance to segment
    const ex = xj - xi, ez = zj - zi;
    const wx = x - xi, wz = z - zi;
    const t = clamp((wx * ex + wz * ez) / (ex * ex + ez * ez + 1e-12));
    const dx = wx - ex * t, dz = wz - ez * t;
    d2 = Math.min(d2, dx * dx + dz * dz);
  }
  return (inside ? -1 : 1) * Math.sqrt(d2);
}

/** Analogous to old ellDist: 1 ≈ rim, <1 inland, >1 offshore. */
function massDist(x: number, z: number, ring: [number, number][], apron: number): number {
  return 1 + polySDF(x, z, ring) / apron;
}

/** Extreme Z of ring along a vertical line x=const (for coast traces). */
function coastAtX(ring: [number, number][], x: number, wantMax: boolean): number | null {
  let best = wantMax ? -1e9 : 1e9;
  let found = false;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const x0 = ring[i][0], z0 = ring[i][1];
    const x1 = ring[(i + 1) % n][0], z1 = ring[(i + 1) % n][1];
    if ((x0 - x) * (x1 - x) > 0) continue; // same side
    if (Math.abs(x1 - x0) < 1e-6) continue;
    const t = (x - x0) / (x1 - x0);
    if (t < -0.02 || t > 1.02) continue;
    const zz = z0 + t * (z1 - z0);
    found = true;
    best = wantMax ? Math.max(best, zz) : Math.min(best, zz);
  }
  return found ? best : null;
}

/** Soft island occupancy 0…1 — hills + NE tip only (no permanent neck; sand bridge grows with stage). */
function rimJitter(x: number, z: number): number {
  return 0.05 * noise2(x * 0.05, z * 0.05)
    + 0.035 * noise2(x * 0.12 + 3.1, z * 0.12)
    + 0.022 * Math.abs(noise2(x * 0.28, z * 0.26))
    + 0.012 * Math.abs(noise2(x * 0.55, z * 0.5));
}

export function islandCore(x: number, z: number): number {
  const j = rimJitter(x, z);
  const ds = massDist(x, z, SOUTH_RING, 11) + j;
  const dn = massDist(x, z, NORTH_RING, 10) + j * 0.9;
  // hard rim following irregular ring (not soft ellipse blob)
  const hills = Math.max(smoothstep(1.03, 0.94, ds), smoothstep(1.03, 0.94, dn));
  const tip = smoothstep(1.1, 0.58, Math.hypot((x - HX) / 12, (z - 122) / 24) + j * 0.5) * smoothstep(88, 102, z);
  return Math.max(hills, tip);
}

/** North-facing cliff line (sea to the north / +Z). Retreat moves inland (−Z). */
export function northCoast0(x: number): number {
  const base = coastAtX(NORTH_RING, x, true);
  if (base === null) {
    // outside north mass footprint — fall back gently
    const u = clamp((x - NORTH.x) / (NORTH.rx * 1.15), -1, 1);
    return NORTH.z + NORTH.rz * 0.55 * Math.sqrt(Math.max(0, 1 - u * u));
  }
  let z = base;
  // jagged rocky outline + deep inlets
  z += 2.8 * noise2(x * 0.055, 9.1) + 1.8 * noise2(x * 0.14, 2.7);
  z += 1.4 * Math.abs(noise2(x * 0.24, 5.5)) - 2.6 * bump(x, -38, 7) - 2.0 * bump(x, 8, 5.5);
  z += 14 * bump(x, HX, 18); // NE tip bulge
  return z;
}
export function northCliff(x: number, s: number): number {
  return northCoast0(x) - retreat(s) * (0.55 + 0.45 * smoothstep(-50, 40, x));
}

/** South-facing cliff line (sea to the south / −Z). Retreat moves inland (+Z). */
export function southCoast0(x: number): number {
  const base = coastAtX(SOUTH_RING, x, false);
  if (base === null) {
    const u = clamp((x - SOUTH.x) / (SOUTH.rx * 1.15), -1, 1);
    return SOUTH.z - SOUTH.rz * 0.55 * Math.sqrt(Math.max(0, 1 - u * u));
  }
  let z = base;
  // Irregular granite headlands / coves
  z += 2.6 * noise2(x * 0.045, 4.4) + 1.7 * noise2(x * 0.12, 1.8);
  z += 1.5 * Math.abs(noise2(x * 0.22, 7.2)) - 3.2 * bump(x, 22, 9) - 2.2 * bump(x, -18, 7) - 1.8 * bump(x, 48, 6);
  return z;
}
export function southCliff(x: number, s: number): number {
  return southCoast0(x) + retreat(s) * (0.7 + 0.3 * bump(x, 20, 50));
}

/** Legacy helpers used by debris / splash on the southern teaching cliff. */
export function coast0(x: number): number { return southCoast0(x); }
export function cliffLine(x: number, s: number): number { return southCliff(x, s); }
export const bayW = (_x: number): number => 0;
export const retreat = (s: number): number => 4 + 22 * smoothstep(0.08, 1, s);
export const beachWidth = (s: number): number => 2 + 26 * smoothstep(0.28, 0.95, s);

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

/** Tombolo crest height (m). Deeply negative = open water; mid = soft submerged bar; late = dry bridge. */
export const tomboloCrest = (s: number): number =>
  -5.2
  + 2.8 * smoothstep(0.08, 0.36, s)   // early→mid soft fans (~ -2.4)
  + 2.2 * smoothstep(0.34, 0.62, s)   // mid: clear submerged bar (~ -0.2)
  + 3.2 * smoothstep(0.58, 0.92, s);  // late: dry tombolo (~ +3.0)

/** Rounded boulder landmark on the SE rocky shore (teaching prop). */
export const MANTOU = { x: 58, z: -78, r: 4.2 };

export interface Sample { h: number; m: number; raw?: number; rawM?: number; }

export const STATIC_FIELDS = 16;
export function staticSample(x: number, z: number, out: Float32Array, o: number) {
  const ds = massDist(x, z, SOUTH_RING, 11);
  const dn = massDist(x, z, NORTH_RING, 10);
  const core = islandCore(x, z);
  out[o] = southCoast0(x);           // 0 south coast0
  out[o + 1] = northCoast0(x);       // 1 north coast0
  out[o + 2] = core;                 // 2 island occupancy
  out[o + 3] = ds;                   // 3 south mass dist (1=rim)
  out[o + 4] = dn;                   // 4 north mass dist (1=rim)
  // hill heights from inland distance to irregular rim (plateau held to cliff)
  const sIn = Math.max(0, -polySDF(x, z, SOUTH_RING));
  const nIn = Math.max(0, -polySDF(x, z, NORTH_RING));
  // Dome from rim (higher exponent = rounded hills, not flat cylinder lids).
  // Extra lift near the southern outer coast so the teaching cliff can still soar.
  const sNearNeck = smoothstep(-42, -16, z) * smoothstep(8, -10, z);
  const nNearNeck = smoothstep(38, 56, z) * smoothstep(72, 46, z);
  const sSouthRim = smoothstep(-40, -120, z); // toward south tip
  const sPlateau = Math.pow(smoothstep(2.2 + 5 * sNearNeck, 26 - 8 * sNearNeck, sIn), 0.62 + 0.2 * sNearNeck);
  const nPlateau = Math.pow(smoothstep(2.0 + 4 * nNearNeck, 22 - 6 * nNearNeck, nIn), 0.62 + 0.2 * nNearNeck);
  const sCliffLift = (0.55 + 0.45 * sSouthRim) * Math.pow(smoothstep(0.8, 7, sIn), 0.35) * (1 - 0.7 * sNearNeck);
  const nCliffLift = 0.35 * Math.pow(smoothstep(0.8, 6, nIn), 0.4) * (1 - 0.7 * nNearNeck);
  const sFacet = 1.1 * Math.abs(noise2(x * 0.055, z * 0.055)) + 0.7 * Math.abs(noise2(x * 0.16, z * 0.14));
  const nFacet = 0.9 * Math.abs(noise2(x * 0.06 + 2, z * 0.06)) + 0.55 * Math.abs(noise2(x * 0.17, z * 0.16));
  const sRidge = 0.7 + 0.3 * smoothstep(0.1, 0.9, Math.abs(Math.sin((z - SOUTH.z) * 0.026 + 0.45 * noise2(x * 0.028, 1))))
    * (1 - 0.4 * sNearNeck);
  const nRidge = 0.72 + 0.28 * smoothstep(0.1, 0.9, Math.abs(Math.sin((z - NORTH.z) * 0.03 + 0.4 * noise2(x * 0.03, 2))))
    * (1 - 0.4 * nNearNeck);
  out[o + 5] = SOUTH.peak * Math.max(sPlateau * sRidge, sCliffLift) * (0.88 + 0.14 * fbm2(x * 0.018, z * 0.018, 3)) + sFacet * 2.4;
  out[o + 6] = NORTH.peak * Math.max(nPlateau * nRidge, nCliffLift) * (0.88 + 0.14 * fbm2(x * 0.02 + 2, z * 0.02, 3)) + nFacet * 1.8;
  out[o + 7] = 0.16 * noise2(x * 0.3, z * 0.3) + 0.09 * noise2(x * 1.2, z * 1.2);
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

/** Wave approach: degrees FROM which waves come (0=N, 90=E, 180=S, 270=W). */
export function waveTravel(wd: number): { dx: number; dz: number } {
  const r = (wd * Math.PI) / 180;
  return { dx: -Math.sin(r), dz: -Math.cos(r) };
}

export function stageConsts(s: number, waveDir = 180) {
  const G = geoParams(s);
  const travel = waveTravel(waveDir);
  // lee-side sand bias: shift sand down-wave (into the wave shadow)
  const leeX = travel.dx;
  const leeZ = travel.dz * 0.35;
  return {
    s, R: retreat(s), wb: beachWidth(s), geo: G, geoIn: G.zIn, geoSea: G.zSea,
    crest: tomboloCrest(s),
    waveDir, travel, leeX, leeZ,
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

  // --- south hillmass: textbook — 原本坡面 → 海蝕凹地 → 崩塌 → 陡峭海崖 + 浪蝕平台 ---
  if (ds < 1.28) {
    const inland = z - sCl; // >0 = inland of south cliff
    // Distinct teaching beats: notch deepens first, then collapse (≈0.24) forms the cliff
    const notchPhase = smoothstep(0.02, 0.20, s);           // 海蝕凹地加深
    const collapsePhase = smoothstep(0.22, 0.40, s);        // 崩塌後變陡壁
    const platPhase = smoothstep(0.24, 1.0, s);
    const platW = Math.max(1.5, (sCoast - sCl)) + 1.5 + 28 * platPhase;
    if (inland <= 0) {
      // Wave-cut platform: flat intertidal rock; must override elevated island-core seabed
      const dz = -inland;
      const hPlat = 0.16 - 0.01 * dz + 0.14 * S[o + 7];
      const pEdge = smoothstep(platW * 0.88, platW + 12, dz);
      const hp = lerp(hPlat, Math.min(seabed, -1.8), pEdge);
      if (dz <= platW + 10 || hp > h) {
        h = hp;
        m = pEdge < 0.6 && hp > -1.1 ? MAT_PLAT : MAT_SEABED;
      }
    } else {
      // Clear elevated island-core seabed so the slope / notch / cliff can write
      if (h > -0.5) h = -2.0;

      // (1) Original gentle slope — dominant early, fades after collapse
      const slopeLen = 34 - 20 * collapsePhase;
      const slopeExp = lerp(1.35, 0.35, collapsePhase);
      const origSlope = S[o + 5] * Math.pow(smoothstep(0.0, slopeLen, inland), slopeExp) * lerp(0.92, 0.12, collapsePhase);

      // (2) 海蝕凹地 — deep waterline undercut BEFORE collapse (must read from the sea)
      // Heightfield cannot true-overhang; carve a long low roof + keep a high bulk just inland.
      const notchW = 2.6 + 5.2 * notchPhase; // deepens inland as notch grows
      const notchRoof = 0.45 + 0.35 * notchPhase + 0.06 * S[o + 7];
      const notchBand = smoothstep(0.0, 0.35, inland) * smoothstep(notchW + 0.8, 0.25, inland)
        * (1 - collapsePhase * 0.92); // strongest mid-timeline

      // Overhang bulk just inland of the notch (the rock that will collapse) — tall & obvious
      const overhang = S[o + 5] * (0.72 + 0.2 * notchPhase) * notchPhase * (1 - collapsePhase)
        * smoothstep(notchW * 0.35, notchW + 0.8, inland)
        * smoothstep(notchW + 14, notchW + 3.5, inland);

      // Force a readable "shelf indent": near the face, clamp down hard to notchRoof
      // while overhang keeps height a few metres inland — looks like undercut from seaward.
      let preCliff = Math.max(origSlope, overhang);
      if (notchBand > 0.02) {
        preCliff = lerp(preCliff, Math.min(preCliff, notchRoof), Math.min(1, notchBand * 1.35));
      }
      // Extra: keep a raised lip / roof just above the notch cavity so the indent casts a shadow
      const roofLip = S[o + 5] * 0.38 * notchPhase * (1 - collapsePhase)
        * smoothstep(notchW * 0.7, notchW + 0.2, inland)
        * smoothstep(notchW + 5.5, notchW + 1.6, inland);
      preCliff = Math.max(preCliff, roofLip);

      // (3) Steep cliff after roof collapse
      const wallEnd = lerp(11, 1.2, collapsePhase);
      const rise = Math.pow(smoothstep(0.05, wallEnd, inland), lerp(1.05, 0.16, collapsePhase));
      const pillar = 0.55 + 0.45 * Math.abs(Math.sin(x * 0.48 + noise2(x * 0.07, 2.2) * 2.2));
      const face = S[o + 5] * rise * (0.82 + 0.28 * pillar * (1 - rise)) * collapsePhase;

      const mid = S[o + 5] * 0.4;
      const step = collapsePhase * (
        mid * smoothstep(0.45, 1.1, inland)
        + (S[o + 5] - mid) * Math.pow(smoothstep(1.0, 1.7, inland), 0.28)
      );
      const hill = S[o + 5] * smoothstep(lerp(10, 1.2, collapsePhase), lerp(22, 5.0, collapsePhase), inland);
      const groove = Math.max(0, 0.5 - Math.abs(Math.sin(x * 0.35)) * 1.05)
        * smoothstep(0.5, 2.5, inland) * (1 - smoothstep(3, 6.5, inland)) * collapsePhase;

      let landH = Math.max(preCliff, face, step, hill) - groove * 4.8 * smoothstep(0, 0.35, s + 0.2);

      // Remnant foot-notch after collapse — deep indent students can see from the sea
      if (collapsePhase > 0.15) {
        const foot = smoothstep(0.0, 0.55, inland) * smoothstep(3.4, 0.25, inland);
        const footRoof = 0.35 + 0.18 * S[o + 7];
        landH = Math.min(landH, lerp(footRoof, landH, 1 - 0.9 * foot * Math.min(1, collapsePhase * 1.2)));
      }
      landH = Math.max(landH, 0.08);
      if (landH > h) { h = landH; m = MAT_LAND; }
    }
  }

  // --- north hillmass: rocky hills + short platforms (less cylinder, more ridge) ---
  if (dn < 1.2) {
    const inland = nCl - z; // >0 = inland of north cliff
    if (inland > 0) {
      const hill = S[o + 6] * smoothstep(0.6, 9, inland);
      const cliffFace = S[o + 6] * Math.pow(smoothstep(-0.1, 2.4, inland), 0.45);
      const landH = Math.max(hill, cliffFace);
      if (landH > h) { h = landH; m = MAT_LAND; }
    } else {
      const dz = -inland;
      const platW = (nCoast - nCl) + 6 + 7 * s;
      const hPlat = 0.05 - 0.035 * dz + 0.45 * S[o + 7];
      const pEdge = smoothstep(platW, platW + 11, dz);
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

  // --- NE headland root + surrounding platform (do NOT fill stack-gap channels) ---
  const ax = Math.abs(x - HX);
  // Find if this (x,z) sits in a collapsed-stack water gap — keep it as open water on the heightfield
  let inStackGap = false;
  let nearStack = false;
  if (z > 95 && ax < 22) {
    for (let k = 0; k < SEGMENTS.length; k++) {
      const p = phase(s, k);
      if (p < 0.62) continue;
      const st = stackGeom(k, p);
      if (z > st.cutSea && z < st.z0 && ax < 16) inStackGap = true;
      if (Math.hypot(x - HX, z - st.zs) < st.r + 1.5) nearStack = true;
    }
  }
  if (z > 80 && z < 175 && ax < 28 && !inStackGap) {
    const w = headHalfWidth(clamp(z, 86, 148));
    // Only a short root joining the north hill to the voxel headland mesh
    if (z < 92) {
      const shrink = smoothstep(86, 90, z);
      const top = (S[o + 10] - shrink * 0.8) * smoothstep(w - shrink + 0.2, w - shrink - 1.1, ax);
      if (top > h) { h = top; m = MAT_LAND; }
    }
    // Platform apron around the tip — but not inside stack gaps, and not past ~outer tip early
    if (z > 88 && z < 150 && !nearStack) {
      const outD = Math.max(0, ax - w) + Math.max(0, z - 148);
      const hp = -0.02 - 0.05 * outD + 0.65 * S[o + 15] - 11 * smoothstep(2.5 + 5 * s, 9 + 8 * s, outD + 8 * S[o + 7]);
      if (hp > h) { h = hp; m = hp > -1.2 ? MAT_PLAT : MAT_SEABED; }
    }
  }
  if (inStackGap) {
    // Force open water channel between remaining tip and offshore stack
    const gapFloor = -2.8 + 0.4 * S[o + 15];
    if (gapFloor < h) { h = gapFloor; m = MAT_SEABED; }
  }

  // --- tombolo sand bridge (連島沙洲) ---
  // Soft submerged haze → dry bridge. Fixed on TOMB_X (wave dir never shifts the bar).
  // Growth: shore fans first → fuzzy mid bar under water → seamless dry join to both islands.
  const t = (z - NECK_Z0) / (NECK_Z1 - NECK_Z0);
  const sandGate = smoothstep(-4.6, -1.2, K.crest);          // underwater presence
  const midBar = smoothstep(-3.4, -0.6, K.crest);            // channel-filling soft bar
  const shoreJoin = smoothstep(-1.1, 0.95, K.crest);         // dry land emerge (clear by late)
  if (t > -0.65 && t < 1.65 && sandGate > 0.008) {
    const tc = clamp(t);
    // Soft irregular shoreline (wave-accreted — never a hard rectangle)
    const edgeN =
      0.55 * noise2(x * 0.042 + 1.7, z * 0.038)
      + 0.35 * noise2(x * 0.11, z * 0.095 + 2.3)
      + 0.22 * noise2(x * 0.24, z * 0.21)
      + 0.14 * noise2(x * 0.52, z * 0.46)
      + 0.08 * noise2(x * 1.1, z * 0.95);

    // Fixed meandering centreline (NO leeX / wave-dir drift)
    const cx = TOMB_X
      + 4.2 * Math.sin(Math.PI * tc)
      + 2.4 * noise2(z * 0.034, 4.1)
      + 1.1 * noise2(z * 0.09 + 2.2, 7.3);

    // Grow from BOTH shores first, then fill the mid channel (matches soft fan screenshots)
    const shoreFans =
      Math.pow(smoothstep(0.55, -0.18, tc), 1.15)
      + Math.pow(smoothstep(0.45, 1.18, tc), 1.15);
    const midFill = Math.pow(Math.sin(Math.PI * clamp(tc)), 0.85);
    const along =
      lerp(0.22 + 0.78 * Math.min(1, shoreFans), 1.0, midBar * 0.85)
      * lerp(0.35 + 0.65 * midFill, 1.0, shoreJoin);

    // Soft scalloped PATH — fat at rock toes, NARROW fuzzy waist in mid-channel (not a rectangle)
    const baseHw = 4.2 + 5.5 * sandGate + 3.8 * midBar + 5.5 * shoreJoin;
    // |2t-1|^p → 1 at ends, 0 at mid  ⇒  wide fans at shores, thin soft path in centre
    const waist = 0.38 + 0.78 * Math.pow(Math.abs(2 * tc - 1), 1.15);
    const shoreFlare = (0.55 + 1.8 * shoreJoin + 0.9 * sandGate * (1 - midBar)) * Math.pow(Math.abs(2 * tc - 1), 0.9);
    const scallop = 0.85 * noise2(z * 0.07, 8.1) + 0.55 * noise2(z * 0.17 + 1.3, 3.4) + 0.35 * noise2(z * 0.31, 1.9);
    const hw = baseHw * waist * (1 + shoreFlare) * (1 + 0.7 * edgeN + 0.4 * scallop);

    const dx = (x - cx) / Math.max(2.8, hw);
    const dxAbs = Math.abs(dx);

    // Soft mound (no mesa) — very soft falloff for "fuzzy haze" underwater look
    const crestProfile = Math.pow(Math.max(0, 1 - Math.pow(dxAbs, 1.35)), 2.6);
    const wash = smoothstep(1.85, 0.25, dxAbs);
    const micro =
      S[o + 12] * (0.7 + 0.5 * sandGate)
      + 0.45 * noise2(x * 0.34, z * 0.30) * sandGate
      + 0.25 * noise2(x * 0.85, z * 0.78) * midBar
      + 0.18 * noise2(x * 1.9, z * 1.7) * shoreJoin;

    // Meet rock toes — late stage climbs onto rocky shore (kill water gap)
    const nearS = smoothstep(1.55, 0.55, ds);
    const nearN = smoothstep(1.55, 0.55, dn);
    const toeMeet = Math.max(nearS, nearN) * shoreJoin;
    const endBoost = shoreJoin * (smoothstep(0.48, -0.15, tc) + smoothstep(0.52, 1.15, tc));

    // Mid: soft submerged haze. Late: clearly dry beach crest joining both shores.
    const subH = lerp(-2.7, -1.15, midBar) + 0.4 * noise2(x * 0.18, z * 0.16);
    const dryLift = Math.max(0, K.crest) * 0.55 + 1.35 * shoreJoin;
    const targetH = lerp(subH, Math.max(1.8, K.crest + dryLift), shoreJoin);
    const ht = targetH * crestProfile
      + wash * Math.max(-1.2, targetH * 0.32 - 0.5)
      + micro
      + toeMeet * (4.8 + Math.max(0, K.crest) * 1.3)
      + endBoost * 3.0
      + (1 - shoreJoin) * sandGate * Math.min(1, shoreFans) * nearS * 1.15
      + (1 - shoreJoin) * sandGate * Math.min(1, shoreFans) * nearN * 1.15;

    // Fuzzy lateral edge — extra noise so mid path is not a hard rectangle
    const edgeWobble = 0.55 * noise2(x * 0.09 + z * 0.04, 5.5) + 0.35 * noise2(x * 0.22, z * 0.18);
    const lateral = Math.pow(smoothstep(1.85 + 0.55 * edgeWobble, 0.18 + 0.2 * Math.abs(edgeWobble), dxAbs), 1.25);
    const endFeather = smoothstep(-0.45, 0.05, tc) * smoothstep(1.45, 0.95, tc);
    const presence = Math.max(
      sandGate * (0.1 + 0.9 * along) * endFeather,
      Math.max(toeMeet, endBoost) * Math.max(sandGate, shoreJoin * 0.55),
      sandGate * Math.min(1, shoreFans) * Math.max(nearS, nearN) * 0.9
    ) * lateral;
    let ht2 = lerp(Math.min(seabed, -2.2), ht, presence);
    // Late: force dry crest above water across the whole soft path
    if (shoreJoin > 0.35) {
      ht2 = Math.max(ht2, (1.35 + 1.1 * shoreJoin) * presence);
    }
    // When joining shores, never leave a water trough between sand and rock
    if (toeMeet > 0.1) {
      const pad = 1.15 + 2.0 * toeMeet;
      ht2 = Math.max(ht2, pad * toeMeet);
    }
    if (ht2 > h + 0.01) {
      h = ht2;
      // Mark as sand even when deep so water shader can paint soft tan haze
      m = ht2 > -3.4 ? MAT_SAND : MAT_SEABED;
    }
  }

  // --- east bay beach (crescent on east of tombolo; anchored — no wave-dir jump) ---
  if (t > -0.08 && t < 1.08 && K.wb > 3.5) {
    const tc = clamp(t);
    const beachR = K.wb * (0.8 + 0.28 * Math.sin(Math.PI * tc));
    const shoreX = TOMB_X + 8 + 5.0 * Math.pow(Math.abs(2 * tc - 1), 1.6)
      + 2.0 * noise2(z * 0.05, 6.2);
    const dx = x - shoreX;
    const edgeN = 0.4 * noise2(x * 0.12, z * 0.1) + 0.22 * noise2(x * 0.3, z * 0.25);
    const softR = beachR * (1 + 0.2 * edgeN);
    if (dx > -7 && dx < softR + 24) {
      const u = Math.max(0, dx) / Math.max(4, softR);
      const hb = Math.min(K.crest + 0.85, 2.35) - 4.0 * Math.pow(u, 1.2) + S[o + 9]
        + 0.28 * noise2(x * 0.5, z * 0.45);
      const edge = smoothstep(softR * 0.7, softR + 20, dx);
      const alongBeach = smoothstep(-0.02, 0.12, tc) * smoothstep(1.02, 0.88, tc);
      const hh = lerp(hb, seabed, edge) * smoothstep(0.22, 0.52, s) * (0.55 + 0.45 * alongBeach + 0.35 * shoreJoin);
      if (hh > h) { h = hh; m = hh > -2.4 ? MAT_SAND : MAT_SEABED; }
    }
  }

  // --- west lagoon (soft shallow pocket west of path — only after mid bar; never a sand rectangle) ---
  if (t > 0.18 && t < 0.82 && x < TOMB_X - 8 && midBar > 0.25) {
    const bay = bump(x, TOMB_X - 22, 14) * bump(z, 14, 28) * (0.7 + 0.3 * noise2(x * 0.08, z * 0.08));
    if (bay > 0.08) {
      const hb = -1.4 - 1.6 * bay + 0.35 * midBar + S[o + 11];
      if (hb > h && h < 1.2) { h = Math.max(h, hb); m = MAT_SEABED; }
    }
  }

  // --- rounded boulder on SE platform (teaching prop) ---
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

  // --- SE rocky platform apron around Mantou (flat teaching apron) ---
  if (x > 32 && x < 82 && z > -115 && z < -48) {
    const plat = 0.22 - 0.01 * Math.max(0, -(z + 68)) + 0.2 * S[o + 7]
      - 7 * smoothstep(0.35, 1.05, Math.hypot((x - 50) / 30, (z + 75) / 24));
    if (plat > h && plat > -1.3) { h = plat; m = plat > -0.85 ? MAT_PLAT : MAT_SEABED; }
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

/** Plan-view land/sand occupancy for the top-view minimap (0=water, 1=rock, 2=sand). */
export function planCell(x: number, z: number, s: number, waveDir = 180): number {
  const core = islandCore(x, z);
  if (core > 0.45) return 1;
  const tip = Math.hypot((x - HX) / 14, (z - 118) / 28);
  if (tip < 1.05 && z > 85) return 1;
  const K = stageConsts(s, waveDir);
  const t = (z - NECK_Z0) / (NECK_Z1 - NECK_Z0);
  const sandGate = smoothstep(-4.6, -1.2, K.crest);
  const midBar = smoothstep(-3.4, -0.6, K.crest);
  const shoreJoin = smoothstep(-1.1, 0.95, K.crest);
  if (t > -0.45 && t < 1.45 && sandGate > 0.04) {
    const tc = clamp(t);
    const shoreFans = Math.pow(smoothstep(0.55, -0.18, tc), 1.15) + Math.pow(smoothstep(0.45, 1.18, tc), 1.15);
    const along = lerp(0.22 + 0.78 * Math.min(1, shoreFans), 1.0, midBar * 0.85);
    const edgeN = 0.5 * noise2(x * 0.042 + 1.7, z * 0.038) + 0.28 * noise2(x * 0.11, z * 0.095);
    const cx = TOMB_X + 4.2 * Math.sin(Math.PI * tc) + 2.4 * noise2(z * 0.034, 4.1);
    const baseHw = 4.5 + 5.5 * sandGate + 3.5 * midBar + 5.0 * shoreJoin;
    const shoreFlare = (0.4 + 1.5 * shoreJoin) * Math.pow(Math.abs(2 * tc - 1), 0.9);
    const hw = baseHw * (0.38 + 0.78 * Math.pow(Math.abs(2 * tc - 1), 1.15)) * (1 + shoreFlare) * (1 + 0.4 * edgeN);
    const dx = (x - cx) / Math.max(3.0, hw);
    const nearS = smoothstep(1.45, 0.7, massDist(x, z, SOUTH_RING, 11));
    const nearN = smoothstep(1.45, 0.7, massDist(x, z, NORTH_RING, 10));
    const toeMeet = Math.max(nearS, nearN) * shoreJoin;
    if ((Math.abs(dx) < 1.25 * (0.3 + 0.7 * along) || toeMeet > 0.25 || (sandGate > 0.2 && Math.max(nearS, nearN) * shoreFans > 0.45)) && K.crest > -3.8) return 2;
  }
  if (t > -0.05 && t < 1.05 && K.wb > 3.5) {
    const tc = clamp(t);
    const beachR = K.wb * (0.8 + 0.28 * Math.sin(Math.PI * tc));
    const shoreX = TOMB_X + 8 + 5.0 * Math.pow(Math.abs(2 * tc - 1), 1.6);
    const dx = x - shoreX;
    if (dx > -3 && dx < beachR + 8 && s > 0.28) return 2;
  }
  return 0;
}
