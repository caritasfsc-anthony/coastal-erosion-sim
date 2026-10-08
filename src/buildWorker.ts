/// <reference lib="webworker" />
// Rebuilds terrain + headland geometry off the main thread. Only the most recent request is processed.
import { HeadlandCore } from './headlandCore';
import { TerrainCore } from './terrainCore';

const head = new HeadlandCore();
const terr = new TerrainCore();
let pending: { s: number; id: number } | null = null;
let busy = false;

function run() {
  if (!pending) { busy = false; return; }
  busy = true;
  const { s, id } = pending; pending = null;
  const t0 = performance.now();
  const h = head.build(s);
  const t = terr.build(s, (x, z) => head.solidAt(x, z));
  const ms = performance.now() - t0;
  const transfer = [h.positions.buffer, h.indices.buffer, h.normals.buffer, h.colors.buffer,
    t.inner.heights.buffer, t.inner.normals.buffer, t.inner.colors.buffer,
    t.outer.heights.buffer, t.outer.normals.buffer, t.outer.colors.buffer, t.tex.buffer] as ArrayBuffer[];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, s, ms, head: h, terrain: t }, transfer);
  setTimeout(run, 0);
}

self.onmessage = (e: MessageEvent<{ s: number; id: number }>) => {
  pending = e.data;
  if (!busy) { busy = true; setTimeout(run, 0); }
};
