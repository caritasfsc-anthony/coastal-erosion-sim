import './style.css';
import * as THREE from 'three';
import { createWorld } from './scene';
import { LANDFORMS, PROCESSES, SEQUENCE, byId, landformState, type LandformId } from './landforms';
import { OVERVIEW, STORY } from './story';
import { GX, HX, SEGMENTS, caveZ, cliffLine, coast0, headHalfWidth, phase, stackGeom, ISLAND } from './world';
import { clamp } from './noise';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const W = createWorld($('scene') as unknown as HTMLCanvasElement);
const { camera, controls, land, water, splash, composer, sky } = W;

// geometry is rebuilt in a worker so dragging the timeline never blocks rendering
const worker = new Worker(new URL('./buildWorker.ts', import.meta.url), { type: 'module' });
let reqId = 0, inflight = false, requested = -1;
let firstBuild: (() => void) | null = null;
worker.onmessage = (e: MessageEvent) => {
  const { s, head, terrain } = e.data;
  land.apply(head, terrain);
  app.built = s;
  inflight = false;
  updateSplashSources(s);
  updateLandformStates();
  if (firstBuild) { firstBuild(); firstBuild = null; }
};
function requestBuild(s: number) {
  requested = s;
  inflight = true;
  worker.postMessage({ s, id: ++reqId });
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
};

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
  const name = app.stage < 0.34 ? '初期' : app.stage < 0.67 ? '中期' : '後期';
  $('stage-name').textContent = `${name} · ${Math.round(app.stage * 100)}%`;
  const years = Math.round((app.stage * 8000) / 100) * 100;
  $('stage-years').textContent = `經過約 ${years.toLocaleString('zh-HK')} 年（示意）`;
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
  const st = landformState(id, stage);
  const target = st.pos.clone();
  target.y = Math.max(1.5, target.y * 0.6);
  const off = new THREE.Vector3(...lf.view);
  flyTo(target.clone().add(off), target, dur);
}


function updateSplashSources(s: number) {
  const src: { p: THREE.Vector3; n: THREE.Vector3; w: number }[] = [];
  const add = (x: number, z: number, nx: number, nz: number, w: number) =>
    src.push({ p: new THREE.Vector3(x, 0, z), n: new THREE.Vector3(nx, 0, nz).normalize(), w });
  // headland: still-attached blocks and stacks
  let tip = 28;
  for (let k = SEGMENTS.length - 1; k >= 0; k--) {
    const p = phase(s, k);
    const sg = SEGMENTS[k];
    if (p < 0.6) {
      tip = Math.max(tip, sg.b);
      const zm = (sg.a + sg.b) / 2, w = headHalfWidth(zm);
      add(HX + w + 1, zm, 1, 0.4, 1); add(HX - w - 1, zm, -1, 0.4, 0.8);
    } else if (p < 0.98) {
      const st = stackGeom(k, p);
      const r = p > 0.85 ? st.r : st.r + 0.5;
      add(HX, st.zs + r, 0, 1, 1.4); add(HX + r, st.zs, 1, 0.3, 0.7); add(HX - r, st.zs, -1, 0.3, 0.6);
    }
  }
  add(HX, tip + 1, 0, 1, 2);
  // straight cliff coast (waves break on the platform edge / cliff toe)
  for (let x = 48; x <= 150; x += 12) {
    if (Math.abs(x - GX) < 4) continue;
    const z = s < 0.25 ? cliffLine(x, s) + 1.2 : coast0(x) + 6;
    add(x, z, 0, 1, 0.9);
  }
  for (let x = -150; x <= -104; x += 10) add(x, cliffLine(x, s) + 1.5, 0, 1, 0.5);
  add(ISLAND.x - 10, ISLAND.z + ISLAND.r - 2, 0, 1, 0.9);
  add(ISLAND.x + 12, ISLAND.z + ISLAND.r - 6, 0.6, 1, 0.9);
  splash.sources = src;
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
  for (const hs of hotspots) {
    tmp.copy(hs.pos).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
    hs.el.classList.toggle('hidden', !vis);
    if (!vis) continue;
    const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
    hs.el.style.transform = `translate(${x - 9}px, ${y - 9}px)`;
    hs.el.style.zIndex = String(Math.round((1 - tmp.z) * 100000));
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
  $('info-example').textContent = lf.example ? `香港例子：${lf.example}` : '';
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
  const from = Math.max(0, lf.bestStage - (lf.id === 'platform' || lf.id === 'tombolo' || lf.id === 'beach' ? 0.7 : 0.28));
  setStage(from);
  focusLandform(lf.id, lf.bestStage, 1.2);
  setTimeout(() => animateStage(lf.bestStage, 4.5), 500);
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
  if (app.mode === 'quiz') { quizAnswer(id); return; }
  selectLandform(id, true);
}

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
  splash.update(dt);
  composer.render(dt);
  projectHotspots();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ boot
function boot() {
  setStage(0);
  applyEnergy();
  firstBuild = () => setTimeout(() => {
    $('loader').classList.add('done');
    flyOverview(4.2);
    setTimeout(() => toast('拖曳旋轉 · 滾輪縮放 · 點擊光點探索 · 拖動下方時間軸觀察侵蝕', 4200), 1800);
  }, 250);
  requestBuild(0);
  requestAnimationFrame(frame);
}
($('loader-text')).textContent = '正在雕刻岩岸⋯';
requestAnimationFrame(() => setTimeout(boot, 30));

// expose for debugging / automated screenshots
function setView(p: [number, number, number], t: [number, number, number]) { camTween = null; camera.position.set(...p); controls.target.set(...t); controls.update(); }
(window as unknown as Record<string, unknown>).__sim = { setView, app, setStage, animateStage, selectLandform, flyTo, flyOverview, setMode, camera, controls, caveZ };
