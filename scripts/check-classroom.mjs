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
