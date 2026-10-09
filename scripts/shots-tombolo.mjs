import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 120000 });
await page.waitForTimeout(2500);

const sim = (fn) => page.evaluate(fn);

// 1) Late tombolo — oblique, show sand merging into both islands
await sim(() => {
  const s = window.__sim;
  s.setStage(1.0);
  s.applyWaveDir(135, true);
  s.setView([95, 55, 70], [2, 1, 12]);
  s.snap();
});
await page.waitForTimeout(3200);
await page.screenshot({ path: `${OUT}/20-tombolo-late-connected.png` });

// 2) Late tombolo — closer necklace view (was the broken rectangular gap view)
await sim(() => {
  const s = window.__sim;
  s.setStage(1.0);
  s.applyWaveDir(135, true);
  s.setView([40, 38, 55], [2, 1.5, 10]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/21-tombolo-late-close.png` });

// 3) Top-down late dumbbell — sand bridge clear
await sim(() => {
  const s = window.__sim;
  s.setStage(0.95);
  s.applyWaveDir(180, true);
  s.flyTopDown?.(0);
  s.setView([0, 260, 0.2], [2, 0, 10]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/22-tombolo-late-topdown.png` });

// 4) Mid submerged bar
await sim(() => {
  const s = window.__sim;
  s.setStage(0.42);
  s.applyWaveDir(135, true);
  s.setView([90, 50, 65], [2, 0, 12]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/23-tombolo-mid-submerged.png` });

// 5) Early two islands open water
await sim(() => {
  const s = window.__sim;
  s.setStage(0.05);
  s.applyWaveDir(180, true);
  s.setView([100, 70, 40], [0, 1, 5]);
  s.snap();
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/24-tombolo-early-open.png` });

console.log('tombolo shots done');
await browser.close();
