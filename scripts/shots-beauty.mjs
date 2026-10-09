import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots';
await mkdir(OUT, { recursive: true });
const chrome = process.env.CHROME_PATH || '/home/box/.cache/ms-playwright/chromium-1140/chrome-linux/chrome';

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 90000 });
await page.waitForTimeout(2000);
const sim = (fn) => page.evaluate(fn);
async function settle(ms = 900) {
  await page.waitForTimeout(ms);
  await sim(() => window.__sim.snap());
  await page.waitForTimeout(450);
}

// Hide tip for clean shots
await page.evaluate(() => document.getElementById('play-tip')?.classList.remove('show'));

// 1) Side-on tall Nam Tam cliff + platform (from SW, looking NE along face)
await sim(() => {
  const s = window.__sim;
  s.setStage(0.55);
  s.applyWaveDir(180, true);
  s.setView([-40, 18, -160], [15, 12, -100]);
  s.snap();
});
await page.waitForTimeout(2800);
await settle();
await page.screenshot({ path: `${OUT}/06-tall-cliff-namtam.png` });

// 2) Low sea-level looking UP at cliff wall
await sim(() => {
  const s = window.__sim;
  s.setStage(0.5);
  s.applyWaveDir(180, true);
  s.setView([20, 6, -175], [18, 18, -105]);
  s.snap();
});
await page.waitForTimeout(2500);
await settle();
await page.screenshot({ path: `${OUT}/07-cliff-silhouette.png` });

// 3) Beauty overview
await sim(() => {
  const s = window.__sim;
  s.setStage(0.75);
  s.applyWaveDir(180, true);
  s.setView([195, 130, 80], [2, 8, -20]);
  s.snap();
});
await page.waitForTimeout(2800);
await settle();
await page.screenshot({ path: `${OUT}/05-beauty-overview.png` });

// 4) Cliff/platform teaching
await sim(() => {
  const s = window.__sim;
  s.setStage(0.6);
  s.applyWaveDir(180, true);
  s.setView([60, 22, -150], [22, 10, -100]);
  s.snap();
});
await page.waitForTimeout(2400);
await settle();
await page.screenshot({ path: `${OUT}/03-cliff-platform.png` });

// 5) early / late
await sim(() => { const s = window.__sim; s.setStage(0.02); s.applyWaveDir(180, true); s.setView([155, 125, 35], [0, 2, 5]); });
await page.waitForTimeout(2200); await settle();
await page.screenshot({ path: `${OUT}/01-early-two-islands.png` });

await sim(() => { const s = window.__sim; s.setStage(0.95); s.applyWaveDir(180, true); s.setView([150, 115, 40], [2, 4, 5]); });
await page.waitForTimeout(2500); await settle();
await page.screenshot({ path: `${OUT}/02-late-tombolo.png` });

console.log('beauty shots done');
await browser.close();
