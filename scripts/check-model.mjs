import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir = path.resolve('.model-check');
await fs.mkdir(dir, {recursive:true});
for (const name of ['world','noise','landforms','headlandCore','surfaceNets','palette']) {
  const source = await fs.readFile(`src/${name}.ts`, 'utf8');
  const sourceWithExtensions = source.replace(/from '(\.\/[^']+)'/g, "from '$1.ts'");
  await fs.writeFile(`${dir}/${name}.ts`,sourceWithExtensions);
}
const w = await import(pathToFileURL(`${dir}/world.ts`).href);
const l = await import(pathToFileURL(`${dir}/landforms.ts`).href);
const {HeadlandCore} = await import(pathToFileURL(`${dir}/headlandCore.ts`).href);
for (const [deg,shore] of [[0,'北岸'],[90,'東岸'],[180,'南岸'],[270,'西岸']]) {
  assert.ok(w.waveLessonTip(null,deg).includes(shore), `${deg}: expected ${shore}`);
  const v=w.waveTravel(deg); assert.ok(Math.abs(Math.hypot(v.dx,v.dz)-1)<1e-9);
}
for (const lf of l.LANDFORMS) assert.ok(l.landformState(lf.id,lf.bestStage).present, `${lf.id} best stage must be visible`);
assert.equal(l.landformState('stack',1).present,false);
assert.equal(l.landformState('stump',1).present,true);
assert.ok(!l.SEQUENCE.includes('cliff'));
for (let k=0;k<w.SEGMENTS.length;k++) {
  const sg=w.SEGMENTS[k], early=w.stackGeom(k,.65), late=w.stackGeom(k,1);
  assert.equal(early.zs,late.zs);
  assert.ok(early.zs+early.r<=sg.b && early.zs-early.r>=sg.a,'stack must be a remnant inside original headland');
}
assert.deepEqual(w.lessonStages('cave',.75),{sand:.04,cliff:.26,geo:.18,head:.75});
const head=new HeadlandCore();
for (const stage of [0,.3,.5,.75,1]) {
  const mesh=head.build(stage);
  assert.ok(mesh.positions.length>0);
  assert.ok(mesh.positions.every(Number.isFinite));
  let maxZ=-Infinity; for(let i=2;i<mesh.positions.length;i+=3) maxZ=Math.max(maxZ,mesh.positions[i]);
  assert.ok(maxZ<=152,`offshore growth at stage ${stage}: ${maxZ}`);
}
console.log('PASS: wave bearings, nine lesson stages, stack/stump exclusivity, fixed remnant positions, focus isolation and finite headland meshes.');


