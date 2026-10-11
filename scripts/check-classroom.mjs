import assert from 'node:assert/strict';
import {area,beachProfile,cliffProfile,lessons} from '../src/lessons.ts';
const polygonArea=p=>Math.abs(p.reduce((a,v,i)=>{const q=p[(i+1)%p.length];return a+v[0]*q[1]-q[0]*v[1]},0)/2);
const rockAreas=[0,1,2,3,4].map(s=>polygonArea(cliffProfile(s)));
for(let i=1;i<rockAreas.length;i++)assert.ok(rockAreas[i]<=rockAreas[i-1],'cliff rock must not grow');
for(let s=0;s<5;s++){assert.ok(Math.abs(area(beachProfile(s))-area(beachProfile(0)))<1e-10,'sand area conserved');assert.ok(beachProfile(s).every(x=>Number.isFinite(x)&&x>0));assert.equal(Math.max(...cliffProfile(s).map(p=>p[1])),9,'cliff never rises')}
assert.ok(beachProfile(2)[60]<beachProfile(0)[60],'upper beach loses sand');assert.ok(beachProfile(2)[28]>beachProfile(0)[28],'nearshore receives sand');
for(const lesson of lessons){assert.ok(lesson.steps.length>=3);assert.ok(lesson.answer>=0&&lesson.answer<lesson.choices.length);for(const s of lesson.steps)assert.ok(s.title&&s.observe&&s.reason&&s.action)}
console.log('PASS: cliff volume decreases, cliff top fixed, beach sand conserved and transferred offshore, lesson steps complete');

assert.ok(Math.max(...beachProfile(2).slice(0,48))*2-1.5<1,'storm bar remains underwater');
assert.ok(Math.max(...beachProfile(2).slice(48))*2-1.5>1,'upper beach still emerges');

// Test water animation independently of a browser and WebGL context.
const {mkdirSync,readFileSync,writeFileSync}=await import('node:fs');
mkdirSync('.model-check',{recursive:true});
writeFileSync('.model-check/water.ts',readFileSync('src/classroom-water.ts','utf8').replace("from './lessons'","from '../src/lessons.ts'"));
const {surfaceHeight,createTeachingWater}=await import('../.model-check/water.ts?'+Date.now());
const THREE=await import('three');
assert.equal(surfaceHeight('cliff',0,4,0),9);
assert.equal(surfaceHeight('cliff',4,4,0),.6);
assert.equal(surfaceHeight('arch',1,2,-3),9,'cave has blind end');
assert.equal(surfaceHeight('arch',2,2,-3),-.5,'arch admits water through');
assert.equal(surfaceHeight('arch',3,7,0),9,'stack remains solid');
assert.equal(surfaceHeight('geo',2,0,0),-2,'cleft admits water');
assert.ok(surfaceHeight('tombolo',0,0,0)<1);
assert.ok(surfaceHeight('tombolo',3,0,0)>1);
const scene=new THREE.Scene(),water=createTeachingWater(scene);
for(const l of lessons)for(let step=0;step<l.steps.length;step++){
 water.configure(l.id,step);water.update(.5);
 for(const o of scene.children)if(o.geometry)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));
}
const sea=scene.children[0];const t=sea.material.uniforms.time.value;
water.pause(true);water.update(.5);assert.equal(sea.material.uniforms.time.value,t);
water.pause(false);water.update(.5);assert.ok(sea.material.uniforms.time.value>t);
water.setVisible(false);assert.ok(scene.children.every(o=>!o.visible));
console.log('PASS: water respects rock openings, animation pauses/resumes, all lessons have finite wave/spray geometry');
