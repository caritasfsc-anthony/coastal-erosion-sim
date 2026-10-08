// Main-thread mesh containers that receive geometry from the build worker.
import * as THREE from 'three';
import { INNER_GRID, OUTER_GRID, type GridSpec, type GridResult } from './terrainCore';
import type { HeadlandMesh } from './headlandCore';

function gridGeometry(spec: GridSpec): THREE.BufferGeometry {
  const n = spec.seg + 1;
  const pos = new Float32Array(n * n * 3);
  const step = spec.size / spec.seg;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = (j * n + i) * 3;
    pos[o] = spec.min + i * step; pos[o + 2] = spec.min + j * step;
  }
  const idx = new Uint32Array(spec.seg * spec.seg * 6);
  let t = 0;
  for (let j = 0; j < spec.seg; j++) for (let i = 0; i < spec.seg; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx[t++] = a; idx[t++] = c; idx[t++] = b;
    idx[t++] = b; idx[t++] = c; idx[t++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

function applyGrid(mesh: THREE.Mesh, r: GridResult) {
  const g = mesh.geometry;
  const P = g.getAttribute('position') as THREE.BufferAttribute;
  const PA = P.array as Float32Array;
  for (let v = 0; v < r.heights.length; v++) PA[v * 3 + 1] = r.heights[v];
  P.needsUpdate = true;
  (g.getAttribute('normal') as THREE.BufferAttribute).copyArray(r.normals).needsUpdate = true;
  (g.getAttribute('color') as THREE.BufferAttribute).copyArray(r.colors).needsUpdate = true;
  g.computeBoundingSphere();
}

export class LandMeshes {
  readonly inner: THREE.Mesh;
  readonly outer: THREE.Mesh;
  readonly headland: THREE.Mesh;
  readonly heightTex: THREE.DataTexture;

  constructor(material: THREE.Material) {
    this.inner = new THREE.Mesh(gridGeometry(INNER_GRID), material);
    this.inner.receiveShadow = true; this.inner.castShadow = true;
    this.outer = new THREE.Mesh(gridGeometry(OUTER_GRID), material);
    this.outer.receiveShadow = true;
    this.headland = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.headland.castShadow = true; this.headland.receiveShadow = true;
    const n = INNER_GRID.seg + 1;
    this.heightTex = new THREE.DataTexture(new Uint8Array(n * n * 4), n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.heightTex.magFilter = THREE.LinearFilter;
    this.heightTex.minFilter = THREE.LinearFilter;
  }

  apply(head: HeadlandMesh, terrain: { inner: GridResult; outer: GridResult; tex: Uint8Array }) {
    applyGrid(this.inner, terrain.inner);
    applyGrid(this.outer, terrain.outer);
    (this.heightTex.image.data as Uint8Array).set(terrain.tex);
    this.heightTex.needsUpdate = true;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(head.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(head.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(head.colors, 3));
    g.setIndex(new THREE.BufferAttribute(head.indices, 1));
    g.computeBoundingSphere();
    const old = this.headland.geometry;
    this.headland.geometry = g;
    old.dispose();
  }
}
