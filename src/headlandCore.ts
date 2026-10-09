// Headland signed-distance volume + surface-nets meshing (runs inside the build worker).
import { fbm3, hash1, noise2, noise3, smoothstep } from './noise';
import { HEAD_BODY_END, HX, SEGMENTS, caveParams, caveZ, headHalfWidth, headTop, phase, stackGeom } from './world';
import { surfaceNets } from './surfaceNets';
import { rockColor, type RGB } from './palette';

export const DOMAIN = {
  // NE tip of Cheung Chau teaching silhouette (海蝕洞→拱→柱) — extend +Z so offshore stacks fit
  origin: [HX - 22, -3.2, 82] as [number, number, number],
  cell: [0.7, 0.62, 0.85] as [number, number, number],
  n: [66, 52, 120] as [number, number, number],
};

function ellipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number): number {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return (k0 * (k0 - 1)) / Math.max(k1, 1e-6);
}

interface SegState { p: number; zc: number; cv: ReturnType<typeof caveParams>; st: ReturnType<typeof stackGeom>; }

function segSDF(k: number, S: SegState, x: number, y: number, z: number, w: number, top0: number): number {
  const seg = SEGMENTS[k];
  const { p, zc, cv, st } = S;
  const ax = Math.abs(x - HX);
  const top = top0 + (1.6 - top0) * cv.stump;
  let d = Math.max(ax - w, y - top, seg.a - 2.5 - z, z - st.zEnd);
  // undercutting comes first: waves hammer a deepening notch at the waterline where the cave will open
  const early = smoothstep(0.0, 0.14, p) * (1 - cv.collapse);
  if (early > 0) d += 1.6 * early * Math.exp(-((y - 0.7) ** 2) / (y > 0.7 ? 1.4 : 0.5)) * Math.exp(-((z - zc) ** 2) / 34);
  if (cv.collapse < 1 && cv.cp > 0) {
    const cy = cv.ry * 0.22;
    const e1 = ellipsoid(x - (HX + w + 0.5), y - cy, z - zc, cv.rx, cv.ry, cv.rz);
    const e2 = ellipsoid(x - (HX - w - 0.5), y - cy, z - zc, cv.rx * 0.92, cv.ry * 0.95, cv.rz);
    d = Math.max(d, -Math.min(e1, e2));
  }
  if (cv.collapse > 0) {
    const cutBottom = top + 2 + (-6 - top - 2) * cv.collapse;
    // Carve through to cutSea so a clear water gap opens before the offshore stack
    const cutSea = st.cutSea ?? (st.z0 - (st.gapClear ?? 6));
    const cut = Math.max(seg.a - 3 - z, z - cutSea, cutBottom - y);
    d = Math.max(d, -cut);
    if (cv.stack > 0) {
      let dc = Math.max(Math.hypot(x - HX, z - st.zs) - st.r, y - top);
      // waves wrap round the stack and cut a notch into its base until it topples
      dc += 1.5 * smoothstep(0.64, 0.9, p) * (1 - 0.6 * cv.stump) * Math.exp(-((y - 0.8) ** 2) / (y > 0.8 ? 1.5 : 0.5));
      d = d + (dc - d) * cv.stack;
    }
    // fallen roof blocks: dumped instantly by the collapse, then slowly ground down (attrition)
    const fade = smoothstep(0.565, 0.6, p) * smoothstep(0.97, 0.78, p);
    if (fade > 0.01) {
      for (let i = 0; i < 6; i++) {
        const hx = hash1(k * 31 + i * 7), hz = hash1(k * 17 + i * 13 + 5), hr = hash1(k * 5 + i * 3 + 11);
        const bx = HX + (hx - 0.5) * w * 1.6;
        const bz = seg.a + 1 + hz * (st.z0 - seg.a);
        const br = (1.1 + 1.9 * hr) * fade;
        d = Math.min(d, Math.hypot(x - bx, (y - 0.3) * 1.25, z - bz) - br);
      }
    }
    // the toppled stack leaves a rubble apron round the stump
    const rub = smoothstep(0.86, 0.93, p);
    if (rub > 0.01) {
      for (let i = 0; i < 6; i++) {
        const a = hash1(k * 41 + i * 9) * Math.PI * 2, rr = st.r + 1 + 2.4 * hash1(k * 23 + i * 5 + 2);
        const br = (0.9 + 1.3 * hash1(k * 7 + i * 11 + 3)) * rub;
        d = Math.min(d, Math.hypot(x - (HX + Math.cos(a) * rr), (y - 0.1) * 1.3, z - (st.zs + Math.sin(a) * rr)) - br);
      }
    }
  }
  return d;
}

export interface HeadlandMesh { positions: Float32Array; indices: Uint32Array; normals: Float32Array; colors: Float32Array; }

export class HeadlandCore {
  readonly field: Float32Array;
  private noiseCache: Float32Array;
  private colTop: Float32Array;
  private colStrat: Float32Array;

  constructor() {
    const [nx, ny, nz] = DOMAIN.n;
    this.field = new Float32Array(nx * ny * nz);
    this.noiseCache = new Float32Array(nx * ny * nz).fill(NaN);
    this.colTop = new Float32Array(nx * nz);
    this.colStrat = new Float32Array(nx * nz);
    const [ox, , oz] = DOMAIN.origin;
    const [cx, , cz] = DOMAIN.cell;
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const x = ox + i * cx, z = oz + k * cz;
      this.colTop[k * nx + i] = headTop(x, z);
      this.colStrat[k * nx + i] = 2 * noise2(x * 0.05, z * 0.05);
    }
  }

  build(s: number): HeadlandMesh {
    const [nx, ny, nz] = DOMAIN.n;
    const [ox, oy, oz] = DOMAIN.origin;
    const [cx, cy, cz] = DOMAIN.cell;
    const F = this.field, NC = this.noiseCache;
    const S: SegState[] = SEGMENTS.map((_, k) => {
      const p = phase(s, k);
      const zc = caveZ(k);
      return { p, zc, cv: caveParams(p, headHalfWidth(zc)), st: stackGeom(k, p) };
    });
    // wave-cut notch along the whole headland waterline, deepening as erosion proceeds
    const notch = 0.7 + 1.5 * s;

    for (let k = 0; k < nz; k++) {
      const z = oz + k * cz;
      const w = headHalfWidth(z);
      for (let i = 0; i < nx; i++) {
        const x = ox + i * cx;
        const ax = Math.abs(x - HX);
        const base = i + nx * ny * k;
        if (ax - w > 4.5) { // far outside the headland footprint: no detail needed
          for (let j = 0; j < ny; j++) F[base + nx * j] = ax - w;
          continue;
        }
        const top = this.colTop[k * nx + i];
        const strat = this.colStrat[k * nx + i];
        for (let j = 0; j < ny; j++) {
          const y = oy + j * cy;
          const id = base + nx * j;
          if (y - top > 4.5) { F[id] = y - top; continue; }
          let d = Math.max(ax - w, y - top, z - HEAD_BODY_END - 2.5);
          for (let q = 0; q < SEGMENTS.length; q++) {
            const sg = SEGMENTS[q];
            if (z < sg.a - 8 || z > sg.b + 40) continue;
            const ds = segSDF(q, S[q], x, y, z, w, top);
            if (ds < d) d = ds;
          }
          if (d < 4 && d > -4) {
            let nv = NC[id];
            if (nv !== nv) {
              // angular granite facets + stratified beds (avoid soft blob)
              const facet = 1.15 * Math.abs(noise3(x * 0.11, y * 0.09, z * 0.11))
                + 0.7 * Math.abs(noise3(x * 0.28, y * 0.22, z * 0.28));
              nv = 0.55 * fbm3(x * 0.15, y * 0.18, z * 0.15, 3) + facet + 0.35 * Math.sin(y * 2.1 + strat);
              NC[id] = nv;
            }
            d += nv + notch * Math.exp(-((y - 0.8) ** 2) / (y > 0.8 ? 1.5 : 0.55));
          }
          F[id] = d;
        }
      }
    }

    const { positions, indices } = surfaceNets(F, nx, ny, nz, DOMAIN.origin, DOMAIN.cell);
    const normals = vertexNormals(positions, indices);
    const colors = new Float32Array(positions.length);
    const rgb: RGB = [0, 0, 0];
    for (let v = 0; v < positions.length; v += 3) {
      rockColor(rgb, positions[v], positions[v + 1], positions[v + 2], normals[v + 1]);
      colors[v] = rgb[0]; colors[v + 1] = rgb[1]; colors[v + 2] = rgb[2];
    }
    return { positions, indices, normals, colors };
  }

  solidAt(x: number, z: number, y = 0.4): boolean {
    const [nx, ny, nz] = DOMAIN.n;
    const [ox, oy, oz] = DOMAIN.origin;
    const [cx, cy, cz] = DOMAIN.cell;
    const i = Math.round((x - ox) / cx), j = Math.round((y - oy) / cy), k = Math.round((z - oz) / cz);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return false;
    return this.field[i + nx * (j + ny * k)] < 0;
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
