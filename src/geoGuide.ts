// Teaching overlay for the geo (海蝕隙): outlines the cleft rim, traces the joint / fault it is eating
// along (dashes flow inland = direction of growth) and pins short annotations. Never shown in challenge mode.
import * as THREE from 'three';
import { geoHalfWidth, geoParams, geoX, groundRaw, stageConsts } from './world';

const vert = /* glsl */ `
attribute float aU; attribute float aV; varying float vU; varying float vV;
void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const frag = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uDash; varying float vU; varying float vV;
void main(){
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vV));
  float dash = uDash > 0.5 ? smoothstep(0.35, 0.5, fract(vU*0.32 + uTime*0.55)) * (1.0 - smoothstep(0.85, 1.0, fract(vU*0.32 + uTime*0.55))) : 1.0;
  float pulse = uDash > 0.5 ? 1.0 : 0.8 + 0.2*sin(uTime*2.4 - vU*0.25);
  float a = uOpacity*edge*dash*pulse;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor*1.6, a);
}`;

function ribbonMaterial(color: number, dash: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uDash: { value: dash ? 1 : 0 } },
  });
}

/** Flat ribbon along a polyline (lying on the ground). */
function ribbon(pts: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3), u = new Float32Array(n * 2), v = new Float32Array(n * 2);
  const idx: number[] = [];
  let len = 0;
  const t = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    t.subVectors(b, a); t.y = 0; t.normalize();
    side.crossVectors(up, t).multiplyScalar(width / 2);
    if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
    pos.set([pts[i].x - side.x, pts[i].y, pts[i].z - side.z, pts[i].x + side.x, pts[i].y, pts[i].z + side.z], i * 6);
    u[i * 2] = u[i * 2 + 1] = len; v[i * 2] = -1; v[i * 2 + 1] = 1;
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  g.setAttribute('aV', new THREE.BufferAttribute(v, 1));
  g.setIndex(idx);
  return g;
}

interface Anno { el: HTMLDivElement; pos: THREE.Vector3; on: boolean; }

export class GeoGuide {
  readonly group = new THREE.Group();
  private rim: THREE.Mesh;
  private joint: THREE.Mesh;
  private matRim = ribbonMaterial(0x5eead4, false);
  private matJoint = ribbonMaterial(0xfbbf24, true);
  private annos: Record<'joint' | 'wave' | 'blow', Anno>;
  private opacity = 0;
  private want = false;
  private builtFor = -1;

  constructor(container: HTMLElement) {
    this.rim = new THREE.Mesh(new THREE.BufferGeometry(), this.matRim);
    this.joint = new THREE.Mesh(new THREE.BufferGeometry(), this.matJoint);
    this.rim.renderOrder = this.joint.renderOrder = 4;
    this.rim.frustumCulled = this.joint.frustumCulled = false;
    this.group.add(this.rim, this.joint);
    this.group.visible = false;
    const mk = (cls: string, title: string, sub: string): Anno => {
      const el = document.createElement('div');
      el.className = `anno ${cls}`;
      el.innerHTML = `<div class="tag"><b>${title}</b><small>${sub}</small></div>`;
      container.appendChild(el);
      return { el, pos: new THREE.Vector3(), on: true };
    };
    this.annos = {
      joint: mk('amber', '節理／斷層', '岩石弱點 · 裂隙將沿此伸延'),
      wave: mk('aqua', '浪沿弱點侵蝕擴大', '水力作用 · 磨蝕作用'),
      blow: mk('aqua', '噴水洞', '海蝕洞頂被浪壓穿 → 頂部崩塌後裂隙延長'),
    };
  }

  /** Rebuild the overlay for erosion stage s (call when the terrain mesh for s arrives). */
  update(s: number) {
    if (Math.abs(s - this.builtFor) < 1e-4) return;
    this.builtFor = s;
    const G = geoParams(s), K = stageConsts(s);
    const lift = 0.3;
    // rim: U-shaped outline of the open cleft (west lip → back wall → east lip)
    const west: THREE.Vector3[] = [], east: THREE.Vector3[] = [];
    const steps = Math.max(6, Math.round(G.L / 0.8));
    for (let i = 0; i <= steps; i++) {
      const z = G.clG + 0.4 - (G.L + 0.4) * (i / steps);
      const w = geoHalfWidth(z, G) + 1.05;
      const g = geoX(z);
      west.push(new THREE.Vector3(g - w, groundRaw(g - w - 0.6, z, K) + lift, z));
      east.push(new THREE.Vector3(g + w, groundRaw(g + w + 0.6, z, K) + lift, z));
    }
    const back: THREE.Vector3[] = [];
    const zb = G.zHead - 0.9, gb = geoX(zb), wb = geoHalfWidth(G.zHead, G) + 1.05;
    for (let i = 1; i < 6; i++) { const x = gb - wb + (2 * wb * i) / 6; back.push(new THREE.Vector3(x, groundRaw(x, zb - 0.4, K) + lift, zb)); }
    const rimPts = [...west, ...back, ...east.reverse()];
    this.rim.geometry.dispose();
    this.rim.geometry = ribbon(rimPts, 0.45);
    // joint: dashed trace continuing inland from the back wall (over the roofed cave + blowhole)
    const jp: THREE.Vector3[] = [];
    const z0 = G.zHead - 0.6, z1 = Math.max(-56, G.zHead - 18);
    for (let z = z0; z >= z1; z -= 0.8) { const x = geoX(z); jp.push(new THREE.Vector3(x, groundRaw(x, z, K) + lift + 0.05, z)); }
    this.joint.geometry.dispose();
    this.joint.geometry = ribbon(jp, 0.55);
    // annotations
    const ja = jp[Math.min(jp.length - 1, Math.round(jp.length * 0.72))];
    this.annos.joint.pos.copy(ja).setY(ja.y + 0.5);
    const zw = G.clG - G.L * 0.3, xw = geoX(zw) - geoHalfWidth(zw, G) - 1.8;
    this.annos.wave.pos.set(xw, groundRaw(xw - 0.6, zw, K) + 0.6, zw);
    this.annos.blow.on = !!G.blow;
    if (G.blow) this.annos.blow.pos.set(G.blow.x, groundRaw(G.blow.x + 1.5, G.blow.z, K) + 0.6, G.blow.z);
  }

  set visible(v: boolean) { this.want = v; }

  tick(dt: number, t: number, camera: THREE.Camera) {
    this.opacity += ((this.want ? 1 : 0) - this.opacity) * Math.min(1, dt * 3);
    const on = this.opacity > 0.01;
    this.group.visible = on;
    this.matRim.uniforms.uOpacity.value = 0.85 * this.opacity;
    this.matJoint.uniforms.uOpacity.value = 0.95 * this.opacity;
    this.matRim.uniforms.uTime.value = t; this.matJoint.uniforms.uTime.value = t;
    const w = window.innerWidth, h = window.innerHeight, p = new THREE.Vector3();
    for (const a of Object.values(this.annos)) {
      p.copy(a.pos).project(camera);
      const vis = this.want && a.on && p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
      a.el.classList.toggle('show', vis);
      if (!on) continue;
      a.el.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px)`;
    }
  }
}
