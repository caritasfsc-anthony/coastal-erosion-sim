// Tasteful low building blocks on the teaching tombolo (市鎮示意).
import * as THREE from 'three';
import { NECK_Z0, NECK_Z1, TOMB_X, tomboloCrest } from './world';
import { hash1 } from './noise';

export class TownBlocks {
  readonly mesh: THREE.InstancedMesh;
  private mats: THREE.Matrix4[] = [];
  private baseY: number[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private sc = new THREE.Vector3();

  constructor(count = 90) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.6, vertexColors: true,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    const colors = [0xe8e4dc, 0xd4cfc4, 0xc8d0d8, 0xb8c4c0, 0xd8c8b8, 0xa8b8c8];
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const u = hash1(i * 7 + 1), v = hash1(i * 13 + 3);
      const z = NECK_Z0 + 8 + v * (NECK_Z1 - NECK_Z0 - 16);
      const t = (z - NECK_Z0) / (NECK_Z1 - NECK_Z0);
      const cx = TOMB_X + 3 * Math.sin(Math.PI * t);
      const hw = 7.5 + 5 * Math.pow(Math.abs(2 * t - 1), 2);
      const x = cx + (u - 0.5) * hw * 1.5;
      if (Math.abs(x - cx) > hw * 0.72) continue;
      // leave east beach clear
      if (x > cx + 4) continue;
      const w = 1.6 + 1.4 * hash1(i * 17);
      const d = 1.4 + 1.2 * hash1(i * 19);
      const h = 2.2 + 4.5 * hash1(i * 23) ** 1.2;
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hash1(i * 29) - 0.5) * 0.25);
      this.sc.set(w, h, d);
      this.p.set(x, h * 0.5, z);
      this.mats.push(this.m.clone().compose(this.p, this.q, this.sc));
      this.baseY.push(0);
      c.set(colors[Math.floor(hash1(i * 31) * colors.length)]);
      this.mesh.setColorAt(n, c);
      n++;
    }
    this.mesh.count = n;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.update(1);
  }

  update(s: number) {
    const crest = tomboloCrest(s);
    const show = crest > 0.4;
    this.mesh.visible = show;
    if (!show) return;
    const ground = Math.max(1.2, crest + 0.15);
    for (let i = 0; i < this.mats.length; i++) {
      this.m.copy(this.mats[i]);
      // lift so building feet sit on tombolo crest
      const q = new THREE.Quaternion(); const p = new THREE.Vector3(); const sc = new THREE.Vector3();
      this.m.decompose(p, q, sc);
      p.y = ground + sc.y * 0.5;
      this.mesh.setMatrixAt(i, this.m.compose(p, q, sc));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Simple west breakwater hint (避風塘防波堤示意). */
export function createBreakwater(): THREE.Mesh {
  const g = new THREE.BoxGeometry(2.2, 1.4, 48);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8680, roughness: 0.95, flatShading: true });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(TOMB_X - 28, 0.4, 10);
  mesh.rotation.y = 0.08;
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
