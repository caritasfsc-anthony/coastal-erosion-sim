import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';

const OUT = 'docs/shots-lesson';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:4177/coastal-erosion-sim/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), { timeout: 120000 });
await page.waitForTimeout(1500);

async function waitBuild(stage) {
  await page.evaluate((s) => { window.__sim.setStage(s); window.__sim.snap(); }, stage);
  await page.waitForFunction((want) => {
    const a = window.__sim?.app;
    return a && Math.abs(a.built - want) < 0.025;
  }, stage, { timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__sim.snap());
  await page.waitForTimeout(350);
}

async function waitWave(deg) {
  await page.evaluate((d) => { window.__sim.applyWaveDir(d, true); }, deg);
  // wait for rebuild with same stage but new wd
  await page.waitForTimeout(200);
  await page.waitForFunction(() => {
    const a = window.__sim?.app;
    return a && Math.abs(a.built - a.stage) < 0.03;
  }, { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__sim.snap());
  await page.waitForTimeout(300);
}

// 1) Focus tombolo mid — soft sand, no box, only one hotspot
await waitBuild(0.48);
await page.evaluate(() => {
  window.__sim.selectLandform('tombolo', true);
  window.__sim.snap();
});
await page.waitForTimeout(600);
await waitBuild(0.48);
await page.evaluate(() => {
  window.__sim.setView([70, 55, 55], [2, 0.5, 14]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/01-focus-tombolo-mid-soft.png` });

// 2) Wave from West — sand lee to east
await waitWave(270);
await page.evaluate(() => {
  window.__sim.setView([0, 220, 0.01], [0, 0, 10]);
  window.__sim.snap();
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-wave-west-sand-lee-east-top.png` });

// 3) Wave from East — sand lee to west  
await waitWave(90);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/03-wave-east-sand-lee-west-top.png` });

// 4) Late clean tombolo (no cyan box)
await waitBuild(0.9);
await page.evaluate(() => {
  window.__sim.selectLandform('tombolo', true);
  window.__sim.applyWaveDir(180, true);
});
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__sim.setView([95, 70, 30], [2, 1, 14]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-late-tombolo-clean.png` });

// 5) Cliff focus — only cliff lesson
await page.evaluate(() => window.__sim.selectLandform('cliff', true));
await waitBuild(0.18);
await page.evaluate(() => {
  window.__sim.setView([38, 12, -148], [18, 2, -100]);
  window.__sim.snap();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-focus-cliff-notch.png` });

// 6) Cliff + south waves vs north waves (notch intensity)
await waitWave(180);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-cliff-waves-from-south.png` });
await waitWave(0);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/07-cliff-waves-from-north.png` });

console.log('done', OUT);
await browser.close();
