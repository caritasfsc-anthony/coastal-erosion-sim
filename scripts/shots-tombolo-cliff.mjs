import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots';
await mkdir(OUT, { recursive: true });
const BASE = process.env.SIM_URL || 'http://127.0.0.1:5174/';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 180000 });
await page.waitForTimeout(2000);

const sim = (fn) => page.evaluate(fn);

// Late connected tombolo
await sim(() => {
  const s = window.__sim;
  s.setStage(1.0);
  s.applyWaveDir(135, true);
  s.setView([70, 42, 58], [2, 1.2, 12]);
  s.snap();
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/20-tombolo-late-connected.png` });

await sim(() => {
  const s = window.__sim;
  s.setStage(1.0);
  s.setView([25, 32, 48], [2, 1.5, 8]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/21-tombolo-late-close.png` });

// Early two islands
await sim(() => {
  const s = window.__sim;
  s.setStage(0.04);
  s.applyWaveDir(180, true);
  s.setView([110, 80, 30], [0, 1, 5]);
  s.snap();
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/24-tombolo-early-open.png` });

// Cliff early notch
await sim(() => {
  const s = window.__sim;
  s.setStage(0.16);
  s.applyWaveDir(180, true);
  s.setView([55, 14, -195], [18, 3, -155]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/30-cliff-notch-early.png` });

// Cliff late + wide platform
await sim(() => {
  const s = window.__sim;
  s.setStage(0.92);
  s.applyWaveDir(180, true);
  s.setView([70, 22, -175], [22, 2, -130]);
  s.snap();
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/31-cliff-platform-late.png` });

// Stacks spaced offshore
await sim(() => {
  const s = window.__sim;
  s.setStage(0.95);
  s.applyWaveDir(90, true);
  s.setView([75, 35, 100], [28, 4, 140]);
  s.snap();
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/32-stacks-offshore.png` });

console.log('shots done');
await browser.close();
