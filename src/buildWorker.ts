/// <reference lib="webworker" />
// Rebuilds terrain + headland geometry off the main thread. Only the most recent request is processed.
import { HeadlandCore } from './headlandCore';
import { TerrainCore } from './terrainCore';
import { GeoCore } from './geoCore';

const head = new HeadlandCore();
const terr = new TerrainCore();
const geo = new GeoCore();
let pending: { s: number; id: number; wd?: number } | null = null;
let busy = false;

function run() {
  if (!pending) { busy = false; return; }
  busy = true;
  const { s, id, wd = 180 } = pending; pending = null;
  const t0 = performance.now();
  const h = head.build(s);
  const grids = terr.buildGrids(s, wd);
  const g = geo.build(s, (x, z) => terr.rawAt(x, z), (x, z) => terr.rawMatAt(x, z));
  const tex = terr.heightTexture(grids.inner, (x, z) => head.solidAt(x, z), (x, z, raw) => geo.texHeight(x, z, raw));
  const t = { ...grids, tex };
  const ms = performance.now() - t0;
  const transfer = [h.positions.buffer, h.indices.buffer, h.normals.buffer, h.colors.buffer,
    t.inner.heights.buffer, t.inner.normals.buffer, t.inner.colors.buffer,
    t.outer.heights.buffer, t.outer.normals.buffer, t.outer.colors.buffer, t.tex.buffer,
    g.positions.buffer, g.indices.buffer, g.normals.buffer, g.colors.buffer] as ArrayBuffer[];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, s, wd, ms, head: h, geo: g, terrain: t }, transfer);
  setTimeout(run, 0);
}

self.onmessage = (e: MessageEvent<{ s: number; id: number; wd?: number }>) => {
  pending = e.data;
  if (!busy) { busy = true; setTimeout(run, 0); }
};
