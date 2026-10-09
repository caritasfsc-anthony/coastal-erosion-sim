// Renderer, camera, lights, sky, water and post-processing.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createSky } from './sky';
import { Water } from './water';
import { LandMeshes } from './meshes';
import { Splash } from './splash';
import { applyWetSheen } from './wet';
import { CliffDebris } from './debris';

export function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const sunDir = new THREE.Vector3(0.65, 0.55, -0.52).normalize();
  const sunColor = new THREE.Color(0xffe0b8);
  const skyTop = new THREE.Color(0x1a5a8e);
  const skyHorizon = new THREE.Color(0xe2d0b6);
  const fogColor = skyHorizon.clone();
  const fogDensity = 0.00055;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  scene.background = fogColor;

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 6000);
  camera.position.set(520, 300, 640);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 18;
  controls.maxDistance = 560;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.autoRotateSpeed = 0.35;
  controls.target.set(0, 0, 0);

  // Sky + image based lighting from the same sky shader
  const sky = createSky(sunDir, skyTop, skyHorizon, sunColor);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = createSky(sunDir, skyTop, skyHorizon, sunColor);
  envSky.scale.setScalar(40);
  envScene.add(envSky);
  scene.environment = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
  scene.environmentIntensity = 0.62;

  const sun = new THREE.DirectionalLight(sunColor, 3.35);
  sun.position.copy(sunDir).multiplyScalar(400).add(new THREE.Vector3(0, 0, 0));
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -220; sc.right = 220; sc.top = 220; sc.bottom = -220; sc.near = 10; sc.far = 1000;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xc5dff0, 0x4a3d30, 0.62));

  const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.95 });
  applyWetSheen(landMat);
  const land = new LandMeshes(landMat);
  const debris = new CliffDebris();
  scene.add(land.inner, land.outer, land.headland, land.geo, debris.mesh);

  const water = new Water({ heightTex: land.heightTex, sunDir, sunColor, skyTop, skyHorizon, fogColor, fogDensity });
  scene.add(water.group);

  const splash = new Splash();
  scene.add(splash.points);

  // post-processing
  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, 0.28, 0.5, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, controls, sky, sun, land, water, splash, composer, sunDir, debris };
}

export type World = ReturnType<typeof createWorld>;
