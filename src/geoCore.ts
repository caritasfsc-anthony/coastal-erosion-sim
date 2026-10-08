// Geo (海蝕隙) signed-distance volume + surface-nets meshing (runs inside the build worker).
// A heightfield cannot show a narrow, vertical-walled slot, so inside |x - geoX| < GEO_RIN the terrain is
// dropped out of the way and this voxel mesh rebuilds the cliff with the cleft quarried along the joint:
// undercut wave-attacked walls, a boulder-strewn floor, a back wall, and a still-roofed sea cave with a
// blowhole ahead of it (the roof collapses as the cleft grows inland).
import { fbm3, hash1, lerp, noise2, noise3, smoothstep } from './noise';
import { GEO_RIN, GX, geoFloor, geoHalfWidth, geoParams, geoStripHalf, geoX, type GeoParams } from './world';
import { surfaceNets } from './surfaceNets';
import { PAL, type RGB } from './palette';
import { colorFor, rockWithJoint } from './terrainCore';
import type { HeadlandMesh } from './headlandCore';

export const GEO_DOMAIN = {
  origin: [GX - 12, -3.0, -57] as [number, number, number],
  cell: [0.42, 0.5, 0.5] as [number, number, number],
  n: [58, 58, 146] as [number, number, number],
};

const INTERIOR: RGB = [0.05, 0.055, 0.06];

export class GeoCore {
  readonly field: Float32Array;
  private gx: Float32Array;
  private P: GeoParams = geoParams(0);
  private top: Float32Array;

  constructor() {
    const [nx, ny, nz] = GEO_DOMAIN.n;
    this.field = new Float32Array(nx * ny * nz).fill(1);
    this.noiseCache = new Float32Array(nx * ny * nz).fill(NaN);
    this.gx = new Float32Array(nz);
    this.top = new Float32Array(nx * nz);
    for (let k = 0; k < nz; k++) this.gx[k] = geoX(GEO_DOMAIN.origin[2] + k * GEO_DOMAIN.cell[2]);
  }

  private noiseCache: Float32Array;
  // per-stage lookup tables (filled in build)
  private hwK = new Float32Array(0); private stripK = new Float32Array(0); private taperK = new Float32Array(0); private roofK = new Float32Array(0);
  private notchJ = new Float32Array(0);

  /** Signed "openness" of the cleft (> 0 = carved away). k/j index the z-slice / y-level. */
  private carve(x: number, y: number, z: number, k: number, j: number, dx: number, top: number, floor: number, wall: number): number {
    const P = this.P;
    const ax = Math.abs(dx);
    const notch = this.notchJ[j];                     // wave-hammered base widens first
    const flare = 0.9 * smoothstep(top - 6, top, y);  // weathered lip
    let c = Math.min(this.hwK[k] + notch + flare - ax + wall, y - floor, z - P.zHead + 0.5 * wall);
    // roofed sea cave continuing along the joint ahead of the back wall (+ blowhole through its roof)
    if (P.Lr > 0.2 && z < P.zHead + 1.2 && z > P.zHead - P.Lr - 2) {
      const hwT = (P.hwHead * 0.9 + notch * 0.6) * this.taperK[k];
      const roof = this.roofK[k] + 0.6 * wall;
      c = Math.max(c, Math.min(hwT - ax + wall, y - floor, roof - y, z - (P.zHead - P.Lr) + wall * 0.5, P.zHead + 1.2 - z));
      const b = P.blow;
      if (b) c = Math.max(c, Math.min(b.r - Math.hypot(x - b.x, z - b.z) + 0.35 * wall, y - (roof - 1.2)));
    }
    return c;
  }

  build(s: number, rawAt: (x: number, z: number) => number, rawMatAt: (x: number, z: number) => number): HeadlandMesh {
    const P = this.P = geoParams(s);
    const [nx, ny, nz] = GEO_DOMAIN.n;
    const [ox, oy, oz] = GEO_DOMAIN.origin;
    const [cx, cy, cz] = GEO_DOMAIN.cell;
    const F = this.field, NC = this.noiseCache;
    if (this.hwK.length !== nz) { this.hwK = new Float32Array(nz); this.stripK = new Float32Array(nz); this.taperK = new Float32Array(nz); this.roofK = new Float32Array(nz); this.notchJ = new Float32Array(ny); }
    for (let k = 0; k < nz; k++) {
      const z = oz + k * cz;
      this.hwK[k] = geoHalfWidth(z, P);
      this.stripK[k] = Math.min(GEO_RIN, geoStripHalf(z, P));
      const v = P.Lr > 0 ? (P.zHead - z) / P.Lr : 0;
      this.taperK[k] = 1 - 0.55 * smoothstep(0.4, 1, v);
      this.roofK[k] = P.roofY * (1 - 0.45 * smoothstep(0.3, 1, v));
    }
    for (let j = 0; j < ny; j++) this.notchJ[j] = (0.55 + 0.6 * s) * Math.exp(-((((oy + j * cy) - 0.5) / 1.7) ** 2));
    // boulders on the floor: the tools waves hurl at the walls (abrasion)
    const rocks: number[][] = [];
    for (let i = 0; i < 7; i++) {
      const u = 0.35 + 0.6 * hash1(i * 13 + 5);
      const z = P.clG - u * P.L;
      const r = (0.45 + 0.55 * hash1(i * 7 + 2)) * (0.6 + 0.4 * smoothstep(0.1, 0.5, s));
      const off = (hash1(i * 31 + 9) - 0.5) * 1.4 * geoHalfWidth(z, P);
      rocks.push([geoX(z) + off, geoFloor(z, P, 20) + r * 0.45, z, r]);
    }

    for (let k = 0; k < nz; k++) {
      const z = oz + k * cz;
      const g = this.gx[k];
      const strip = this.stripK[k];
      const zOut = z < P.zIn - 3 || z > P.zSea + 3;
      const rockNear = rocks.filter((r) => Math.abs(r[2] - z) < r[3] + 0.6);
      for (let i = 0; i < nx; i++) {
        const x = ox + i * cx;
        const dx = x - g;
        const base = i + nx * ny * k;
        // e: how far outside the strip where the heightfield has been cut away
        const e = Math.max(Math.abs(dx) - strip, P.zIn - z, z - P.zSea);
        if (zOut || e > 3) { for (let j = 0; j < ny; j++) F[base + nx * j] = 1; this.top[k * nx + i] = zOut ? 0 : rawAt(x, z); continue; }
        const h0 = rawAt(x, z);
        const gxh = (rawAt(x + 0.3, z) - rawAt(x - 0.3, z)) / 0.6, gzh = (rawAt(x, z + 0.3) - rawAt(x, z - 0.3)) / 0.6;
        const norm = Math.sqrt(1 + gxh * gxh + gzh * gzh);
        // inside (and just past) the cut-away strip the mesh sits a hair above the original ground, covering the
        // heightfield's cut edge; further out it tucks just under the intact heightfield so no seam shows
        const off = lerp(0.08, -0.16, smoothstep(1.5, 2.2, e));
        this.top[k * nx + i] = h0;
        const near = Math.abs(dx) < 7.5;
        const floor = geoFloor(z, P, h0);
        for (let j = 0; j < ny; j++) {
          const y = oy + j * cy;
          const id = base + nx * j;
          const dTop = (y - h0) / norm - off;
          if (dTop > 3 || !near) { F[id] = dTop; continue; }
          let c = this.carve(x, y, z, k, j, dx, h0, floor, 0);
          if (c > -3 && c < 3) {
            let wall = NC[id];
            if (wall !== wall) { wall = 0.55 * fbm3(x * 0.32, y * 0.21, z * 0.32, 3) + 0.25 * noise3(x * 0.9, y * 0.5, z * 0.9) + 0.16 * Math.sin(y * 1.55 + 1.6 * noise2(z * 0.08, 2.2)); NC[id] = wall; }
            c = this.carve(x, y, z, k, j, dx, h0, floor, wall);
          }
          let d = Math.max(dTop, c);
          for (const [bx, by, bz, br] of rockNear) {
            const db = Math.hypot(x - bx, (y - by) * 1.3, z - bz) - br;
            if (db < d) d = db;
          }
          F[id] = d;
        }
      }
    }

    const { positions, indices } = surfaceNets(F, nx, ny, nz, GEO_DOMAIN.origin, GEO_DOMAIN.cell);
    const normals = vertexNormals(positions, indices);
    const colors = new Float32Array(positions.length);
    const rgb: RGB = [0, 0, 0];
    for (let v = 0; v < positions.length; v += 3) {
      const x = positions[v], y = positions[v + 1], z = positions[v + 2], nY = normals[v + 1];
      const k = Math.max(0, Math.min(nz - 1, Math.round((z - oz) / cz)));
      const i = Math.max(0, Math.min(nx - 1, Math.round((x - ox) / cx)));
      const g = this.gx[k], h0 = this.top[k * nx + i];
      if (nY > 0.55 && y > h0 - 0.7) colorFor(rgb, x, z, y, rawMatAt(x, z), nY);
      else rockWithJoint(rgb, x, y, z, nY, g);
      // inside the cleft: deep, shadowed and drenched by spray
      const ax = Math.abs(x - g);
      const inZ = smoothstep(P.clG + 1.2, P.clG - 0.8, z) * smoothstep(P.zIn - 1, P.zIn + 1, z);
      const hwL = (z < P.zHead ? P.hwHead : geoHalfWidth(z, P)) + 1.4;
      const inX = smoothstep(hwL + 1.6, hwL - 0.2, ax);
      const depth = h0 - y;
      const inside = inZ * inX * smoothstep(0.2, 1.5, depth);
      if (inside > 0) {
        const cave = z < P.zHead + 0.4 && y < P.roofY + 0.5 ? 1 : 0;
        const wet = smoothstep(8, 1.5, y) * inside;
        rgb[0] += (PAL.rockWet.r * 0.8 - rgb[0]) * wet * 0.7; rgb[1] += (PAL.rockWet.g * 0.8 - rgb[1]) * wet * 0.7; rgb[2] += (PAL.rockWet.b * 0.8 - rgb[2]) * wet * 0.7;
        const al = smoothstep(1.4, 0.1, y) * smoothstep(-1.6, -0.2, y) * inside * 0.55;
        rgb[0] += (PAL.algae.r - rgb[0]) * al; rgb[1] += (PAL.algae.g - rgb[1]) * al; rgb[2] += (PAL.algae.b - rgb[2]) * al;
        const ao = Math.min(1, smoothstep(0.5, 10, depth) * 0.8 + 0.2 * inside + 0.6 * cave) * inside;
        const t = 0.8 * ao;
        rgb[0] += (INTERIOR[0] - rgb[0]) * t; rgb[1] += (INTERIOR[1] - rgb[1]) * t; rgb[2] += (INTERIOR[2] - rgb[2]) * t;
      }
      colors[v] = rgb[0]; colors[v + 1] = rgb[1]; colors[v + 2] = rgb[2];
    }
    return { positions, indices, normals, colors };
  }

  /** Land height the water shader should see here: rock, a foaming water-filled slot, or plain ground. */
  texHeight(x: number, z: number, raw: number, y = 0.3): number {
    const [nx, ny, nz] = GEO_DOMAIN.n;
    const [ox, oy, oz] = GEO_DOMAIN.origin;
    const [cx, cy, cz] = GEO_DOMAIN.cell;
    const i = Math.round((x - ox) / cx), j = Math.round((y - oy) / cy), k = Math.round((z - oz) / cz);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return raw;
    if (this.field[i + nx * (j + ny * k)] < 0) return Math.max(raw, 1.5);
    const top = this.top[k * nx + i];
    return this.carve(x, y, z, k, j, x - this.gx[k], top, geoFloor(z, this.P, top), 0) > -0.5 ? Math.min(raw, -0.7) : raw;
  }
}

function vertexNormals(P: Float32Array, I: Uint32Array): Float32Array {
  const N = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
    const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    N[a] += nx; N[a + 1] += ny; N[a + 2] += nz;
    N[b] += nx; N[b + 1] += ny; N[b + 2] += nz;
    N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
  }
  for (let v = 0; v < N.length; v += 3) {
    const l = Math.hypot(N[v], N[v + 1], N[v + 2]) || 1;
    N[v] /= l; N[v + 1] /= l; N[v + 2] /= l;
  }
  return N;
}

