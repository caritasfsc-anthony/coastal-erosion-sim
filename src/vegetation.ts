// Scattered coastal shrubs for scale and life (placed only where the land never erodes).
import * as THREE from 'three';
import { ISLAND, STATIC_FIELDS, cliffLine, stageConsts, staticSample, terrainSample, bayW } from './world';
import { hash1 } from './noise';

export function createShrubs(count = 1400): THREE.InstancedMesh {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) { // lumpy, flattened bush
    const y = pos.getY(i);
    pos.setY(i, y < 0 ? y * 0.3 : y * 0.85);
    pos.setX(i, pos.getX(i) * (1 + 0.12 * Math.sin(i * 1.7)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const st = new Float32Array(STATIC_FIELDS);
  const K = stageConsts(1);
  const smp = { h: 0, m: 0 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const cA = new THREE.Color(0x2c4426), cB = new THREE.Color(0x4a5f30), cC = new THREE.Color(0x6b6a3a), c = new THREE.Color();
  let n = 0, tries = 0;
  while (n < count && tries < count * 30) {
    tries++;
    const r1 = hash1(tries * 3 + 1), r2 = hash1(tries * 7 + 2), r3 = hash1(tries * 11 + 3);
    let x: number, z: number;
    if (r3 < 0.12) { // island top
      const a = r1 * Math.PI * 2, rr = Math.sqrt(r2) * (ISLAND.r - 7);
      x = ISLAND.x + Math.cos(a) * rr; z = ISLAND.z + Math.sin(a) * rr;
    } else { x = -230 + r1 * 460; z = -230 + r2 * 240; }
    const inland = cliffLine(x, 1) - z;
    if (r3 >= 0.12 && inland < 14 + 10 * bayW(x)) continue;
    staticSample(x, z, st, 0);
    terrainSample(x, z, st, 0, K, smp);
    if (smp.h < 4) continue;
    // reject steep spots by sampling neighbours
    staticSample(x + 2, z, st, 0); const hx = terrainSample(x + 2, z, st, 0, K, { h: 0, m: 0 }).h;
    staticSample(x, z + 2, st, 0); const hz = terrainSample(x, z + 2, st, 0, K, { h: 0, m: 0 }).h;
    if (Math.abs(hx - smp.h) > 1.6 || Math.abs(hz - smp.h) > 1.6) continue;
    const s = 0.9 + hash1(tries * 13) * 2.2;
    p.set(x, smp.h + s * 0.15, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash1(tries * 17) * 6.28);
    sc.set(s * (1 + hash1(tries * 19) * 0.6), s * (0.7 + hash1(tries * 23) * 0.5), s);
    mesh.setMatrixAt(n, m4.compose(p, q, sc));
    const t = hash1(tries * 29);
    c.copy(cA).lerp(t < 0.6 ? cB : cC, t < 0.6 ? t / 0.6 : (t - 0.6) / 0.4);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
