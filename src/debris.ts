// Rock-fall debris at the foot of the 南氹 south cliff.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GX, southCliff } from './world';
import { hash1, noise3, smoothstep } from './noise';
import { applyWetSheen } from './wet';

interface Rock { x: number; born: number; off: number; size: number; rot: THREE.Euler; sy: number; }

export class CliffDebris {
  readonly mesh: THREE.InstancedMesh;
  private rocks: Rock[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private sc = new THREE.Vector3();

  constructor() {
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 2);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const P = g.getAttribute('position');
    for (let i = 0; i < P.count; i++) {
      this.v.fromBufferAttribute(P, i);
      const k = 1 + 0.32 * noise3(this.v.x * 1.6 + 3, this.v.y * 1.6, this.v.z * 1.6) + 0.12 * noise3(this.v.x * 4, this.v.y * 4 + 7, this.v.z * 4);
      this.v.multiplyScalar(k);
      this.v.x *= 1.15;
      P.setXYZ(i, this.v.x, this.v.y, this.v.z);
    }
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.9, metalness: 0, envMapIntensity: 0.8 });
    applyWetSheen(mat);
    let id = 0;
    // Nam Tam south cliff toe debris
    for (let x = -30; x <= 70; x += 1.8) {
      if (Math.abs(x - GX) < 6) { id++; continue; }
      const h = hash1(id * 13 + 7);
      if (h < 0.38) { id++; continue; }
      const born = -0.35 + 1.3 * hash1(id * 29 + 3);
      this.rocks.push({
        x: x + (hash1(id * 5 + 1) - 0.5) * 1.6, born, off: -(0.8 + 2.6 * hash1(id * 17 + 9)),
        size: 0.45 + 1.05 * hash1(id * 31 + 4) ** 1.5,
        rot: new THREE.Euler(hash1(id * 3) * 6.28, hash1(id * 7) * 6.28, hash1(id * 11) * 6.28), sy: 0.6 + 0.3 * hash1(id * 19),
      });
      id++;
    }
    this.mesh = new THREE.InstancedMesh(g, mat, this.rocks.length);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.update(0);
  }

  update(s: number) {
    this.rocks.forEach((r, i) => {
      const t0 = Math.max(0, r.born);
      const vis = (r.born < 0 ? 1 : smoothstep(r.born, r.born + 0.012, s)) * (1 - smoothstep(t0 + 0.12, t0 + 0.32, s));
      const k = r.size * vis;
      const z = southCliff(r.x, Math.min(s, t0)) + r.off;
      this.q.setFromEuler(r.rot);
      this.v.set(r.x, 0.05 + k * 0.25, z);
      this.sc.set(k, k * r.sy, k);
      this.m.compose(this.v, this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
