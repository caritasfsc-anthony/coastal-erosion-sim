// Stylised physically-inspired ocean: Gerstner swell, depth-tinted shallows, shoreline surf foam.
import * as THREE from 'three';
import { INNER } from './world';

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
  return texture2D(uHeight, uv).r*48.0-24.0; }
`;

const vert = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uLevel;
varying vec3 vWorld; varying vec3 vN; varying float vCrest;
${LAND}
void gerstner(vec2 D, float L, float A, float Q, float spd, vec2 p, float t, inout vec3 P, inout vec3 N){
  float k = 6.28318/L; float w = sqrt(9.8*k)*spd; float f = k*dot(D,p) - w*t;
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
  gerstner(normalize(vec2(0.08,-1.0)), 46.0, 0.50*a, 0.55, 1.0, p, uTime, P, N);
  gerstner(normalize(vec2(-0.38,-0.92)), 27.0, 0.28*a, 0.6, 1.0, p, uTime, P, N);
  gerstner(normalize(vec2(0.55,-0.83)), 16.0, 0.16*a, 0.6, 1.1, p, uTime, P, N);
  gerstner(normalize(vec2(-0.85,-0.52)), 9.0, 0.07*a, 0.5, 1.2, p, uTime, P, N);
  vCrest = (P.y-uLevel)/max(0.2, 0.9*a+0.001);
  vN = normalize(N);
  vWorld = P;
  gl_Position = projectionMatrix*viewMatrix*vec4(P,1.0);
}`;

const frag = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uOuter; uniform float uAmp;
uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFoam, uSkyTop, uSkyHorizon, uFogColor;
uniform float uFogDensity;
varying vec3 vWorld; varying vec3 vN; varying float vCrest;
${LAND}
${NOISE}
void main(){
  float r = length(vWorld.xz);
  if (uOuter < 0.5 && r > 340.0) discard;
  if (uOuter > 0.5 && r < 340.0) discard;
  float depth = uLevel - landH(vWorld.xz);
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
  float shore = 1.0 - smoothstep(0.0, 0.7 + 0.9*n1, depth);
  float band = smoothstep(0.55, 1.0, sin(depth*2.1 - uTime*1.7 + n1*4.0)) * (1.0 - smoothstep(0.3, 3.8, depth));
  float big = smoothstep(0.45, 0.75, fbm(q*0.018 + vec2(uTime*0.01, 0.0)));
  float crest = smoothstep(0.7, 1.05, vCrest + n1*0.5 - 0.25) * 0.45 * big * smoothstep(0.6, 1.4, uAmp);
  float foam = clamp(shore*0.95 + band*0.75 + crest, 0.0, 1.0) * smoothstep(0.25, 0.7, n2 + shore*0.4);
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
      uTime: { value: 0 }, uAmp: { value: 1 }, uLevel: { value: 0 },
      uHeight: { value: o.heightTex },
      uHeightRect: { value: new THREE.Vector3(INNER.min, INNER.min, INNER.size) },
      uSunDir: { value: o.sunDir }, uSunColor: { value: o.sunColor },
      uDeep: { value: new THREE.Color(0x0a3a4c) }, uShallow: { value: new THREE.Color(0x2fb3a8) },
      uFoam: { value: new THREE.Color(0xf4f7f5) },
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
  get level(): number { return this.uniforms.uLevel.value; }
}
