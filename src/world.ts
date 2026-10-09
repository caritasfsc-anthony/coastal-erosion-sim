// Pure world model: Cheung Chau (長洲) teaching silhouette.
// Every landform is a function of the erosion stage s ∈ [0, 1].
// +X = east, +Z = north. Simplified pedagogical model inspired by 3d.map.gov.hk — not survey data.
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
  const cv = caveParams(p, headHalfWidth(zc));
  const z0 = zc + cv.rz;
  const zEnd = seg.b - 3.5 * smoothstep(0.6, 1, p);
  const zs = (z0 + zEnd) * 0.5;
  const r0 = Math.min(headHalfWidth(zs), (zEnd - z0) * 0.5);
  const r = lerp(r0, 4.2, smoothstep(0.65, 0.97, p));
  return { zs, r, z0, zEnd };
}

// ---------- Cheung Chau silhouette (dumbbell) ----------
// Plan rings match the real island’s elongated N–S dumbbell (not soft cylinders).
// Coordinates: +X east, +Z north. Rings are closed CCW. Early stage = two separate islands.

/** South hillmass (larger) — 南氹 / south. Tall granite cliffs. */
export const SOUTH = { x: 4, z: -92, rx: 58, rz: 78, peak: 44 };
/** North hillmass (smaller) — rocky north tip. */
export const NORTH = { x: -4, z: 102, rx: 42, rz: 52, peak: 28 };
/** Tombolo / town neck z-range (open water early; sand bridge later). */
export const NECK_Z0 = -18, NECK_Z1 = 48;

/**
 * Irregular rocky outline of the southern mass (plan view).
 * Elongated N–S with coves & headlands — inspired by 3d.map.gov.hk Cheung Chau.
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

/** South-facing cliff line at 南氹 (sea to the south / −Z). Retreat moves inland (+Z). */
export function southCoast0(x: number): number {
  const base = coastAtX(SOUTH_RING, x, false);
  if (base === null) {
    const u = clamp((x - SOUTH.x) / (SOUTH.rx * 1.15), -1, 1);
    return SOUTH.z - SOUTH.rz * 0.55 * Math.sqrt(Math.max(0, 1 - u * u));
  }
  let z = base;
  // Nam Tam: irregular granite headlands / coves
  z += 2.6 * noise2(x * 0.045, 4.4) + 1.7 * noise2(x * 0.12, 1.8);
  z += 1.5 * Math.abs(noise2(x * 0.22, 7.2)) - 3.2 * bump(x, 22, 9) - 2.2 * bump(x, -18, 7) - 1.8 * bump(x, 48, 6);
  return z;
}
export function southCliff(x: number, s: number): number {
  return southCoast0(x) + retreat(s) * (0.7 + 0.3 * bump(x, 20, 50));
}

/** Legacy helpers used by debris / splash on the southern teaching cliff (南氹). */
export function coast0(x: number): number { return southCoast0(x); }
export function cliffLine(x: number, s: number): number { return southCliff(x, s); }
export const bayW = (_x: number): number => 0;
export const retreat = (s: number): number => 14 * s;
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

/** Tombolo crest height (m). Deeply negative = open water between islands; then submerged bar; then dry bridge. */
export const tomboloCrest = (s: number): number =>
  -4.6 + 2.4 * smoothstep(0.08, 0.38, s) + 4.6 * smoothstep(0.38, 0.88, s);

/** 饅頭石 landmark (SE rocky shore). */
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
  // Extra lift near the southern outer coast so 南氹 cliff can still soar.
  const sNearNeck = smoothstep(-42, -16, z) * smoothstep(8, -10, z);
  const nNearNeck = smoothstep(38, 56, z) * smoothstep(72, 46, z);
  const sSouthRim = smoothstep(-40, -120, z); // toward Nam Tam tip
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

  // --- south hillmass (南氹): flat platform → notch → tall near-vertical cliff ---
  if (ds < 1.22) {
    const inland = z - sCl; // >0 = inland of south cliff
    const platW = (sCoast - sCl) + 18 + 20 * s;
    if (inland <= 0) {
      // wide, flat wave-cut platform apron
      const dz = -inland;
      const hPlat = 0.22 - 0.01 * dz + 0.2 * S[o + 7];
      const pEdge = smoothstep(platW * 0.9, platW + 16, dz);
      const hp = lerp(hPlat, seabed, pEdge);
      if (hp > h) { h = hp; m = pEdge < 0.5 && hp > -1.0 ? MAT_PLAT : MAT_SEABED; }
    } else {
      // notch then near-vertical wall (most height within ~1 m)
      const notchW = 2.0 + 0.9 * s;
      const notchH = 1.35 + 0.2 * S[o + 7];
      const notch = notchH * smoothstep(-0.05, 0.4, inland) * smoothstep(notchW + 0.85, notchW - 0.25, inland);
      const rise = Math.pow(smoothstep(notchW * 0.08, notchW + 0.85, inland), 0.25);
      // buttresses / joints on the wall only — fade before the flat rim so the crest stays sharp
      const pillar = 0.55 + 0.45 * Math.abs(Math.sin(x * 0.48 + noise2(x * 0.07, 2.2) * 2.2));
      const wallMod = 0.78 + 0.32 * pillar * (1 - rise);
      const face = S[o + 5] * rise * wallMod;
      // bedding step mid-face
      const mid = S[o + 5] * 0.42;
      const step = mid * smoothstep(notchW + 0.05, notchW + 0.55, inland)
        + (S[o + 5] - mid) * Math.pow(smoothstep(notchW + 0.45, notchW + 0.9, inland), 0.3);
      const hill = S[o + 5] * smoothstep(0.5, 3.8, inland);
      // joint grooves cut the wall, not the plateau top
      const groove = Math.max(0, 0.5 - Math.abs(Math.sin(x * 0.35)) * 1.05)
        * smoothstep(0.3, 2.2, inland) * (1 - smoothstep(2.5, 5.5, inland));
      const landH = Math.max(notch, face, step, hill) - groove * 5.5 * smoothstep(0, 0.3, s + 0.25);
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

  // --- tombolo sand bridge (連島沙洲): only appears as deposition grows with stage ---
  const t = (z - NECK_Z0 + K.leeZ * 8) / (NECK_Z1 - NECK_Z0);
  const sandGate = smoothstep(-3.8, -0.4, K.crest); // 0 while open water, rises as bar builds
  if (t > -0.15 && t < 1.15 && sandGate > 0.02) {
    const tc = clamp(t);
    // lee bias shifts the sand bar laterally with wave direction
    const cx = TOMB_X + 3 * Math.sin(Math.PI * tc) + K.leeX * 10 * sandGate;
    const hw = (7 + 10 * sandGate) + 9 * Math.pow(Math.abs(2 * tc - 1), 2.4);
    const dx = (x - cx) / Math.max(3, hw);
    const ht = K.crest - 2.6 * dx * dx + S[o + 12] * sandGate;
    // fade sand near hill toes so early stages stay open water in the middle
    const midGap = smoothstep(0.08, 0.35, tc) * smoothstep(0.92, 0.65, tc);
    const ht2 = lerp(seabed, ht, sandGate * (0.55 + 0.45 * midGap));
    if (ht2 > h) { h = ht2; m = ht2 > -2.2 ? MAT_SAND : MAT_SEABED; }
  }

  // --- 東灣 beach (grows after sand bar emerges; shifts with lee) ---
  if (t > 0.08 && t < 0.92 && K.wb > 4) {
    const tc = clamp(t);
    const beachR = K.wb * (0.85 + 0.25 * Math.sin(Math.PI * tc));
    // default east beach; wave-from-west pushes more sand east, from-east pushes west lagoon fill
    const shoreX = TOMB_X + 8 + 6 * Math.pow(Math.abs(2 * tc - 1), 1.8) + K.leeX * 7;
    const dx = x - shoreX;
    if (dx > -4 && dx < beachR + 16) {
      const hb = Math.min(K.crest + 0.6, 2.2) - 3.8 * (Math.max(0, dx) / Math.max(4, beachR)) + S[o + 9];
      const edge = smoothstep(beachR, beachR + 14, dx);
      const hh = lerp(hb, seabed, edge) * smoothstep(0.25, 0.55, s);
      if (hh > h) { h = hh; m = hh > -2.2 ? MAT_SAND : MAT_SEABED; }
    }
  }

  // --- west lagoon / lee bay (shallow when waves come from east) ---
  if (t > 0.12 && t < 0.88 && x < TOMB_X - 4) {
    const bay = bump(x, TOMB_X - 20 - K.leeX * 6, 20) * bump(z, 12 + K.leeZ * 10, 38);
    const leeWest = smoothstep(-0.2, 0.8, -K.leeX); // more fill when lee is west (waves from E)
    if (bay > 0.04) {
      const hb = -0.6 - 2.2 * bay + 1.2 * leeWest * sandGate + S[o + 11];
      if (hb > h && h < 1.8) { h = Math.max(h, hb); if (h < 0.35) m = h > -1.5 ? MAT_SAND : MAT_SEABED; }
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
  const t = (z - NECK_Z0 + K.leeZ * 8) / (NECK_Z1 - NECK_Z0);
  const sandGate = smoothstep(-3.8, -0.4, K.crest);
  if (t > -0.12 && t < 1.12 && sandGate > 0.08) {
    const tc = clamp(t);
    const cx = TOMB_X + 3 * Math.sin(Math.PI * tc) + K.leeX * 10 * sandGate;
    const hw = (7 + 10 * sandGate) + 9 * Math.pow(Math.abs(2 * tc - 1), 2.4);
    const dx = (x - cx) / Math.max(3, hw);
    if (Math.abs(dx) < 1.05 && K.crest > -2.2) return 2;
  }
  if (t > 0.08 && t < 0.92 && K.wb > 4) {
    const tc = clamp(t);
    const beachR = K.wb * (0.85 + 0.25 * Math.sin(Math.PI * tc));
    const shoreX = TOMB_X + 8 + 6 * Math.pow(Math.abs(2 * tc - 1), 1.8) + K.leeX * 7;
    const dx = x - shoreX;
    if (dx > -2 && dx < beachR + 6 && s > 0.3) return 2;
  }
  return 0;
}
