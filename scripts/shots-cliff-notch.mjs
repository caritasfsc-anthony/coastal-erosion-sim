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
await page.waitForTimeout(1500);

const sim = (fn) => page.evaluate(fn);

// ① Notch phase — 海蝕凹地
await sim(() => {
  const s = window.__sim;
  s.setMode('explore');
  s.setStage(0.17);
  s.selectLandform('cliff', false);
  s.applyWaveDir(180, true);
  s.setView([52, 14, -118], [18, 3, -88]);
  s.snap();
});
await page.waitForTimeout(4500);
await page.screenshot({ path: `${OUT}/cliff-notch.png`, type: 'png' });
console.log('saved cliff-notch.png');

// ② Collapse beat — animate across collapse threshold so toast + debris fire
await sim(() => {
  const s = window.__sim;
  s.setStage(0.22);
  s.selectLandform('cliff', false);
  s.setView([48, 16, -112], [18, 6, -86]);
  s.snap();
});
await page.waitForTimeout(2500);
await sim(() => {
  const s = window.__sim;
  s.animateStage(0.28, 1.2);
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/cliff-collapse.png`, type: 'png' });
console.log('saved cliff-collapse.png');

// ③ After collapse — steep cliff + platform
await sim(() => {
  const s = window.__sim;
  s.setStage(0.55);
  s.selectLandform('cliff', false);
  s.setView([55, 18, -105], [22, 8, -78]);
  s.snap();
});
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/cliff-after.png`, type: 'png' });
console.log('saved cliff-after.png');

await browser.close();
