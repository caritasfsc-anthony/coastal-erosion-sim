// Stylised physically-inspired ocean: Gerstner swell, depth-tinted shallows, shoreline surf foam.
import * as THREE from 'three';
import { INNER } from './world';

/** Swell components shared by the GPU ocean and the CPU wave-impact timing (so spray matches the visible waves). */
export const WAVES = [
  { dx: 0.08, dz: -1.0, L: 46, A: 0.5, Q: 0.55, spd: 1.0 },
  { dx: -0.38, dz: -0.92, L: 27, A: 0.28, Q: 0.6, spd: 1.0 },
  { dx: 0.55, dz: -0.83, L: 16, A: 0.16, Q: 0.6, spd: 1.1 },
  { dx: -0.85, dz: -0.52, L: 9, A: 0.07, Q: 0.5, spd: 1.2 },
].map((w) => {
  const l = Math.hypot(w.dx, w.dz), k = (2 * Math.PI) / w.L;
  return { ...w, dx: w.dx / l, dz: w.dz / l, k, om: Math.sqrt(9.8 * k) * w.spd };
});

/** Wave approach angle in radians (0 = default baked dirs). Rotates sample space so spray matches GPU. */
let _waveAng = 0;
export function setWaveAngleRad(a: number) { _waveAng = a; }
export function getWaveAngleRad() { return _waveAng; }

/** Normalised swell height (≈ -1…1) at (x, z) and time t — identical phase to the shader. */
export function waveHeight(x: number, z: number, t: number): number {
  const c = Math.cos(-_waveAng), s = Math.sin(-_waveAng);
  const rx = c * x - s * z, rz = s * x + c * z;
  let h = 0;
  for (const w of WAVES) h += w.A * Math.sin(w.k * (w.dx * rx + w.dz * rz) - w.om * t);
  return h;
}

const f = (v: number) => v.toFixed(5);
const GERSTNER_CALLS = WAVES.map((w) =>
  `gerstner(vec2(${f(w.dx)},${f(w.dz)}), ${f(w.L)}, ${f(w.A)}*a, ${f(w.Q)}, ${f(w.spd)}, p, uTime, P, N);`).join('\n  ');

const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
`;

const LAND = /* glsl */ `
uniform sampler2D uHeight; uniform vec3 uHeightRect;
float landH(vec2 xz){ vec2 uv=(xz-uHeightRect.xy)/uHeightRect.z;
  if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) return -16.0;
  return texture2D(uHeight, uv).r*72.0-28.0; }
`;

const vert = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uLevel; uniform float uSurge; uniform float uWaveAng;
varying vec3 vWorld; varying vec3 vN; varying float vCrest; varying float vSurge;
${LAND}
void gerstner(vec2 D0, float L, float A, float Q, float spd, vec2 pWorld, float t, inout vec3 P, inout vec3 N){
  float ca = cos(uWaveAng), sa = sin(uWaveAng);
  vec2 D = vec2(ca*D0.x - sa*D0.y, sa*D0.x + ca*D0.y);
  float k = 6.28318/L; float w = sqrt(9.8*k)*spd; float f = k*dot(D,pWorld) - w*t;
  float c = cos(f), s = sin(f);
  P.x += Q*A*D.x*c; P.z += Q*A*D.y*c; P.y += A*s;
  N.x -= D.x*k*A*c; N.z -= D.y*k*A*c; N.y -= Q*k*A*s;
}
void main(){
  vec4 wp = modelMatrix*vec4(position,1.0);
  vec2 p = wp.xz;
  float depth = uLevel - landH(p);
  float att = mix(0.25, 1.0, smoothstep(-0.2, 5.0, depth));
  float far = 1.0 - smoothstep(260.0, 335.0, length(p));
  float a = uAmp*att*far;
  vec3 P = vec3(p.x, uLevel, p.y); vec3 N = vec3(0.0,1.0,0.0);
  ${GERSTNER_CALLS}
  vCrest = (P.y-uLevel)/max(0.2, 0.9*a+0.001);
  // surge / run-up — phase uses rotated wave dirs (same as gerstner)
  float _ca = cos(uWaveAng), _sa = sin(uWaveAng);
  float hNorm = ${WAVES.map((w) => `${f(w.A)}*sin(${f(w.k)}*dot(vec2(_ca*${f(w.dx)}-_sa*${f(w.dz)},_sa*${f(w.dx)}+_ca*${f(w.dz)}), p) - ${f(w.om)}*uTime)`).join(' + ')};
  float surge = pow(clamp(hNorm*1.15, 0.0, 1.0), 2.0);
  float nearShore = 1.0 - smoothstep(-0.5, 4.5, depth);
  P.y += uSurge*uAmp*surge*nearShore*far;
  vSurge = surge*nearShore;
  vN = normalize(N);
  vWorld = P;
  gl_Position = projectionMatrix*viewMatrix*vec4(P,1.0);
}`;

const frag = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uOuter; uniform float uAmp;
varying float vSurge;
uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFoam, uSkyTop, uSkyHorizon, uFogColor;
uniform float uFogDensity;
varying vec3 vWorld; varying vec3 vN; varying float vCrest;
${LAND}
${NOISE}
void main(){
  float r = length(vWorld.xz);
  if (uOuter < 0.5 && r > 340.0) discard;
  if (uOuter > 0.5 && r < 340.0) discard;
  float depth = vWorld.y - landH(vWorld.xz);
  // Dry land (sand/rock above water): hide water so foam never "washes through" the tombolo
  if (depth < -0.12) discard;
  vec2 q = vWorld.xz;
  // micro detail normal
  float e = 0.6;
  vec2 m1 = q*0.22 + vec2(uTime*0.35, -uTime*0.5);
  vec2 m2 = q*0.41 + vec2(-uTime*0.6, -uTime*0.2);
  float h0 = fbm(m1)+0.5*fbm(m2);
  float hx = fbm(m1+vec2(e*0.22,0.0))+0.5*fbm(m2+vec2(e*0.41,0.0));
  float hz = fbm(m1+vec2(0.0,e*0.22))+0.5*fbm(m2+vec2(0.0,e*0.41));
  vec3 N = normalize(vN + vec3(h0-hx, 0.0, h0-hz)*1.4);
  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  float NdV = max(dot(N,V), 0.0);
  float fres = 0.02 + 0.98*pow(1.0-NdV, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uSkyHorizon, uSkyTop, pow(clamp(R.y,0.0,1.0), 0.6));
  sky += uSunColor*pow(max(dot(R,uSunDir),0.0), 12.0)*0.35;
  float dt = smoothstep(0.0, 10.0, depth);
  vec3 body = mix(uShallow, uDeep, dt);
  // light scattering through wave crests
  body += uShallow*0.35*smoothstep(0.2, 1.0, vCrest)*max(dot(uSunDir, -V)*0.5+0.5, 0.0);
  vec3 col = mix(body, sky, fres*0.85);
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N,H),0.0), 600.0)*5.0 + pow(max(dot(N,H),0.0), 60.0)*0.25;
  col += uSunColor*spec;
  // foam: shoreline wash + travelling surf bands + crest whitecaps
  float n1 = fbm(q*0.12 + vec2(uTime*0.04, uTime*0.07));
  float n2 = fbm(q*0.55 - vec2(uTime*0.15, uTime*0.3));
  // whitewater widens and brightens as each crest surges in, then drains away
  float shore = 1.0 - smoothstep(0.0, 0.6 + 0.7*n1 + 1.2*vSurge*uAmp, depth);
  float band = smoothstep(0.55, 1.0, sin(depth*2.1 - uTime*1.7 + n1*4.0)) * (1.0 - smoothstep(0.3, 3.8 + 2.0*vSurge, depth));
  // lacy, torn whitewater sheet that floods in with each surge and drains back
  float lace = smoothstep(0.42, 0.62, fbm(q*0.9 + vec2(uTime*0.2, -uTime*0.35)) + 0.35*n2 - 0.15);
  float wash = vSurge*lace*(1.0 - smoothstep(0.3, 4.5, depth));
  float big = smoothstep(0.45, 0.75, fbm(q*0.018 + vec2(uTime*0.01, 0.0)));
  float crest = smoothstep(0.7, 1.05, vCrest + n1*0.5 - 0.25) * 0.45 * big * smoothstep(0.6, 1.4, uAmp);
  float foam = clamp(shore*1.05 + band*0.78 + crest, 0.0, 1.0) * smoothstep(0.28, 0.66, n2 + shore*0.16 + band*0.1);
  foam = max(foam, wash*0.95);
  foam *= smoothstep(-0.2, 0.35, depth); // kill foam on dry sand crest
  col = mix(col, uFoam, foam);
  float alpha = mix(0.42, 0.95, smoothstep(0.0, 5.0, depth));
  alpha = max(max(alpha, foam), fres);
  float fog = 1.0 - exp(-pow(uFogDensity*dist, 2.0));
  col = mix(col, uFogColor, fog);
  alpha = mix(alpha, 1.0, fog);
  gl_FragColor = vec4(col, alpha);
}`;

export interface WaterOptions {
  heightTex: THREE.Texture; sunDir: THREE.Vector3; sunColor: THREE.Color;
  skyTop: THREE.Color; skyHorizon: THREE.Color; fogColor: THREE.Color; fogDensity: number;
}

export class Water {
  readonly group = new THREE.Group();
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(o: WaterOptions) {
    this.uniforms = {
      uTime: { value: 0 }, uAmp: { value: 1 }, uLevel: { value: 0 }, uSurge: { value: 0.75 }, uWaveAng: { value: 0 },
      uHeight: { value: o.heightTex },
      uHeightRect: { value: new THREE.Vector3(INNER.min, INNER.min, INNER.size) },
      uSunDir: { value: o.sunDir }, uSunColor: { value: o.sunColor },
      uDeep: { value: new THREE.Color(0x083648) }, uShallow: { value: new THREE.Color(0x35c0b4) },
      uFoam: { value: new THREE.Color(0xf7faf8) },
      uSkyTop: { value: o.skyTop }, uSkyHorizon: { value: o.skyHorizon },
      uFogColor: { value: o.fogColor }, uFogDensity: { value: o.fogDensity },
    };
    const make = (outer: boolean) => new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uOuter: { value: outer ? 1 : 0 } },
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
    });
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 350, 350).rotateX(-Math.PI / 2), make(false));
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 20, 20).rotateX(-Math.PI / 2), make(true));
    inner.renderOrder = 2; outer.renderOrder = 1;
    inner.frustumCulled = false; outer.frustumCulled = false;
    this.group.add(outer, inner);
  }

  update(t: number) { this.uniforms.uTime.value = t; }
  set amplitude(v: number) { this.uniforms.uAmp.value = v; }
  set level(v: number) { this.uniforms.uLevel.value = v; }
  set surge(v: number) { this.uniforms.uSurge.value = v; }
  get level(): number { return this.uniforms.uLevel.value; }
  /** Extra rotation (rad) applied on top of baked wave dirs. */
  setWaveAngle(rad: number) {
    this.uniforms.uWaveAng.value = rad;
    setWaveAngleRad(rad);
  }
}
