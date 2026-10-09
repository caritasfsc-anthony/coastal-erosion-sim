import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';
const OUT = 'docs/shots-qa';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 90000 });
await page.waitForTimeout(1000);

async function waitBuild(stage) {
  await page.evaluate((s) => { window.__sim.setStage(s); window.__sim.snap(); }, stage);
  await page.waitForFunction((want) => Math.abs(window.__sim.app.built - want) < 0.02, stage, { timeout: 45000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__sim.snap());
}

// Side-on south cliff at notch peak — camera south of cliff looking north at face
await waitBuild(0.17);
await page.evaluate(() => {
  window.__sim.selectLandform('cliff', false);
  // seaward, low, looking at waterline notch
  window.__sim.setView([22, 8, -155], [20, 3.5, -105]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/07-notch-side.png` });

await waitBuild(0.26);
await page.evaluate(() => {
  window.__sim.selectLandform('cliff', false);
  window.__sim.setView([30, 12, -150], [22, 6, -100]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08-collapse-side.png` });

await waitBuild(0.9);
await page.evaluate(() => {
  window.__sim.closeInfo?.();
  window.__sim.setView([70, 45, 55], [2, 1, 12]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/09-late-sand-merge.png` });

console.log('cliff-side shots done');
await browser.close();
