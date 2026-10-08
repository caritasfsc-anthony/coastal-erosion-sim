// Gradient sky dome with sun glow and soft procedural clouds.
import * as THREE from 'three';

export function createSky(sunDir: THREE.Vector3, top: THREE.Color, horizon: THREE.Color, sunColor: THREE.Color) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSunDir: { value: sunDir }, uTop: { value: top }, uHorizon: { value: horizon },
      uSun: { value: sunColor }, uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uTop, uHorizon, uSun; uniform float uTime; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.02+11.3; a*=0.5;} return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        float sd = max(dot(d, uSunDir), 0.0);
        vec3 col = mix(uHorizon, uTop, pow(clamp(y,0.0,1.0), 0.55));
        // warm glow around the sun, mostly near the horizon
        vec3 warm = vec3(1.0, 0.62, 0.36);
        col += warm * pow(sd, 6.0) * 0.55 * (1.0 - clamp(y*1.6, 0.0, 1.0));
        col += uSun * pow(sd, 64.0) * 0.6;
        // clouds
        if (y > 0.0) {
          vec2 uv = d.xz / (y + 0.12) * 1.6 + vec2(uTime*0.004, uTime*0.002);
          float c = smoothstep(0.52, 0.78, fbm(uv));
          float fade = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.55, 0.95, y));
          vec3 cc = mix(vec3(0.92, 0.88, 0.86), vec3(1.0, 0.78, 0.6), pow(sd, 3.0));
          col = mix(col, cc * (0.75 + 0.35*pow(sd,4.0)), c * fade * 0.65);
        }
        col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.08, y)); // below horizon
        col += uSun * smoothstep(0.9993, 0.99975, sd) * 8.0;          // sun disc (blooms)
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.scale.setScalar(2000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
