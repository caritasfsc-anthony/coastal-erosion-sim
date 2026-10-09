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
/** South hillmass (larger) — 南氹 / south. Tall granite cliffs. */
export const SOUTH = { x: 6, z: -88, rx: 54, rz: 70, peak: 44 };
/** North hillmass (smaller) — rocky north tip. */
export const NORTH = { x: -6, z: 98, rx: 38, rz: 46, peak: 28 };
/** Tombolo / town neck z-range. */
export const NECK_Z0 = -22, NECK_Z1 = 48;

/** Elliptical radial distance to a hillmass (1 = rim). */
function ellDist(x: number, z: number, m: { x: number; z: number; rx: number; rz: number }): number {
  return Math.hypot((x - m.x) / m.rx, (z - m.z) / m.rz);
}

/** Soft island occupancy 0…1 — hills + NE tip only (no permanent neck; sand bridge grows with stage). */
/** Irregular rocky rim offset — breaks the soft ellipse into granite-like inlets. */
function rimJitter(x: number, z: number): number {
  return 0.055 * noise2(x * 0.055, z * 0.055)
    + 0.028 * noise2(x * 0.14 + 3.1, z * 0.14)
    + 0.016 * Math.abs(noise2(x * 0.32, z * 0.28)); // angular facets
}

export function islandCore(x: number, z: number): number {
  const j = rimJitter(x, z);
  const ds = ellDist(x, z, SOUTH) + j;
  const dn = ellDist(x, z, NORTH) + j * 0.9;
  // sharper rim: steep falloff near 1.0 instead of soft blob
  const hills = Math.max(smoothstep(1.02, 0.88, ds), smoothstep(1.02, 0.88, dn));
  const tip = smoothstep(1.12, 0.62, Math.hypot((x - HX) / 13, (z - 118) / 26) + j * 0.5) * smoothstep(85, 100, z);
  return Math.max(hills, tip);
}

/** North-facing cliff line (sea to the north / +Z). Retreat moves inland (−Z). */
export function northCoast0(x: number): number {
  const u = clamp((x - NORTH.x) / (NORTH.rx * 1.06), -1, 1);
  let z = NORTH.z + NORTH.rz * Math.sqrt(Math.max(0, 1 - u * u));
  // jagged rocky outline + deep inlets (not soft hills)
  z += 3.4 * noise2(x * 0.05, 9.1) + 2.2 * noise2(x * 0.13, 2.7);
  z += 1.6 * Math.abs(noise2(x * 0.22, 5.5)) - 2.8 * bump(x, -38, 7) - 2.2 * bump(x, 8, 5.5);
  z += 16 * bump(x, HX, 18);
  return z;
}
export function northCliff(x: number, s: number): number {
  return northCoast0(x) - retreat(s) * (0.55 + 0.45 * smoothstep(-50, 40, x)); // more retreat on exposed east-north
}

/** South-facing cliff line at 南氹 (sea to the south / −Z). Retreat moves inland (+Z). */
export function southCoast0(x: number): number {
  const u = clamp((x - SOUTH.x) / (SOUTH.rx * 1.06), -1, 1);
  let z = SOUTH.z - SOUTH.rz * Math.sqrt(Math.max(0, 1 - u * u));
  // Nam Tam: irregular granite headlands / coves, angular silhouette
  z += 3.2 * noise2(x * 0.04, 4.4) + 2.0 * noise2(x * 0.11, 1.8);
  z += 1.8 * Math.abs(noise2(x * 0.2, 7.2)) - 3.5 * bump(x, 22, 9) - 2.4 * bump(x, -18, 7) - 2.0 * bump(x, 48, 6);
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
  const ds = ellDist(x, z, SOUTH);
  const dn = ellDist(x, z, NORTH);
  const core = islandCore(x, z);
  out[o] = southCoast0(x);           // 0 south coast0
  out[o + 1] = northCoast0(x);       // 1 north coast0
  out[o + 2] = core;                 // 2 island occupancy
  out[o + 3] = ds;                   // 3 south ell dist
  out[o + 4] = dn;                   // 4 north ell dist
  // hill heights — high plateau held almost to the cliff rim, then drops
  const sj = rimJitter(x, z);
  const dsJ = ds + sj * 0.3, dnJ = dn + sj * 0.25;
  // keep ~70%+ of peak near the coast so the cliff face can soar
  const sPlateau = Math.pow(Math.max(0, 1 - dsJ * 0.58), 0.35);
  const nPlateau = Math.pow(Math.max(0, 1 - dnJ * 0.58), 0.35);
  const sFacet = 0.7 * Math.abs(noise2(x * 0.07, z * 0.07)) + 0.45 * Math.abs(noise2(x * 0.19, z * 0.17));
  const nFacet = 0.55 * Math.abs(noise2(x * 0.08 + 2, z * 0.08)) + 0.35 * Math.abs(noise2(x * 0.2, z * 0.19));
  out[o + 5] = SOUTH.peak * sPlateau * (0.92 + 0.1 * fbm2(x * 0.016, z * 0.016, 3)) + sFacet * 1.6;
  out[o + 6] = NORTH.peak * nPlateau * (0.92 + 0.1 * fbm2(x * 0.02 + 2, z * 0.02, 3)) + nFacet * 1.2;
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
  if (ds < 1.32) {
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

  // --- north hillmass: steeper rocky cliffs + short platforms ---
  if (dn < 1.28) {
    const inland = nCl - z; // >0 = inland of north cliff
    if (inland > 0) {
      const hill = S[o + 6] * smoothstep(0.3, 5, inland);
      const cliffFace = S[o + 6] * Math.pow(smoothstep(-0.15, 1.15, inland), 0.32);
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
      - 7 * smoothstep(0.35, 1.05, ellDist(x, z, { x: 50, z: -75, rx: 30, rz: 24 }));
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
