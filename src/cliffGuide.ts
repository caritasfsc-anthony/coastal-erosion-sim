// Teaching overlay for 南氹 海崖：海蝕凹地 → 崩塌 → 海崖／浪蝕平台（對照香港地理教科書示意圖）.
import * as THREE from 'three';
import { groundRaw, southCliff, stageConsts } from './world';

const vert = /* glsl */ `
attribute float aU; attribute float aV; varying float vU; varying float vV;
void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const frag = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uDash; varying float vU; varying float vV;
void main(){
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vV));
  float dash = uDash > 0.5 ? smoothstep(0.35, 0.5, fract(vU*0.28 + uTime*0.5)) * (1.0 - smoothstep(0.85, 1.0, fract(vU*0.28 + uTime*0.5))) : 1.0;
  float pulse = uDash > 0.5 ? 1.0 : 0.82 + 0.18*sin(uTime*2.2 - vU*0.2);
  float a = uOpacity*edge*dash*pulse;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor*1.55, a);
}`;

function ribbonMaterial(color: number, dash: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uDash: { value: dash ? 1 : 0 } },
  });
}

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

/** Stage thresholds for 南氹 cliff teaching beats (exported for collapse toast / story). */
export const CLIFF_NOTCH_PEAK = 0.18;
export const CLIFF_COLLAPSE_S = 0.24;

export class CliffGuide {
  readonly group = new THREE.Group();
  private notchLine: THREE.Mesh;
  private platLine: THREE.Mesh;
  private matNotch = ribbonMaterial(0xfb923c, false);
  private matPlat = ribbonMaterial(0x5eead4, true);
  private annos: Record<'slope' | 'notch' | 'collapse' | 'cliff' | 'plat', Anno>;
  private opacity = 0;
  private want = false;
  private builtFor = -1;
  private phase: 'slope' | 'notch' | 'collapse' | 'cliff' = 'slope';

  constructor(container: HTMLElement) {
    this.notchLine = new THREE.Mesh(new THREE.BufferGeometry(), this.matNotch);
    this.platLine = new THREE.Mesh(new THREE.BufferGeometry(), this.matPlat);
    this.notchLine.renderOrder = this.platLine.renderOrder = 4;
    this.notchLine.frustumCulled = this.platLine.frustumCulled = false;
    this.group.add(this.notchLine, this.platLine);
    this.group.visible = false;
    const mk = (cls: string, title: string, sub: string): Anno => {
      const el = document.createElement('div');
      el.className = `anno ${cls}`;
      el.innerHTML = `<div class="tag"><b>${title}</b><small>${sub}</small></div>`;
      container.appendChild(el);
      return { el, pos: new THREE.Vector3(), on: true };
    };
    this.annos = {
      slope: mk('amber', '原本的坡面', '侵蝕前較和緩的岩岸'),
      notch: mk('coral', '海蝕凹地', '浪在潮間帶掏空崖腳（wave-cut notch）'),
      collapse: mk('coral', '崩塌', '凹地頂部失去支撐 → 崩落'),
      cliff: mk('aqua', '海崖', '崩塌後形成陡峭岩壁'),
      plat: mk('aqua', '浪蝕平台', '岩屑被沖走後留下平緩岩台'),
    };
  }

  update(s: number) {
    if (Math.abs(s - this.builtFor) < 1e-4) return;
    this.builtFor = s;
    const K = stageConsts(s);
    const lift = 0.35;
    // Phase for which labels to show
    if (s < 0.1) this.phase = 'slope';
    else if (s < CLIFF_COLLAPSE_S - 0.01) this.phase = 'notch';
    else if (s < CLIFF_COLLAPSE_S + 0.06) this.phase = 'collapse';
    else this.phase = 'cliff';

    // Notch ribbon along waterline undercut (x across 南氹)
    const notchPts: THREE.Vector3[] = [];
    for (let x = -8; x <= 48; x += 2.2) {
      const cl = southCliff(x, s);
      const z = cl + 0.35; // just inland of cliff line = notch roof band
      const y = Math.max(0.55, Math.min(2.2, groundRaw(x, z, K) * 0.15 + 1.05));
      notchPts.push(new THREE.Vector3(x, y + lift, z));
    }
    this.notchLine.geometry.dispose();
    this.notchLine.geometry = ribbon(notchPts, this.phase === 'notch' || this.phase === 'collapse' ? 0.7 : 0.4);

    // Platform apron outline (seaward of cliff)
    const platPts: THREE.Vector3[] = [];
    for (let x = -6; x <= 52; x += 3) {
      const cl = southCliff(x, s);
      const z = cl - (6 + 18 * Math.min(1, Math.max(0, (s - 0.2) / 0.7)));
      platPts.push(new THREE.Vector3(x, 0.35 + lift, z));
    }
    this.platLine.geometry.dispose();
    this.platLine.geometry = ribbon(platPts, 0.5);

    const mid = 22;
    const cl = southCliff(mid, s);
    this.annos.slope.on = this.phase === 'slope';
    this.annos.notch.on = this.phase === 'notch' || this.phase === 'collapse';
    this.annos.collapse.on = this.phase === 'collapse';
    this.annos.cliff.on = this.phase === 'cliff';
    this.annos.plat.on = this.phase === 'cliff' && s > 0.32;

    // Place labels slightly seaward (−Z) so south-facing teaching cameras see them
    this.annos.slope.pos.set(mid + 14, Math.max(6, groundRaw(mid + 14, cl + 8, K) * 0.4 + 5), cl + 6);
    this.annos.notch.pos.set(mid - 4, 3.2, cl - 2.5);
    this.annos.collapse.pos.set(mid + 6, 14, cl - 1.0);
    this.annos.cliff.pos.set(mid + 10, Math.max(10, groundRaw(mid + 8, cl + 1.5, K) * 0.5 + 9), cl + 1.0);
    this.annos.plat.pos.set(mid + 18, 2.0, cl - 14);
  }

  set visible(v: boolean) { this.want = v; }

  tick(dt: number, t: number, camera: THREE.Camera) {
    this.opacity += ((this.want ? 1 : 0) - this.opacity) * Math.min(1, dt * 3);
    const on = this.opacity > 0.01;
    this.group.visible = on;
    const notchBoost = this.phase === 'notch' || this.phase === 'collapse' ? 1 : 0.45;
    this.matNotch.uniforms.uOpacity.value = 0.95 * this.opacity * notchBoost;
    this.matPlat.uniforms.uOpacity.value = 0.75 * this.opacity * (this.phase === 'cliff' ? 1 : 0.25);
    this.matNotch.uniforms.uTime.value = t;
    this.matPlat.uniforms.uTime.value = t;
    const w = window.innerWidth, h = window.innerHeight, p = new THREE.Vector3();
    for (const a of Object.values(this.annos)) {
      p.copy(a.pos).project(camera);
      const vis = this.want && a.on && p.z < 1 && Math.abs(p.x) < 1.08 && Math.abs(p.y) < 1.08;
      a.el.classList.toggle('show', vis);
      if (!on) continue;
      a.el.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px)`;
    }
  }
}
