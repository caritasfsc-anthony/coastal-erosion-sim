import './style.css';
import * as THREE from 'three';
import { createWorld } from './scene';
import { LANDFORMS, PROCESSES, SEQUENCE, byId, geoFrame, landformState, type LandformId } from './landforms';
import { OVERVIEW, STORY } from './story';
import { GX, HX, MANTOU, SEGMENTS, caveZ, geoHalfWidth, geoParams, geoX, groundRaw, headHalfWidth, northCliff, phase, planCell, southCliff, southCoast0, stackGeom, stageConsts, waveTravel } from './world';
import { clamp } from './noise';
import { activeStrike, strikeFor, type Strike } from './waveWork';
import { wetUniforms } from './wet';
import type { SplashSource } from './splash';
import { GeoGuide } from './geoGuide';
import { CliffGuide, CLIFF_COLLAPSE_S } from './cliffGuide';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const W = createWorld($('scene') as unknown as HTMLCanvasElement);
const { camera, controls, land, water, splash, composer, sky, debris } = W;
const annoEl = document.createElement('div');
annoEl.id = 'annos';
$('labels').after(annoEl);
const guide = new GeoGuide(annoEl);
const cliffGuide = new CliffGuide(annoEl);
W.scene.add(guide.group);
W.scene.add(cliffGuide.group);

// geometry is rebuilt in a worker so dragging the timeline never blocks rendering
const worker = new Worker(new URL('./buildWorker.ts', import.meta.url), { type: 'module' });
let reqId = 0, inflight = false, requested = -1;
let firstBuild: (() => void) | null = null;
worker.onmessage = (e: MessageEvent) => {
  const { s, head, terrain, geo } = e.data;
  land.apply(head, terrain, geo);
  debris.update(s);
  guide.update(s);
  cliffGuide.update(s);
  detectCollapses(app.built, s);
  app.built = s;
  inflight = false;
  updateSplashSources(s);
  updateLandformStates();
  if (firstBuild) { firstBuild(); firstBuild = null; }
};
function requestBuild(s: number) {
  requested = s;
  inflight = true;
  worker.postMessage({ s, wd: app.waveDir, id: ++reqId });
}

// ------------------------------------------------------------------ state
type Mode = 'explore' | 'story' | 'quiz';
const app = {
  stage: 0,
  built: 0,
  playing: false,
  mode: 'explore' as Mode,
  selected: null as LandformId | null,
  visited: new Set<LandformId>(),
  tide: 0,
  energy: 1,
  /** Degrees FROM which waves approach: 0=N, 90=E, 180=S, 270=W */
  waveDir: 180,
};

let dirtyMinimap = true;

let lastStageVal = 0, lastStageChange = -1e9;

// ------------------------------------------------------------------ stage tween
let stageTween: { from: number; to: number; t: number; dur: number } | null = null;
function animateStage(to: number, dur = 1.6) {
  to = clamp(to);
  if (Math.abs(to - app.stage) < 0.002) { setStage(to); return; }
  stageTween = { from: app.stage, to, t: 0, dur };
}
function setStage(s: number) {
  app.stage = clamp(s);
  const slider = $('stage') as HTMLInputElement;
  slider.value = String(Math.round(app.stage * 1000));
  slider.style.setProperty('--p', `${app.stage * 100}%`);
  if (Math.abs(clamp(s) - lastStageVal) > 1e-4) { lastStageVal = clamp(s); lastStageChange = performance.now(); }
  const name = app.stage < 0.34 ? '初期' : app.stage < 0.67 ? '中期' : '後期';
  $('stage-name').textContent = `${name} · ${Math.round(app.stage * 100)}%`;
  const years = Math.round((app.stage * 8000) / 100) * 100;
  $('stage-years').textContent = `經過約 ${years.toLocaleString('zh-HK')} 年（示意）`;
  if (typeof checkMiniGoal === 'function') checkMiniGoal();
  dirtyMinimap = true;
}

// ------------------------------------------------------------------ camera tween
let camTween: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; t: number; dur: number } | null = null;
function flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.8) {
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
}
controls.addEventListener('start', () => { camTween = null; });
function flyOverview(dur = 2) {
  flyTo(new THREE.Vector3(...OVERVIEW.pos), new THREE.Vector3(...OVERVIEW.target), dur);
}
function focusLandform(id: LandformId, stage = app.stage, dur = 1.8) {
  const lf = byId(id);
  if (id === 'geo') {
    // dedicated shot down the length of the cleft (shifted left of the info panel when it is open)
    // the story card + wave caption sit centre-screen, so in story mode the cleft goes to the right-hand side
    const wide = window.innerWidth > 900;
    const story = app.mode === 'story';
    const f = geoFrame(stage, !wide ? 0 : story ? -0.3 : info.classList.contains('open') ? 0.1 : 0, story ? 0.01 : 0);
    flyTo(f.pos, f.target, dur);
    return;
  }
  const st = landformState(id, stage);
  const target = st.pos.clone();
  // For cliff teaching beats, keep the waterline / notch in frame
  if (id === 'cliff' && stage < 0.35) target.y = Math.min(target.y, 3.2);
  else target.y = Math.max(1.5, target.y * 0.6);
  const off = new THREE.Vector3(...lf.view);
  flyTo(target.clone().add(off), target, dur);
}


// the highlighted strike zone is also a (stronger) splash source; it is mutated in place every frame
const strikeSrc: SplashSource = { p: new THREE.Vector3(), n: new THREE.Vector3(1, 0, 0), w: 1.2, face: 12, key: 'strike' };

function updateSplashSources(s: number) {
  const src: SplashSource[] = [];
  const travel = waveTravel(app.waveDir);
  const add = (key: string, x: number, z: number, nx: number, nz: number, w: number, face: number) => {
    const n = new THREE.Vector3(nx, 0, nz).normalize();
    // head-on exposure: waves travel into the face
    const hit = Math.max(0.15, -n.x * travel.dx - n.z * travel.dz);
    src.push({ key, p: new THREE.Vector3(x, 0, z), n, w: w * (0.35 + 1.4 * hit), face });
  };
  // NE headland tip: pound flanks and stacks
  let tip = 90;
  for (let k = SEGMENTS.length - 1; k >= 0; k--) {
    const p = phase(s, k);
    const sg = SEGMENTS[k];
    if (p < 0.6) {
      tip = Math.max(tip, sg.b);
      const zm = (sg.a + sg.b) / 2, w = headHalfWidth(zm);
      add(`h${k}e`, HX + w + 0.6, zm, 1, 0.35, 1, 16); add(`h${k}w`, HX - w - 0.6, zm, -1, 0.35, 0.8, 16);
      add(`h${k}e2`, HX + w + 0.6, sg.a + 3, 1, 0.3, 0.7, 16);
    } else if (p < 0.98) {
      const st = stackGeom(k, p);
      const r = st.r + 0.4, face = p > 0.88 ? 2 : 16;
      add(`s${k}n`, HX, st.zs + r, 0, 1, 1.4, face); add(`s${k}e`, HX + r, st.zs, 1, 0.3, 0.8, face); add(`s${k}w`, HX - r, st.zs, -1, 0.3, 0.7, face);
    }
  }
  add('tip', HX, tip + 0.8, 0, 1, 2, 16);
  // South cliff (sea to the south, normal −Z)
  for (let x = -25; x <= 65; x += 9) {
    add(`sc${x}`, x, southCliff(x, s) - 0.7, 0, -1, 0.85, 18);
    if (s > 0.12) add(`se${x}`, x + 3, southCoast0(x) - 7, 0, -1, 0.4, 1.5);
  }
  // north rocky coast
  for (let x = -55; x <= 45; x += 10) {
    if (Math.abs(x - GX) < 8) continue;
    add(`nc${x}`, x, northCliff(x, s) + 0.7, 0, 1, 0.75, 16);
  }
  // SE boulder landmark
  add('mantou', MANTOU.x, MANTOU.z + MANTOU.r * 0.3, 0.4, -0.9, 1.1, 8);
  // geo surge
  if (s > 0.05) {
    const G = geoParams(s);
    const zb = G.zHead + 0.9;
    add('g-back', geoX(zb), zb, 0, 1, 1.25, 20);
    for (const u of [0.3, 0.62]) {
      const z = G.clG - G.L * u, hw = geoHalfWidth(z, G);
      add(`g-w${u}`, geoX(z) - hw + 0.4, z, 1, 0.5, 0.45, 18);
      add(`g-e${u}`, geoX(z) + hw - 0.4, z, -1, 0.5, 0.45, 18);
    }
    add('g-mouth', geoX(G.clG + 2), G.clG + 2.5, 0, 1, 0.7, 6);
    if (G.blow) {
      const top = groundRaw(G.blow.x + 1.6, G.blow.z, stageConsts(s));
      src.push({ key: 'g-blow', p: new THREE.Vector3(G.blow.x, 0, G.blow.z), n: new THREE.Vector3(0, 0, 1), w: 0.9 * G.blow.r, face: 8, jet: top });
    }
  }
  src.push(strikeSrc);
  splash.sources = src;
}

// ------------------------------------------------------------------ wave-attack cues (浪擊點)
let watch: { id: LandformId; sTarget: number; until: number } | null = null;
let strike: Strike | null = null;
let shake = 0;
const strikeEl = $('strike');
const wwEl = $('wave-work');
let wwShown = false, wwTitle = '';

function currentStrike(): Strike | null {
  if (app.mode === 'quiz') return null;
  if (watch && performance.now() < watch.until) return strikeFor(watch.id, app.stage, watch.sTarget);
  if (app.mode === 'story') {
    const st = STORY[storyIdx];
    return st.focus ? strikeFor(st.focus, app.stage, st.stage) : activeStrike(app.stage);
  }
  return activeStrike(app.stage);
}
function cuesWanted(now: number): boolean {
  if (app.mode === 'quiz') return false;
  return app.mode === 'story' || app.playing || !!stageTween || (watch !== null && now < watch.until) || now - lastStageChange < 2600;
}
function updateStrike(now: number) {
  strike = currentStrike();
  const show = !!strike && cuesWanted(now);
  if (strike) {
    strikeSrc.p.copy(strike.pos); strikeSrc.n.copy(strike.n).normalize(); strikeSrc.face = strike.face;
    strikeSrc.w = strike.deposit ? 0 : show ? 2.2 : 1.1;
    strikeSrc.active = show && !strike.deposit;
  } else { strikeSrc.w = 0; strikeSrc.active = false; }
  if (show !== wwShown) { wwShown = show; wwEl.classList.toggle('show', show); strikeEl.classList.toggle('show', show); document.body.classList.toggle('ww-on', show); }
  if (strike && strike.title !== wwTitle) {
    wwTitle = strike.title;
    $('ww-title').textContent = strike.title;
    $('ww-text').textContent = strike.text;
    $('ww-proc').textContent = strike.deposit ? '波浪折射 · 沉積作用' : '水力作用 · 磨蝕作用';
    wwEl.classList.toggle('deposit', !!strike.deposit);
    strikeEl.classList.toggle('deposit', !!strike.deposit);
    $('strike-lbl').textContent = strike.deposit ? '沉積區' : '浪擊點';
    wwEl.classList.remove('flash'); void wwEl.offsetWidth; wwEl.classList.add('flash');
  }
}
splash.onImpact = (src) => {
  if (!src.active) return;
  strikeEl.classList.remove('hit'); void strikeEl.offsetWidth; strikeEl.classList.add('hit');
};
const tmpS = new THREE.Vector3();
function projectStrike() {
  if (!strike || !wwShown) return;
  tmpS.copy(strike.pos).project(camera);
  const vis = tmpS.z < 1 && Math.abs(tmpS.x) < 1.1 && Math.abs(tmpS.y) < 1.1;
  strikeEl.style.opacity = vis ? '' : '0';
  const x = (tmpS.x * 0.5 + 0.5) * window.innerWidth, y = (-tmpS.y * 0.5 + 0.5) * window.innerHeight;
  strikeEl.style.transform = `translate(${x}px, ${y}px)`;
}

/** Discrete collapse beats: south-cliff notch roof, arch, stack base. */
function detectCollapses(prev: number, s: number) {
  if (!(s > prev) || s - prev > 0.06) return;
  // South cliff：海蝕凹地頂部崩塌 → 陡峭海崖
  if (prev < CLIFF_COLLAPSE_S && s >= CLIFF_COLLAPSE_S) {
    const x = 18;
    const z = southCliff(x, s);
    splash.collapse(new THREE.Vector3(x, 0, z - 1.5), 14, 16);
    splash.collapse(new THREE.Vector3(x + 12, 0, southCliff(x + 12, s) - 1.2), 10, 12);
    shake = Math.max(shake, 1.05);
    toast('轟！海蝕凹地頂部崩塌——形成陡峭海崖', 4500);
  }
  for (let k = 0; k < SEGMENTS.length; k++) {
    const p0 = phase(prev, k), p1 = phase(s, k);
    const zc = caveZ(k);
    if (p0 < 0.575 && p1 >= 0.575) {
      splash.collapse(new THREE.Vector3(HX, 0, zc), headHalfWidth(zc) * 0.8, 10);
      shake = Math.max(shake, 0.9);
      toast('轟！拱頂崩塌——海蝕拱變成海蝕柱');
    }
    if (p0 < 0.9 && p1 >= 0.9) {
      const st = stackGeom(k, p1);
      splash.collapse(new THREE.Vector3(HX, 0, st.zs), st.r + 1, 8);
      shake = Math.max(shake, 0.6);
      toast('柱腳被蝕斷，海蝕柱倒塌成海蝕殘柱');
    }
  }
}

// ------------------------------------------------------------------ hotspots
interface HS { id: LandformId; el: HTMLDivElement; pos: THREE.Vector3; present: boolean; note: string; }
const hotspots: HS[] = [];
const labelsEl = $('labels');
for (const lf of LANDFORMS) {
  const el = document.createElement('div');
  el.className = 'hs' + (lf.tag === '沉積地貌' ? ' deposit' : '');
  el.innerHTML = `<div class="pin"></div><div class="lbl"><b>${lf.zh}</b><i>${lf.en}</i></div>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); onHotspotClick(lf.id); });
  labelsEl.appendChild(el);
  hotspots.push({ id: lf.id, el, pos: new THREE.Vector3(), present: false, note: '' });
}

function updateLandformStates() {
  for (const h of hotspots) {
    const st = landformState(h.id, app.built, h.pos);
    h.present = st.present; h.note = st.note;
    h.el.classList.toggle('absent', !st.present);
  }
  for (const li of listItems) li.el.classList.toggle('present', hotspots.find((h) => h.id === li.id)!.present);
  if (app.selected) renderInfoStatus(app.selected);
}

const tmp = new THREE.Vector3();
function projectHotspots() {
  const w = window.innerWidth, h = window.innerHeight;
  // First pass: project; second pass: push overlapping labels apart in screen space
  const placed: { x: number; y: number; z: number; hs: HS; vis: boolean }[] = [];
  for (const hs of hotspots) {
    tmp.copy(hs.pos).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
    hs.el.classList.toggle('hidden', !vis);
    placed.push({
      x: (tmp.x * 0.5 + 0.5) * w,
      y: (-tmp.y * 0.5 + 0.5) * h,
      z: tmp.z,
      hs,
      vis,
    });
  }
  const minD = 58;
  for (let iter = 0; iter < 6; iter++) {
    for (let i = 0; i < placed.length; i++) {
      if (!placed[i].vis || !placed[i].hs.present) continue;
      for (let j = i + 1; j < placed.length; j++) {
        if (!placed[j].vis || !placed[j].hs.present) continue;
        const a = placed[i], b = placed[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-3) { dx = 0.7; dy = -0.7; d2 = 1; }
        const d = Math.sqrt(d2);
        if (d >= minD) continue;
        const push = (minD - d) * 0.5;
        const ux = dx / d, uy = dy / d;
        a.x += ux * push; a.y += uy * push;
        b.x -= ux * push; b.y -= uy * push;
      }
    }
  }
  for (const p of placed) {
    if (!p.vis) continue;
    p.hs.el.style.transform = `translate(${p.x - 9}px, ${p.y - 9}px)`;
    p.hs.el.style.zIndex = String(Math.round((1 - p.z) * 100000));
  }
}

// ------------------------------------------------------------------ sidebar list
const listEl = $('lf-list');
const listItems: { id: LandformId; el: HTMLLIElement }[] = [];
for (const lf of LANDFORMS) {
  const li = document.createElement('li');
  if (lf.tag === '沉積地貌') li.classList.add('deposit');
  li.innerHTML = `<span class="dot"></span><span class="nm"><b>${lf.zh}</b><i>${lf.en}</i></span>${lf.bonus ? '<span class="bonus">延伸</span>' : ''}<span class="seen">✓</span>`;
  li.addEventListener('click', () => selectLandform(lf.id, true));
  listEl.appendChild(li);
  listItems.push({ id: lf.id, el: li });
}

// timeline marks
const marks = $('tl-marks');
for (const lf of LANDFORMS) {
  const m = document.createElement('span');
  m.style.left = `calc(10px + (100% - 20px) * ${lf.bestStage})`;
  m.dataset.l = lf.zh;
  marks.appendChild(m);
}

// ------------------------------------------------------------------ info panel
const info = $('info');
function selectLandform(id: LandformId, focus: boolean) {
  const lf = byId(id);
  app.selected = id;
  app.visited.add(id);
  $('found-count').textContent = `${app.visited.size} / ${LANDFORMS.length} 已探索`;
  for (const li of listItems) {
    li.el.classList.toggle('selected', li.id === id);
    li.el.classList.toggle('visited', app.visited.has(li.id));
  }
  for (const h of hotspots) h.el.classList.toggle('selected', h.id === id);

  const tag = $('info-tag');
  tag.textContent = lf.tag; tag.classList.toggle('deposit', lf.tag === '沉積地貌');
  $('info-title').textContent = lf.zh;
  $('info-en').textContent = lf.en;
  $('info-short').textContent = lf.short;
  $('info-steps').innerHTML = lf.steps.map((s) => `<li>${s}</li>`).join('');
  $('info-proc').innerHTML = lf.processes.map((p) => `<span class="chip">${p}</span>`).join('');
  const seqEl = $('info-seq');
  if (SEQUENCE.includes(id)) {
    seqEl.innerHTML = `<div class="seq">${SEQUENCE.map((s, i) =>
      `${i ? '<span class="arr">→</span>' : ''}<button data-id="${s}" class="${s === id ? 'cur' : ''}">${byId(s).zh}</button>`).join('')}</div>
      <p class="seq-text">${id === 'cliff' ? lf.sequence : '岬角的侵蝕序列：同一段岬角會隨時間依次經歷以上階段。'}</p>`;
    seqEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const nid = (b as HTMLElement).dataset.id as LandformId;
      selectLandform(nid, true);
      if (!landformState(nid, app.stage).present) { animateStage(byId(nid).bestStage); focusLandform(nid, byId(nid).bestStage); }
    }));
  } else {
    seqEl.innerHTML = `<p class="seq-text">${lf.sequence}</p>`;
  }
  $('info-example').textContent = lf.example ? `例子：${lf.example}` : '';
  renderInfoStatus(id);
  info.classList.add('open');
  closeProcess();
  if (focus) {
    const present = landformState(id, app.stage).present;
    const target = present ? app.stage : lf.bestStage;
    if (!present) { animateStage(target); toast(`已跳到「${lf.zh}」出現的階段`); }
    focusLandform(id, target);
  }
}
function renderInfoStatus(id: LandformId) {
  const st = landformState(id, app.stage);
  const el = $('info-status');
  el.classList.toggle('absent', !st.present);
  el.innerHTML = st.present
    ? `<b>● 目前可見</b>${st.note ? ' · ' + st.note : ''}`
    : `<b>○ 此階段未出現</b>${st.note ? ' · ' + st.note : ''} · 建議階段 ${Math.round(byId(id).bestStage * 100)}%`;
}
function closeInfo() {
  info.classList.remove('open');
  app.selected = null;
  for (const h of hotspots) h.el.classList.remove('selected');
  for (const li of listItems) li.el.classList.remove('selected');
}
$('info-close').addEventListener('click', closeInfo);
$('info-jump').addEventListener('click', () => {
  if (!app.selected) return;
  const lf = byId(app.selected);
  // 海崖：完整走一輪 原本坡面 → 凹地 → 崩塌 → 海崖／平台
  const from = lf.id === 'cliff' ? 0.02
    : Math.max(0, lf.bestStage - (lf.id === 'platform' || lf.id === 'tombolo' || lf.id === 'beach' ? 0.7 : 0.28));
  const target = lf.id === 'cliff' ? 0.55 : lf.bestStage;
  const dur = lf.id === 'cliff' ? 11 : 6;
  const watchMs = lf.id === 'cliff' ? 14000 : 9000;
  setStage(from);
  focusLandform(lf.id, from, 1.2);
  watch = { id: lf.id, sTarget: target, until: performance.now() + watchMs };
  setTimeout(() => animateStage(target, dur), 500);
  if (lf.id === 'cliff') toast('觀看：原本坡面 → 海蝕凹地 → 崩塌 → 海崖後退', 3500);
});

// processes panel
const procPanel = $('process-panel');
$('process-list').innerHTML = PROCESSES.map((p) => `<div class="proc"><b>${p.zh}</b><i>${p.en}</i><p>${p.d}</p></div>`).join('');
function closeProcess() { procPanel.classList.remove('open'); $('btn-process').classList.remove('active'); }
$('btn-process').addEventListener('click', () => {
  const open = !procPanel.classList.contains('open');
  if (open) { info.classList.remove('open'); procPanel.classList.add('open'); $('btn-process').classList.add('active'); }
  else closeProcess();
});
$('process-close').addEventListener('click', closeProcess);

// ------------------------------------------------------------------ toast
let toastTimer = 0;
function toast(msg: string, ms = 2600) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
}

// ------------------------------------------------------------------ timeline & toolbar
const slider = $('stage') as HTMLInputElement;
slider.addEventListener('input', () => { stageTween = null; setPlaying(false); setStage(Number(slider.value) / 1000); });
function setPlaying(p: boolean) {
  app.playing = p;
  $('play-icon').innerHTML = p ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' : '<path d="M7 5l12 7-12 7z"/>';
}
$('play').addEventListener('click', () => {
  if (!app.playing && app.stage >= 0.999) setStage(0);
  stageTween = null;
  setPlaying(!app.playing);
});
const energy = $('energy') as HTMLInputElement;
function applyEnergy() {
  app.energy = Number(energy.value) / 100;
  water.amplitude = 0.35 + 0.85 * app.energy;
  splash.energy = app.energy;
  water.surge = 0.55;
  wetUniforms.uWetBase.value = 0.8 + 0.8 * app.energy;
  wetUniforms.uWetSurge.value = 0.9 + 1.3 * app.energy;
  energy.style.setProperty('--p', `${((Number(energy.value) - 20) / 160) * 100}%`);
  $('energy-val').textContent = app.energy < 0.7 ? '低 · 和緩' : app.energy < 1.35 ? '中 · 一般' : '高 · 風暴';
}
energy.addEventListener('input', applyEnergy);

const TIDES = [{ v: 0, l: '中潮' }, { v: -0.75, l: '低潮' }, { v: 0.85, l: '高潮' }];
let tideIdx = 0, tideTarget = 0;
$('btn-tide').addEventListener('click', () => {
  tideIdx = (tideIdx + 1) % TIDES.length;
  tideTarget = TIDES[tideIdx].v;
  $('tide-label').textContent = TIDES[tideIdx].l;
  toast(`潮汐：${TIDES[tideIdx].l}${tideIdx === 1 ? '——浪蝕平台露出更多' : ''}`);
});
$('btn-rotate').addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  $('btn-rotate').classList.toggle('active', controls.autoRotate);
});
$('btn-labels').addEventListener('click', () => {
  const on = document.body.classList.toggle('no-labels');
  $('btn-labels').classList.toggle('active', !on);
});
$('btn-home').addEventListener('click', () => flyOverview(1.8));

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' && e.key !== ' ') return;
  if (e.key === ' ') { e.preventDefault(); $('play').click(); }
  else if (e.key === 'ArrowRight') { setPlaying(false); animateStage(app.stage + 0.05, 0.5); }
  else if (e.key === 'ArrowLeft') { setPlaying(false); animateStage(app.stage - 0.05, 0.5); }
  else if (e.key === 'Escape') closeInfo();
});

// ------------------------------------------------------------------ modes
function setMode(m: Mode) {
  app.mode = m;
  document.querySelectorAll<HTMLButtonElement>('#modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  document.body.classList.toggle('story-mode', m === 'story');
  document.body.classList.toggle('quiz-mode', m === 'quiz');
  $('story').classList.toggle('open', m === 'story');
  $('quiz').classList.toggle('open', m === 'quiz');
  setPlaying(false);
  stopAuto();
  watch = null;
  closeInfo(); closeProcess();
  if (m === 'story') gotoStory(0);
  if (m === 'quiz') startQuiz();
  if (m === 'explore') { flyOverview(1.6); toast('探索模式：拖曳旋轉、滾輪縮放、點擊光點'); }
}
document.querySelectorAll<HTMLButtonElement>('#modes button').forEach((b) =>
  b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));

// story
let storyIdx = 0;
let autoTimer = 0;
const dots = $('story-dots');
dots.innerHTML = STORY.map(() => '<i></i>').join('');
dots.querySelectorAll('i').forEach((d, i) => d.addEventListener('click', () => { stopAuto(); gotoStory(i); }));
function gotoStory(i: number) {
  storyIdx = clamp(i, 0, STORY.length - 1);
  const st = STORY[storyIdx];
  $('story-step').textContent = `第 ${storyIdx + 1} / ${STORY.length} 章`;
  $('story-title').textContent = st.title;
  $('story-text').textContent = st.text;
  dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === storyIdx));
  ($('story-prev') as HTMLButtonElement).disabled = storyIdx === 0;
  $('story-next').textContent = storyIdx === STORY.length - 1 ? '開始探索 ›' : '下一步 ›';
  animateStage(st.stage, 2.2);
  for (const h of hotspots) h.el.classList.toggle('selected', h.id === st.focus);
  if (st.focus) { app.visited.add(st.focus); focusLandform(st.focus, st.stage, 2.4); }
  else if (st.view) flyTo(new THREE.Vector3(...st.view.pos), new THREE.Vector3(...st.view.target), 2.4);
}
function stopAuto() { clearInterval(autoTimer); autoTimer = 0; $('story-auto').classList.remove('active'); $('story-auto').textContent = '自動播放'; }
$('story-prev').addEventListener('click', () => { stopAuto(); gotoStory(storyIdx - 1); });
$('story-next').addEventListener('click', () => {
  stopAuto();
  if (storyIdx === STORY.length - 1) setMode('explore'); else gotoStory(storyIdx + 1);
});
$('story-auto').addEventListener('click', () => {
  if (autoTimer) { stopAuto(); return; }
  $('story-auto').classList.add('active'); $('story-auto').textContent = '暫停播放';
  autoTimer = window.setInterval(() => {
    if (storyIdx >= STORY.length - 1) { stopAuto(); return; }
    gotoStory(storyIdx + 1);
  }, 9000);
});

// quiz
let quiz = { order: [] as LandformId[], i: 0, score: 0, tries: 0, answered: false };
function shuffle<T>(a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function startQuiz() {
  quiz = { order: shuffle(LANDFORMS.map((l) => l.id)), i: 0, score: 0, tries: 0, answered: false };
  flyOverview(1.8);
  showQuestion();
}
function showQuestion() {
  const id = quiz.order[quiz.i];
  const lf = byId(id);
  quiz.tries = 0; quiz.answered = false;
  $('quiz-score').textContent = `第 ${quiz.i + 1} / ${quiz.order.length} 題 · 得分 ${quiz.score}`;
  $('quiz-q').textContent = lf.quiz;
  $('quiz-hint').textContent = '在場景中點擊正確的光點（可旋轉視角尋找）。';
  const fb = $('quiz-feedback'); fb.textContent = ''; fb.className = 'quiz-feedback';
  $('quiz-next').style.display = 'none';
  $('quiz-skip').style.display = '';
  animateStage(lf.bestStage, 1.8);
}
function quizAnswer(id: LandformId) {
  if (quiz.answered) return;
  const target = quiz.order[quiz.i];
  const h = hotspots.find((x) => x.id === id)!;
  const fb = $('quiz-feedback');
  quiz.tries++;
  if (id === target) {
    quiz.answered = true;
    if (quiz.tries === 1) quiz.score++;
    h.el.classList.add('flash-ok'); setTimeout(() => h.el.classList.remove('flash-ok'), 1200);
    fb.className = 'quiz-feedback ok';
    fb.innerHTML = `✓ 答對了！這是「${byId(id).zh}」。${byId(id).short}`;
    $('quiz-score').textContent = `第 ${quiz.i + 1} / ${quiz.order.length} 題 · 得分 ${quiz.score}`;
    $('quiz-next').style.display = ''; $('quiz-skip').style.display = 'none';
    $('quiz-next').textContent = quiz.i === quiz.order.length - 1 ? '查看成績 ›' : '下一題 ›';
    focusLandform(id, app.stage, 1.6);
  } else {
    h.el.classList.add('flash-bad'); setTimeout(() => h.el.classList.remove('flash-bad'), 900);
    fb.className = 'quiz-feedback bad';
    fb.textContent = `✗ 這是「${byId(id).zh}」，再試一次！`;
  }
}
function nextQuestion() {
  if (quiz.i >= quiz.order.length - 1) {
    $('quiz-q').textContent = `挑戰完成！得分 ${quiz.score} / ${quiz.order.length}`;
    $('quiz-hint').textContent = quiz.score >= 8 ? '太厲害了，你已是海岸地貌專家！' : quiz.score >= 5 ? '做得好！再探索一次，挑戰滿分吧。' : '多看看故事模式，再來挑戰！';
    $('quiz-feedback').textContent = '';
    $('quiz-next').textContent = '再挑戰一次 ›'; $('quiz-skip').style.display = 'none';
    quiz.i = quiz.order.length;
    flyOverview(1.8);
    return;
  }
  quiz.i++;
  flyOverview(1.4);
  showQuestion();
}
$('quiz-next').addEventListener('click', () => { if (quiz.i >= quiz.order.length) startQuiz(); else nextQuestion(); });
$('quiz-skip').addEventListener('click', () => {
  const id = quiz.order[quiz.i];
  $('quiz-feedback').className = 'quiz-feedback';
  $('quiz-feedback').textContent = `答案是「${byId(id).zh}」。`;
  quiz.answered = true;
  focusLandform(id, app.stage, 1.4);
  $('quiz-next').style.display = ''; $('quiz-skip').style.display = 'none';
});

function onHotspotClick(id: LandformId) {
  const h = hotspots.find((x) => x.id === id);
  if (h) { h.el.classList.remove('pop'); void h.el.offsetWidth; h.el.classList.add('pop'); }
  if (app.mode === 'quiz') { quizAnswer(id); return; }
  selectLandform(id, true);
}

/** The geo teaching overlay shows whenever the learner is studying the geo — never in challenge mode. */
function geoGuideWanted(now: number): boolean {
  if (app.mode === 'quiz' || app.built < 0.06) return false;
  if (app.mode === 'story') return STORY[storyIdx].focus === 'geo';
  return app.selected === 'geo' || (watch !== null && watch.id === 'geo' && now < watch.until);
}
/** South cliff／海蝕凹地／崩塌 teaching overlay. */
function cliffGuideWanted(now: number): boolean {
  if (app.mode === 'quiz') return false;
  if (app.mode === 'story') return STORY[storyIdx].focus === 'cliff' || STORY[storyIdx].focus === 'platform';
  if (app.selected === 'cliff' || app.selected === 'platform') return true;
  if (watch !== null && (watch.id === 'cliff' || watch.id === 'platform') && now < watch.until) return true;
  // Auto-show during notch → collapse so students never miss the geometry
  return app.built >= 0.08 && app.built <= 0.38;
}

// ------------------------------------------------------------------ top-view minimap (右上角)
const mmCv = $('minimap-cv') as HTMLCanvasElement;
const mmCtx = mmCv.getContext('2d')!;
let lastMmStage = -1, lastMmWd = -1;
const MM_WORLD = { x0: -90, z0: -180, x1: 90, z1: 170 };
function worldToMm(x: number, z: number): [number, number] {
  const u = (x - MM_WORLD.x0) / (MM_WORLD.x1 - MM_WORLD.x0);
  const v = (MM_WORLD.z1 - z) / (MM_WORLD.z1 - MM_WORLD.z0);
  return [u * mmCv.width, v * mmCv.height];
}
function drawMinimap() {
  const s = app.built, wd = app.waveDir;
  if (!dirtyMinimap && Math.abs(s - lastMmStage) < 0.01 && wd === lastMmWd) return;
  dirtyMinimap = false; lastMmStage = s; lastMmWd = wd;
  const W = mmCv.width, H = mmCv.height;
  const img = mmCtx.createImageData(W, H);
  const data = img.data;
  const step = 2;
  for (let py = 0; py < H; py += step) {
    const z = MM_WORLD.z1 - (py / (H - 1)) * (MM_WORLD.z1 - MM_WORLD.z0);
    for (let px = 0; px < W; px += step) {
      const x = MM_WORLD.x0 + (px / (W - 1)) * (MM_WORLD.x1 - MM_WORLD.x0);
      const cell = planCell(x, z, s, wd);
      let r = 8, g = 42, b = 68;
      if (cell === 1) { r = 196; g = 165; b = 116; }
      else if (cell === 2) { r = 232; g = 213; b = 163; }
      for (let dy = 0; dy < step && py + dy < H; dy++) {
        for (let dx = 0; dx < step && px + dx < W; dx++) {
          const i = ((py + dy) * W + (px + dx)) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
        }
      }
    }
  }
  mmCtx.putImageData(img, 0, 0);
  mmCtx.strokeStyle = 'rgba(94,234,212,0.35)';
  mmCtx.lineWidth = 2;
  mmCtx.strokeRect(1, 1, W - 2, H - 2);
  const [cx, cy] = worldToMm(0, 10);
  const rad = ((wd + 180) * Math.PI) / 180;
  const len = 28;
  const ax = cx + Math.sin(rad) * len, ay = cy - Math.cos(rad) * len;
  const bx = cx - Math.sin(rad) * len * 0.55, by = cy + Math.cos(rad) * len * 0.55;
  mmCtx.strokeStyle = '#5eead4';
  mmCtx.fillStyle = '#5eead4';
  mmCtx.lineWidth = 2.5;
  mmCtx.beginPath(); mmCtx.moveTo(bx, by); mmCtx.lineTo(ax, ay); mmCtx.stroke();
  const hx = Math.sin(rad), hy = -Math.cos(rad);
  mmCtx.beginPath();
  mmCtx.moveTo(ax, ay);
  mmCtx.lineTo(ax - hx * 10 - hy * 5, ay - hy * 10 + hx * 5);
  mmCtx.lineTo(ax - hx * 10 + hy * 5, ay - hy * 10 - hx * 5);
  mmCtx.closePath(); mmCtx.fill();
  mmCtx.fillStyle = 'rgba(94,234,212,0.85)';
  mmCtx.font = 'bold 11px system-ui,sans-serif';
  mmCtx.fillText('N', W / 2 - 4, 14);
}
function flyTopDown(dur = 1.4) {
  flyTo(new THREE.Vector3(0, 320, 0.01), new THREE.Vector3(0, 0, 0), dur);
  toast('俯視角度——再撳「總覽」返回', 2200);
}
$('mm-top').addEventListener('click', () => flyTopDown());
mmCv.addEventListener('click', () => flyTopDown());

// ------------------------------------------------------------------ loop
const clock = new THREE.Timer();
let elapsed = 0;
function frame() {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (stageTween) {
    stageTween.t += dt / stageTween.dur;
    const k = easeInOut(Math.min(1, stageTween.t));
    setStage(stageTween.from + (stageTween.to - stageTween.from) * k);
    if (stageTween.t >= 1) stageTween = null;
  } else if (app.playing) {
    setStage(app.stage + dt / 36);
    if (app.stage >= 1) setPlaying(false);
  }
  // Rebuild only when stage changes — wave dir rotates swell / splash, not landforms
  if (!inflight && Math.abs(app.stage - requested) > 0.0005) requestBuild(app.stage);

  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = easeInOut(Math.min(1, camTween.t));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= 1) camTween = null;
  }
  controls.update(dt);

  // tide
  const lvl = water.level + (tideTarget - water.level) * Math.min(1, dt * 1.5);
  water.level = lvl; splash.level = lvl;

  water.update(elapsed);
  (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
  sky.position.copy(camera.position);
  splash.update(dt, elapsed);
  wetUniforms.uWetTime.value = elapsed;
  wetUniforms.uWetLevel.value = lvl;

  const now = performance.now();
  updateStrike(now);
  projectStrike();
  guide.visible = geoGuideWanted(now);
  guide.tick(dt, elapsed, camera);
  cliffGuide.visible = cliffGuideWanted(now);
  cliffGuide.tick(dt, elapsed, camera);

  // collapse shake: offset the camera only for this frame's render
  let sx = 0, sy = 0;
  if (shake > 0.001) {
    shake *= Math.exp(-dt * 3.2);
    sx = (Math.random() - 0.5) * shake * 0.7; sy = (Math.random() - 0.5) * shake * 0.5;
    camera.position.x += sx; camera.position.y += sy;
  }
  composer.render(dt);
  camera.position.x -= sx; camera.position.y -= sy;
  projectHotspots();
  if (Math.abs(app.built - lastMmStage) > 0.008 || app.waveDir !== lastMmWd) dirtyMinimap = true;
  drawMinimap();
  requestAnimationFrame(frame);
}


// ------------------------------------------------------------------ wave direction (八方位)
const DIR_NAMES: [number, string, string][] = [
  [0, '北', '北岸／海蝕隙受浪較強'],
  [45, '東北', '東北岩岬浪擊加強'],
  [90, '東', '東岸受蝕較強'],
  [135, '東南', '東南岸／巨礫一帶浪強'],
  [180, '南', '南岸海崖受蝕較強'],
  [225, '西南', '西南岸浪強 · 東側海灣較受掩護'],
  [270, '西', '西岸受蝕較強'],
  [315, '西北', '西北岸浪強'],
];
const WAVE_BEARINGS = DIR_NAMES.map((d) => d[0]);
function snapBearing(deg: number): number {
  deg = ((deg % 360) + 360) % 360;
  let best = WAVE_BEARINGS[0], bd = 999;
  for (const b of WAVE_BEARINGS) {
    const diff = Math.min(Math.abs(deg - b), 360 - Math.abs(deg - b));
    if (diff < bd) { bd = diff; best = b; }
  }
  return best;
}
function dirLabel(deg: number): [string, string] {
  const d = DIR_NAMES.find((x) => x[0] === snapBearing(deg)) ?? DIR_NAMES[4];
  return [d[1], d[2]];
}
function applyWaveDir(deg: number, rebuild = true) {
  deg = snapBearing(deg);
  app.waveDir = deg;
  const [name, hint] = dirLabel(deg);
  $('wave-dir-lbl').textContent = name;
  $('wave-hint').textContent = `浪從${name}方來 · ${hint}`;
  document.querySelectorAll<HTMLButtonElement>('#wave-pad .wd').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.deg) === deg);
  });
  water.setWaveAngle((-deg * Math.PI) / 180);
  if (rebuild) {
    updateSplashSources(app.built);
    // Do NOT requestBuild — sand / stack stay anchored; only swell + spray rotate
  }
  checkMiniGoal();
  dirtyMinimap = true;
}
document.querySelectorAll<HTMLButtonElement>('#wave-pad .wd').forEach((b) => {
  b.addEventListener('click', () => {
    applyWaveDir(Number(b.dataset.deg), true);
    toast(`海浪方向：${dirLabel(app.waveDir)[0]} —— ${dirLabel(app.waveDir)[1]}`, 1800);
  });
});

// play tip + mini goal
const tipEl = $('play-tip');
const mgEl = $('mini-goal');
let tipShown = false;
setTimeout(() => {
  if (!tipShown && app.mode === 'explore') { tipEl.classList.add('show'); tipShown = true; }
}, 5200);
$('tip-dismiss').addEventListener('click', () => {
  tipEl.classList.remove('show');
  setTimeout(() => mgEl.classList.add('show'), 600);
});
$('mg-close').addEventListener('click', () => mgEl.classList.remove('show'));
let mgDone = false;
function checkMiniGoal() {
  if (mgDone || !mgEl.classList.contains('show')) return;
  // goal: wave from east (exact 8-way) and late stage
  const east = app.waveDir === 90;
  if (east && app.stage > 0.7) {
    $('mg-text').textContent = '做得好！你已用東方浪向＋後期時間軸觀察海岸變化。';
    $('mg-done').textContent = '太棒了 ✓';
  }
}
$('mg-done').addEventListener('click', () => {
  mgDone = true;
  mgEl.classList.remove('show');
  toast('小任務完成！繼續拖時間軸或轉浪向探索', 2800);
});


// ------------------------------------------------------------------ boot
function boot() {
  setStage(0);
  applyEnergy();
  applyWaveDir(180, false);
  firstBuild = () => setTimeout(() => {
    $('loader').classList.add('done');
    flyOverview(4.2);
    setTimeout(() => toast('初期兩島分開 · 拖時間軸睇連島沙洲 · 八方位轉浪向 · 右上角俯視圖', 4800), 1600);
  }, 250);
  requestBuild(0);
  requestAnimationFrame(frame);
}
($('loader-text')).textContent = '正在雕刻岩岸⋯';
requestAnimationFrame(() => setTimeout(boot, 30));

// expose for debugging / automated screenshots
function setView(p: [number, number, number], t: [number, number, number]) { camTween = null; camera.position.set(...p); controls.target.set(...t); controls.update(); }
function snap() {
  if (stageTween) { setStage(stageTween.to); stageTween = null; }
  if (camTween) { camera.position.copy(camTween.p1); controls.target.copy(camTween.t1); camTween = null; controls.update(); }
}
(window as unknown as Record<string, unknown>).__sim = { snap, focusLandform, V3: THREE.Vector3, world: W, setView, app, setStage, animateStage, selectLandform, flyTo, flyOverview, flyTopDown, setMode, camera, controls, caveZ, splash, setPlaying, applyWaveDir, drawMinimap };
