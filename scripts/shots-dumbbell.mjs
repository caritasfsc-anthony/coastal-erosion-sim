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
await page.waitForTimeout(2000);

const sim = (fn) => page.evaluate(fn);

// 1) Early plan / oblique — two irregular islands (NOT blobs)
await sim(() => {
  const s = window.__sim;
  s.setStage(0.03);
  s.applyWaveDir(180, true);
  s.setView([0, 280, 0.5], [0, 0, -5]); // near top-down plan
});
await page.waitForTimeout(2800);
await sim(() => window.__sim.snap());
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/10-plan-early-two-islands.png` });

// 2) Same early, oblique to show rocky silhouette (not cylinders)
await sim(() => {
  const s = window.__sim;
  s.setStage(0.05);
  s.setView([170, 95, 40], [0, 2, -5]);
  s.snap();
});
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/11-oblique-irregular-islands.png` });

// 3) Late dumbbell + 8-way wave pad UI visible
await sim(() => {
  const s = window.__sim;
  s.setStage(0.92);
  s.applyWaveDir(90, true);
  s.setView([155, 115, 45], [0, 1, 5]);
  s.snap();
});
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/12-eight-way-wave-ui.png` });

// 4) Top-view widget focus (main camera top-down + minimap)
await sim(() => {
  const s = window.__sim;
  s.setStage(0.85);
  s.applyWaveDir(180, true);
  s.flyTopDown(0);
  s.snap();
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/13-topview-minimap.png` });

// crop minimap alone via clip of top-right
await page.screenshot({
  path: `${OUT}/14-minimap-widget.png`,
  clip: { x: 1440 - 220, y: 55, width: 210, height: 320 },
});

console.log('shots done');
await browser.close();
