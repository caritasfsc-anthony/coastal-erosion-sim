import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { beachProfile, beachX, cliffProfile, type LessonId } from './lessons';
export function createClassroom(canvas:HTMLCanvasElement) {
 const renderer=new T.WebGLRenderer({canvas,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setClearColor('#dbe7e5'); renderer.shadowMap.enabled=true;
 const scene=new T.Scene(); const camera=new T.PerspectiveCamera(37,1,.1,180); const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.minDistance=12; controls.maxDistance=65; controls.maxPolarAngle=Math.PI*.49;
 scene.add(new T.HemisphereLight('#ffffff','#6d7770',2.6)); const sun=new T.DirectionalLight('#fff7e3',3);sun.position.set(-12,30,18);scene.add(sun);
 const model=new T.Group(), helpers=new T.Group();scene.add(model,helpers);
 const rock=new T.MeshStandardMaterial({color:'#8b8577',roughness:.95}); const sand=new T.MeshStandardMaterial({color:'#dfb86f',roughness:1}); const rubble=new T.MeshStandardMaterial({color:'#b0a390',roughness:1});
 const seaMat=new T.MeshStandardMaterial({color:'#3a9caa',transparent:true,opacity:.48,roughness:.3,metalness:.12,depthWrite:false,side:T.DoubleSide});
 const seabed=new T.Mesh(new T.BoxGeometry(34,.6,22),new T.MeshStandardMaterial({color:'#b7c4bc',roughness:1})); seabed.position.y=-2.4;scene.add(seabed);
 const sea=new T.Mesh(new T.PlaneGeometry(34,22),seaMat);sea.rotation.x=-Math.PI/2;sea.position.y=1;sea.renderOrder=3;scene.add(sea);
 let id:LessonId='cliff', step=0, showGhost=true, showWater=true, side=false;let elapsed=0;
 const waves=new T.Group();scene.add(waves);
 function clear(group:T.Group) {for(const obj of [...group.children]) {group.remove(obj);obj.traverse(o=>{if(o instanceof T.Mesh || o instanceof T.Line) o.geometry.dispose()})}}
 function mesh(g:T.BufferGeometry,mat:T.Material,group=model) {const m=new T.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,mat=rock,group=model) {const m=mesh(new T.BoxGeometry(w,h,d),mat,group);m.position.set(x,y,z);return m}
 function solid(points:[number,number][],depth:number,mat=rock,z=-depth/2,group=model) {const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const m=mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:28}),mat,group);m.position.z=z;return m}
 function line(points:T.Vector3[],color='#f4f7ec',dashed=false,group=helpers) {const m=new T.Line(new T.BufferGeometry().setFromPoints(points),dashed?new T.LineDashedMaterial({color,dashSize:.38,gapSize:.22}):new T.LineBasicMaterial({color}));m.computeLineDistances();group.add(m);return m}
 function arrow(from:T.Vector3,to:T.Vector3,color='#d59630') {const d=to.clone().sub(from);helpers.add(new T.ArrowHelper(d.clone().normalize(),from,d.length(),color,.65,.35))}
 function layers(x0:number,x1:number,z:number,height=9) {for(let y=3.7;y<height;y+=1.45) line([new T.Vector3(x0,y,z),new T.Vector3(x1,y,z)],'#bdb5a4')}
 function ghost(points:[number,number][],depth:number) {if(!showGhost)return;const s=new T.Shape(points.map(p=>new T.Vector2(...p)));const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false});const e=new T.LineSegments(new T.EdgesGeometry(g),new T.LineDashedMaterial({color:'#b87645',dashSize:.4,gapSize:.25,transparent:true,opacity:.65}));g.dispose();e.position.z=-depth/2;e.computeLineDistances();helpers.add(e)}
 function stone(x:number,y:number,z:number,r:number) {const m=mesh(new T.DodecahedronGeometry(r,0),rubble);m.position.set(x,y,z);m.rotation.set(x*.3,z,y)}
 function build() {
  clear(model);clear(helpers);clear(waves); sea.visible=showWater;
  if(id==='cliff') {
   solid(cliffProfile(step),10);const r=[0,0,2.8,2.8,6][step];layers(r,13,5.02);
   ghost(cliffProfile(0),10);line([new T.Vector3(0,-1,5.2),new T.Vector3(0,10,5.2)],'#bd7445',true);
   if(step===2) for(let i=0;i<10;i++)stone(.1+(i%4)*.65,1.1+(i%3)*.25,-3+Math.floor(i/4)*2,.5+(i%2)*.18);
   if(step===1)arrow(new T.Vector3(-5,1.8,5.2),new T.Vector3(2.5,1.8,5.2));
   if(step>=2)arrow(new T.Vector3(0,10,0),new T.Vector3(r,10,0));
  } else if(id==='arch') {
   // Headland cross-section: landward left pillar, original seaward right pillar.
   const outline:[number,number][]=[[-10,-2],[10,-2],[10,9],[-10,9]];
   ghost(outline,7);
   if(step<3){const s=new T.Shape(outline.map(p=>new T.Vector2(...p)));if(step>0){const hole=new T.Path();hole.absellipse(2,3.5,3.5,4,0,Math.PI*2,true,0);s.holes.push(hole)}const m=mesh(new T.ExtrudeGeometry(s,{depth:7,bevelEnabled:false,curveSegments:40}),rock);m.position.z=-3.5;if(step===1)box(2,4.5,-3.1,7.2,9,.8);for(let y=3.7;y<9;y+=1.45){if(step>0&&Math.abs(y-3.5)<4){const half=3.5*Math.sqrt(1-((y-3.5)/4)**2);line([new T.Vector3(-10,y,3.52),new T.Vector3(2-half,y,3.52)],'#bdb5a4');line([new T.Vector3(2+half,y,3.52),new T.Vector3(10,y,3.52)],'#bdb5a4')}else line([new T.Vector3(-10,y,3.52),new T.Vector3(10,y,3.52)],'#bdb5a4')}}
   else {box(-7,3.5,0,6,11,7);box(7.7,step===3?3.5:.1,0,4.6,step===3?11:4.2,7);layers(-10,-4,3.52);if(step===3){layers(5.4,10,3.52);for(let i=0;i<8;i++)stone(-2+i*.8,-.15,1+(i%2),.5)}}
   if(step===0)line([new T.Vector3(2,9.05,-3.5),new T.Vector3(2,9.05,3.5)],'#bd7445',true);
  } else if(id==='beach') {
   const profile=beachProfile(step);const points:[number,number][]=[[-10,-2],[10,-2],...beachX.map((x,i)=>[x,-1.5+profile[i]*2] as [number,number]).reverse()];
   solid(points,12,sand);box(0,-2.1,0,20,.2,12);if(showGhost){const p=beachProfile(0);line(beachX.map((x,i)=>new T.Vector3(x,-1.5+p[i]*2,6.05)),'#b87645',true)}
   if(step===1||step===3){const dir=step===1?-1:1;for(let z=-4;z<=4;z+=4)arrow(new T.Vector3(dir===-1?5:-3,5,z),new T.Vector3(dir===-1?-3:5,2,z))}
   if(step===4){const points:T.Vector3[]=[];for(let z=-5;z<5;z+=2){points.push(new T.Vector3(2,1.1,z),new T.Vector3(5,3.3,z+1),new T.Vector3(2,1.1,z+2))}line(points,'#b47b15');for(let z=-4;z<=4;z+=4)arrow(new T.Vector3(2,1.15,z),new T.Vector3(5,3.35,z+1))}
  } else if(id==='geo') {
   const width=[.18,1,2][step],end=[-1,-4,-7][step];
   box(-2.5,3.5,0,15,11,12); // remove cleft using separate side solids rather than overlapping height surfaces
   clear(model);box(-6,3.5,0,8,11,12);box(6,3.5,0,8,11,12);box(0,3.5,-6+(end+6)/2,4,11,Math.max(.1,end+6));
   // Side infill shrinks to expose a narrow channel at the front.
   box(-1-width/2,3.5,(end+6)/2,2-width,11,6-end);box(1+width/2,3.5,(end+6)/2,2-width,11,6-end);
   if(step===0)line([new T.Vector3(0,9.05,-6),new T.Vector3(0,9.05,6)],'#bd7445',true);
   ghost([[-10,-2],[10,-2],[10,9],[-10,9]],12);arrow(new T.Vector3(0,1.25,10),new T.Vector3(0,1.25,Math.max(-5,end+1)));
  } else {
   box(11,1,0,8,6,18);const island=mesh(new T.CylinderGeometry(2.3,3.5,6,8),rock);island.position.set(-10,1,0);
   const height=[.1,.65,1.25,2.3][step];const nx=65,nz=41;const positions:number[]=[],indices:number[]=[];
   for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=-10+i*17/(nx-1),z=-7+j*14/(nz-1);const end=Math.sin(Math.PI*i/(nx-1));const h=.15+height*Math.exp(-((z/(1.8+.7*end))**2))*(.7+.3*end);positions.push(x,-1+h*1.3,z)}
   for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i;indices.push(a,a+nx,a+1,a+1,a+nx,a+nx+1)}
   const perimeter=[...Array.from({length:nx},(_,i)=>i),...Array.from({length:nz-1},(_,j)=>(j+1)*nx+nx-1),...Array.from({length:nx-1},(_,i)=>(nz-1)*nx+nx-2-i),...Array.from({length:nz-2},(_,j)=>(nz-2-j)*nx)];for(let k=0;k<perimeter.length;k++){const a=perimeter[k],b=perimeter[(k+1)%perimeter.length],c=positions.length/3;positions.push(positions[a*3],-2,positions[a*3+2],positions[b*3],-2,positions[b*3+2]);indices.push(a,c,b,b,c,c+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,sand);
   if(step>0)for(const z of [-5,5])arrow(new T.Vector3(-1,1.4,z),new T.Vector3(-1,1.4,Math.sign(z)*1.2));
   // Wave crests are explanatory curves, not simulated diffraction.
   for(const z of [-6,6])line([new T.Vector3(-15,1.15,z),new T.Vector3(-9,1.15,z*.85),new T.Vector3(-4,1.15,z*.5),new T.Vector3(0,1.15,z*.35)],'#eefaf3');
  }
  const axis=id==='geo'?'z':'x'; for(let i=0;i<5;i++){const points=Array.from({length:40},(_,j)=>axis==='x'?new T.Vector3(-15+i*1.5,1.13,-9+j*.46):new T.Vector3(-12+j*.6,1.13,8+i*1.3));line(points,'#eefaf3',false,waves)}
  waves.visible=showWater;
 }
 function fit(){controls.target.set(0,id==='beach'?0:3,0);if(side)camera.position.set(0,5,38);else camera.position.set(-25,24,29);camera.lookAt(controls.target);controls.update()}
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 renderer.setAnimationLoop(()=>{elapsed+=.016;waves.position.x=id==='geo'?0:Math.sin(elapsed)*.4;waves.position.z=id==='geo'?Math.sin(elapsed)*.4:0;controls.update();renderer.render(scene,camera)});
 build();fit();resize();
 return {set(lesson:LessonId,s:number){const changed=id!==lesson;id=lesson;step=s;build();if(changed){side=false;fit()}},water(v:boolean){showWater=v;sea.visible=v;waves.visible=v},ghost(v:boolean){showGhost=v;build()},view(v:'side'|'three'|'top'){side=v==='side';fit();if(v==='top'){camera.position.set(0,42,.01);camera.lookAt(controls.target);controls.update()}},reset(){fit()}};
}
