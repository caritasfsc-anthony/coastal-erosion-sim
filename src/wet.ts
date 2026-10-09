// Wet-rock sheen for the splash zone: rock and sand glisten up to the height the surf reaches,
// and the wet line climbs with each arriving crest (same swell phase as the ocean shader).
import * as THREE from 'three';
import { WAVES } from './water';

export const wetUniforms = {
  uWetTime: { value: 0 },
  uWetLevel: { value: 0 },
  uWetBase: { value: 1.7 },
  uWetSurge: { value: 1.9 },
};

const f = (v: number) => v.toFixed(5);
const HEIGHT = WAVES.map((w) => `${f(w.A)}*sin(${f(w.k)}*dot(vec2(${f(w.dx)},${f(w.dz)}), vWetPos.xz) - ${f(w.om)}*uWetTime)`).join(' + ');

export function applyWetSheen(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wetUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWetPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
  vWetPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWetPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWetPos;
uniform float uWetTime, uWetLevel, uWetBase, uWetSurge;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wH = ${HEIGHT};
  float wCrest = pow(clamp(wH*1.15, 0.0, 1.0), 1.5);
  float wTop = uWetLevel + uWetBase + uWetSurge*wCrest + 0.35*sin(vWetPos.x*0.9 + vWetPos.z*0.6) + 0.25*sin(vWetPos.z*1.7 - vWetPos.x*0.4);
  float wet = 1.0 - smoothstep(wTop - 0.5, wTop + 0.5, vWetPos.y);
  wet *= 1.0 - smoothstep(uWetLevel - 0.2, uWetLevel - 1.6, vWetPos.y) * 0.6; // fully submerged rock is not shiny
  diffuseColor.rgb *= mix(1.0, 0.66, wet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.16, wet * 0.95);`);
  };
  mat.customProgramCacheKey = () => 'wet-sheen';
}
