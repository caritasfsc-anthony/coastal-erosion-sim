import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 });

// wait for loader gone + first build
await page.waitForFunction(() => {
  const l = document.getElementById('loader');
  return l && l.classList.contains('done');
}, { timeout: 60000 });
await page.waitForTimeout(1500);

const sim = async (fn) => page.evaluate(fn);

async function settle(ms = 1200) {
  await page.waitForTimeout(ms);
  await sim(() => {
    const s = window.__sim;
    s.snap();
    // force a few frames
  });
  await page.waitForTimeout(400);
}

// 1) Early: two separate islands
await sim(() => {
  const s = window.__sim;
  s.setStage(0.02);
  s.applyWaveDir(180, true);
  s.setView([155, 125, 35], [0, 0, 5]);
});
// wait for worker rebuild
await page.waitForTimeout(2200);
await settle(800);
await page.screenshot({ path: `${OUT}/01-early-two-islands.png` });

// 2) Late tombolo connected
await sim(() => {
  const s = window.__sim;
  s.setStage(0.95);
  s.applyWaveDir(180, true);
  s.setView([140, 110, 20], [2, 1, 10]);
});
await page.waitForTimeout(2500);
await settle(800);
await page.screenshot({ path: `${OUT}/02-late-tombolo.png` });

// 3) Cliff + platform at Nam Tam
await sim(() => {
  const s = window.__sim;
  s.setStage(0.55);
  s.applyWaveDir(180, true);
  s.focusLandform('cliff', 0.55, 0);
  s.snap();
});
await page.waitForTimeout(2000);
await sim(() => {
  const s = window.__sim;
  // tighter teaching shot of south cliff notch + platform
  s.setView([28, 18, -120], [18, 4, -95]);
  s.snap();
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/03-cliff-platform.png` });

// 4) Wave direction UI visible + east waves sand bias
await sim(() => {
  const s = window.__sim;
  s.setStage(0.9);
  s.applyWaveDir(90, true);
  s.setView([150, 120, 30], [0, 0, 10]);
  s.snap();
});
await page.waitForTimeout(2500);
await settle(600);
// show tip
await page.evaluate(() => {
  document.getElementById('play-tip')?.classList.add('show');
});
await page.screenshot({ path: `${OUT}/04-wave-direction-ui.png` });

console.log('shots done');
await browser.close();
