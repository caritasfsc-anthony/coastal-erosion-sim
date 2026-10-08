// Spray bursts where breaking waves hit rock: fun visual cue of active erosion.
import * as THREE from 'three';

const MAX = 1400;

export class Splash {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX).fill(1);
  private alpha = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private cursor = 0;
  private timer = 0;
  sources: { p: THREE.Vector3; n: THREE.Vector3; w: number }[] = [];
  energy = 1;
  level = 0;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader: /* glsl */ `attribute float aAlpha; attribute float aSize; uniform float uScale; varying float vA;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uScale/-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c);
        float a = exp(-d*d*14.0) - 0.03; if (a*vA < 0.01) discard; gl_FragColor = vec4(vec3(1.0,1.0,0.98)*1.1, a*vA*0.55); }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  private burst(src: { p: THREE.Vector3; n: THREE.Vector3 }, count: number) {
    for (let c = 0; c < count; c++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % MAX;
      const o = i * 3;
      const spread = 2.2;
      this.pos[o] = src.p.x + (Math.random() - 0.5) * spread * 2;
      this.pos[o + 1] = this.level + 0.2 + Math.random() * 0.6;
      this.pos[o + 2] = src.p.z + (Math.random() - 0.5) * spread * 2;
      const up = (3 + Math.random() * 9) * (0.6 + 0.5 * this.energy);
      const out = 1.5 + Math.random() * 3.5;
      this.vel[o] = src.n.x * out + (Math.random() - 0.5) * 3;
      this.vel[o + 1] = up;
      this.vel[o + 2] = src.n.z * out + (Math.random() - 0.5) * 3;
      this.life[i] = this.maxLife[i] = 0.9 + Math.random() * 0.9;
      this.size[i] = 0.35 + Math.random() * 0.8;
    }
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer <= 0 && this.sources.length) {
      this.timer = (0.12 + Math.random() * 0.35) / Math.max(0.3, this.energy);
      const tot = this.sources.reduce((a, s) => a + s.w, 0);
      let r = Math.random() * tot;
      for (const s of this.sources) { r -= s.w; if (r <= 0) { this.burst(s, Math.round(26 + 34 * this.energy)); break; } }
    }
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const o = i * 3;
      this.vel[o + 1] -= 14 * dt;
      this.vel[o] *= 0.985; this.vel[o + 2] *= 0.985;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.max(0, Math.min(1, t * 1.6)) * (this.pos[o + 1] > this.level - 0.3 ? 1 : 0);
      this.size[i] += dt * 0.9;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}
