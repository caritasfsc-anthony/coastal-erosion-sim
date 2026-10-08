// Naive Surface Nets isosurface extraction on a regular grid (inside = value < 0).

const CORNERS: number[][] = [];
for (let c = 0; c < 8; c++) CORNERS.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
const EDGES: [number, number][] = [];
for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
  const d = a ^ b;
  if (d === 1 || d === 2 || d === 4) EDGES.push([a, b]);
}

export interface NetsResult { positions: Float32Array; indices: Uint32Array; }

export function surfaceNets(
  field: Float32Array, nx: number, ny: number, nz: number,
  origin: [number, number, number], cell: [number, number, number],
): NetsResult {
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [];
  const v = new Float32Array(8);
  const offs = CORNERS.map(([a, b, c]) => a + nx * (b + ny * c));

  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const base = idx(i, j, k);
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = field[base + offs[c]]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      const ia = (mask >> a) & 1, ib = (mask >> b) & 1;
      if (ia === ib) continue;
      const t = v[a] / (v[a] - v[b]);
      const A = CORNERS[a], B = CORNERS[b];
      sx += A[0] + (B[0] - A[0]) * t;
      sy += A[1] + (B[1] - A[1]) * t;
      sz += A[2] + (B[2] - A[2]) * t;
      n++;
    }
    cellVert[base] = pos.length / 3;
    pos.push(
      origin[0] + (i + sx / n) * cell[0],
      origin[1] + (j + sy / n) * cell[1],
      origin[2] + (k + sz / n) * cell[2],
    );
  }

  const ind: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) ind.push(a, c, b, a, d, c); else ind.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const p = idx(i, j, k);
    const inside = field[p] < 0;
    // edge along +x : cells sharing it vary in (y, z)
    if (i < nx - 1 && inside !== (field[p + 1] < 0)) {
      quad(cellVert[idx(i, j - 1, k - 1)], cellVert[idx(i, j, k - 1)], cellVert[idx(i, j, k)], cellVert[idx(i, j - 1, k)], !inside);
    }
    // edge along +y : cyclic (z, x)
    if (j < ny - 1 && inside !== (field[p + nx] < 0)) {
      quad(cellVert[idx(i - 1, j, k - 1)], cellVert[idx(i - 1, j, k)], cellVert[idx(i, j, k)], cellVert[idx(i, j, k - 1)], !inside);
    }
    // edge along +z : cyclic (x, y)
    if (k < nz - 1 && inside !== (field[p + nx * ny] < 0)) {
      quad(cellVert[idx(i - 1, j - 1, k)], cellVert[idx(i, j - 1, k)], cellVert[idx(i, j, k)], cellVert[idx(i - 1, j, k)], !inside);
    }
  }
  return { positions: new Float32Array(pos), indices: new Uint32Array(ind) };
}
