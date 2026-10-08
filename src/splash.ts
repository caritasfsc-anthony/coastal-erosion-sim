// Wave-impact spray. Each source "listens" to the swell at its location and fires when a crest
// actually arrives, so every burst of spray lines up with a visible wave striking the rock.
import * as THREE from 'three';
import { waveHeight } from './water';

const MAX = 5200;

export interface SplashSource {
  p: THREE.Vector3;   // impact point on the waterline (x, z; y is ignored)
  n: THREE.Vector3;   // seaward-facing normal of the struck face
  w: number;          // relative strength / width
  face?: number;      // height of the struck face (spray climbs it)
  key?: string;       // stable id so wave tracking survives source updates
  active?: boolean;   // the highlighted "strike zone"
  h?: number; dh?: number; cool?: number;
}

const WHITE = [1.0, 1.0, 0.98], MIST = [0.92, 0.96, 1.0], DUST = [0.62, 0.52, 0.41];

export class Splash {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX).fill(1);
  private alpha = new Float32Array(MAX);
  private a0 = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private cursor = 0;
  private srcs: SplashSource[] = [];
  energy = 1;
  level = 0;
  /** Called on every wave strike (after spray is emitted). */
  onImpact: ((src: SplashSource, strength: number) => void) | null = null;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader: /* glsl */ `attribute float aAlpha; attribute float aSize; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC;
        void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uScale/-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c);
        float a = exp(-d*d*14.0) - 0.03; if (a*vA < 0.01) discard; gl_FragColor = vec4(vC*1.1, a*vA*0.6); }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  set sources(list: SplashSource[]) {
    const old = new Map(this.srcs.filter((s) => s.key).map((s) => [s.key!, s]));
    for (const s of list) {
      const o = s.key ? old.get(s.key) : undefined;
      if (o) { s.h = o.h; s.dh = o.dh; s.cool = o.cool; }
    }
    this.srcs = list;
  }
  get sources(): SplashSource[] { return this.srcs; }

  private emit(x: number, y: number, z: number, vx: number, vy: number, vz: number,
    life: number, size: number, grow: number, grav: number, drag: number, a: number, c: number[]) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % MAX;
    const o = i * 3;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
    this.vel[o] = vx; this.vel[o + 1] = vy; this.vel[o + 2] = vz;
    this.col[o] = c[0]; this.col[o + 1] = c[1]; this.col[o + 2] = c[2];
    this.life[i] = this.maxLife[i] = life;
    this.size[i] = size; this.grow[i] = grow; this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = a;
  }

  /** A breaking wave slams into a rock face: a sheet of spray climbs the face, droplets arc back, mist hangs. */
  impact(src: SplashSource, strength: number) {
    const E = 0.55 + 0.45 * this.energy;
    const k = Math.max(0.25, strength) * src.w * (0.45 + 0.55 * this.energy);
    const nx = src.n.x, nz = src.n.z, tx = -nz, tz = nx;
    const width = 1.6 + 1.6 * src.w;
    const face = src.face ?? 8;
    const R = Math.random;
    const yb = this.level + 0.15;
    // 1) spray sheet climbing the struck face
    const nSheet = Math.round(95 * k);
    for (let c = 0; c < nSheet; c++) {
      const u = (R() - 0.5) * 2 * width;
      const up = (7 + R() * 9) * E * (0.65 + 0.5 * strength) * Math.min(1.25, 0.55 + face / 18);
      const out = 0.4 + R() * 2.2;
      this.emit(src.p.x + tx * u + nx * 0.5, yb + R() * 0.5, src.p.z + tz * u + nz * 0.5,
        nx * out + tx * (R() - 0.5) * 2.2, up, nz * out + tz * (R() - 0.5) * 2.2,
        0.9 + R() * 0.9, 0.35 + R() * 0.6, 1.1, 14, 0.985, 0.9, WHITE);
    }
    // 2) heavy droplets thrown back to sea
    const nDrop = Math.round(34 * k);
    for (let c = 0; c < nDrop; c++) {
      const u = (R() - 0.5) * 2 * width;
      this.emit(src.p.x + tx * u + nx * 0.8, yb + 0.3 + R() * 1.5, src.p.z + tz * u + nz * 0.8,
        nx * (3 + R() * 5) + tx * (R() - 0.5) * 3, (3 + R() * 6) * E, nz * (3 + R() * 5) + tz * (R() - 0.5) * 3,
        0.7 + R() * 0.7, 0.25 + R() * 0.4, 0.3, 15, 0.99, 1, WHITE);
    }
    // 3) lingering sea mist drifting off the face
    const nMist = Math.round(14 * k);
    for (let c = 0; c < nMist; c++) {
      const u = (R() - 0.5) * 2 * width;
      this.emit(src.p.x + tx * u + nx * 1.2, yb + 0.6 + R() * face * 0.35, src.p.z + tz * u + nz * 1.2,
        nx * (0.6 + R()) + tx * (R() - 0.5), 1 + R() * 2.2 * E, nz * (0.6 + R()) + tz * (R() - 0.5),
        2 + R() * 1.6, 2 + R() * 2.2, 2.2, 0.6, 0.96, 0.3, MIST);
    }
    // 4) foam churned on the water at the foot of the face
    const nFoam = Math.round(22 * k);
    for (let c = 0; c < nFoam; c++) {
      const u = (R() - 0.5) * 2.4 * width, d = R() * 3.5;
      this.emit(src.p.x + tx * u + nx * d, yb + 0.05, src.p.z + tz * u + nz * d,
        nx * (0.8 + R() * 1.5), 0.6 + R(), nz * (0.8 + R() * 1.5),
        1.2 + R() * 1.0, 1 + R() * 1.1, 1.2, 2.5, 0.95, 0.75, WHITE);
    }
  }

  /** Rock collapse: dust cloud + boulders crashing into the sea. */
  collapse(p: THREE.Vector3, radius: number, height: number) {
    const R = Math.random;
    for (let c = 0; c < 140; c++) {
      const a = R() * Math.PI * 2, r = R() * radius;
      this.emit(p.x + Math.cos(a) * r, 1 + R() * height, p.z + Math.sin(a) * r,
        Math.cos(a) * (0.5 + R() * 2), 0.5 + R() * 2.5, Math.sin(a) * (0.5 + R() * 2),
        2.2 + R() * 2.2, 1.5 + R() * 2.5, 1.8, -0.2, 0.97, 0.55, DUST);
    }
    for (let c = 0; c < 260; c++) {
      const a = R() * Math.PI * 2, r = radius * (0.6 + R() * 0.8);
      const sp = 4 + R() * 6;
      this.emit(p.x + Math.cos(a) * r, this.level + 0.2, p.z + Math.sin(a) * r,
        Math.cos(a) * sp * 0.5, 6 + R() * 12, Math.sin(a) * sp * 0.5,
        1 + R() * 1.2, 0.35 + R() * 0.8, 1.2, 14, 0.985, 1, WHITE);
    }
  }

  update(dt: number, time: number) {
    const E = this.energy;
    for (const s of this.srcs) {
      if (s.w <= 0) continue;
      const h = waveHeight(s.p.x, s.p.z, time);
      s.cool = (s.cool ?? Math.random() * 0.8) - dt;
      if (s.h !== undefined && s.dh !== undefined) {
        const dh = h - s.h;
        // local crest arriving: rising → falling, and tall enough to break on the rock
        if (s.dh > 0 && dh <= 0 && h > 0.32 - 0.12 * Math.min(E, 1.6) && s.cool <= 0) {
          const strength = Math.min(1, (h + 0.1) / 0.85);
          s.cool = 1.1;
          if (Math.random() < 0.55 + 0.35 * E || s.active) {
            this.impact(s, strength * (s.active ? 1.25 : 1));
            this.onImpact?.(s, strength);
          }
        }
        s.dh = dh;
      }
      s.h = h;
    }
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const o = i * 3;
      this.vel[o + 1] -= this.grav[i] * dt;
      const dr = Math.pow(this.drag[i], dt * 60);
      this.vel[o] *= dr; this.vel[o + 2] *= dr; if (this.grav[i] < 3) this.vel[o + 1] *= dr;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      if (this.pos[o + 1] < this.level - 0.1 && this.vel[o + 1] < 0) { this.life[i] = Math.min(this.life[i], 0.12); }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.max(0, Math.min(1, t * 1.6, (1 - t) * 8)) * this.a0[i];
      this.size[i] += dt * this.grow[i];
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
  }
}
