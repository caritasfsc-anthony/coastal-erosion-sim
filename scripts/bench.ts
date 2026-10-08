import { HeadlandCore } from '../src/headlandCore';
import { TerrainCore } from '../src/terrainCore';
let a = performance.now();
const h = new HeadlandCore(); const t = new TerrainCore();
console.log('init', (performance.now() - a).toFixed(0), 'ms');
for (const s of [0, 0.02, 0.3, 0.5, 0.52, 0.75, 1, 0.42]) {
  a = performance.now(); const m = h.build(s); const b = performance.now(); t.build(s, (x, z) => h.solidAt(x, z)); const c = performance.now();
  console.log(s, 'head', (b - a).toFixed(0), 'ms verts', m.positions.length / 3, 'terrain', (c - b).toFixed(0), 'ms');
}
