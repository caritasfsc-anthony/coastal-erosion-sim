import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots-qa';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 90000 });
await page.waitForTimeout(1200);

const sim = (fn) => page.evaluate(fn);
async function waitBuild(stage) {
  await page.evaluate((s) => { window.__sim.setStage(s); window.__sim.snap(); }, stage);
  await page.waitForFunction((want) => {
    const a = window.__sim?.app;
    return a && Math.abs(a.built - want) < 0.02;
  }, stage, { timeout: 45000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__sim.snap());
  await page.waitForTimeout(400);
}

// EARLY — two islands, open channel
await waitBuild(0.05);
await sim(() => { window.__sim.setView([160, 130, 40], [0, 0, 5]); window.__sim.snap(); });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-early-two-islands.png` });

// MID — notch visible
await waitBuild(0.18);
await sim(() => {
  window.__sim.selectLandform('cliff', false);
  window.__sim.setView([35, 14, -145], [20, 2, -100]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-mid-notch.png` });

// COLLAPSE beat
await waitBuild(0.26);
await sim(() => {
  window.__sim.selectLandform('cliff', false);
  window.__sim.setView([40, 16, -140], [22, 5, -98]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-collapse-debris.png` });

// LATE tombolo merge + stack gap
await waitBuild(0.83);
await sim(() => {
  window.__sim.setView([120, 95, 25], [5, 1, 15]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-late-tombolo-overview.png` });

// Close-up sand merge (no floating rectangle)
await sim(() => {
  window.__sim.setView([55, 35, 40], [2, 1, 15]);
  window.__sim.snap();
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/05-sand-close.png` });

// Stack offshore gap
await waitBuild(0.78);
await sim(() => {
  window.__sim.selectLandform('stack', false);
  window.__sim.focusLandform('stack', 0.78, 0);
  window.__sim.snap();
});
await page.waitForTimeout(800);
await sim(() => {
  // ensure readable gap shot
  const st = window.__sim;
  st.setView([55, 28, 195], [28, 8, 165]);
  st.snap();
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-stack-gap.png` });

// Branding check
const brand = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('.brand h1')?.textContent,
  sub: document.querySelector('.brand p')?.textContent,
  hint: document.querySelector('.side-hint')?.textContent,
}));
console.log('brand', JSON.stringify(brand, null, 2));
console.log('shots done →', OUT);
await browser.close();
