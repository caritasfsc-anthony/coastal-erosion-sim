import * as T from 'three';
import { beachProfile, type LessonId } from './lessons';

// Visual water only: the static teaching geometry controls where water can appear.
// No sediment, erosion, refraction or fluid solver is driven by this animation.
export function surfaceHeight(id:LessonId, step:number, x:number, z:number):number {
 if(id==='cliff') return Math.abs(z)<5 ? (x>=[0,0,2.8,2.8,6][step]&&x<=13?9:x>=-8&&x<13?.6:-2) : -2;
 if(id==='beach' && Math.abs(z)<6 && x>=-10&&x<=10){const a=(x+10)/.25,i=Math.min(79,Math.floor(a)),f=a-i,p=beachProfile(step);return -1.5+2*(p[i]*(1-f)+p[i+1]*f)}
 if(id==='arch' && Math.abs(z)<3.5 && x>-10&&x<10){if(step>=3)return x<-4?9:x>5.4?(step===3?9:2.2):-2;const opening=step>0&&((x-2)/3.5)**2+((1-3.5)/4)**2<1;return opening&&(step===2||z>-2.7)?-.5:9}
 if(id==='geo'&&Math.abs(x)<10&&Math.abs(z)<6){const w=[.18,1,2][step],end=[-1,-4,-7][step];return Math.abs(x)<w&&z>end?-2:9}
 if(id==='tombolo'){if(x>=7&&x<=15&&Math.abs(z)<9)return 4;if(Math.hypot(x+10,z)<3)return 4;if(x>=-10&&x<=7){const end=Math.sin(Math.PI*(x+10)/17),height=[.1,.65,1.25,2.3][step];return -1+(.15+height*Math.exp(-((z/(1.8+.7*end))**2))*(.7+.3*end))*1.3}}
 return -2;
}

export function createTeachingWater(scene:T.Scene) {
 const size=160, heights=new Float32Array(size*size*4), distance=new Float32Array(size*size);
 const depthTexture=new T.DataTexture(heights,size,size,T.RGBAFormat,T.FloatType);depthTexture.minFilter=T.LinearFilter;depthTexture.magFilter=T.LinearFilter;
 const uniforms={time:{value:0},terrain:{value:depthTexture},direction:{value:new T.Vector2(1,0)},strength:{value:1},motion:{value:1}};
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms,vertexShader:`
 uniform float time; uniform vec2 direction; uniform float strength; varying vec3 world; varying vec3 waterNormal; varying float crest;
 float height(vec2 p){float d=dot(p,direction);return strength*(.095*sin(d*1.65-time*2.1+.3*sin(p.y*.6))+.04*sin(d*2.8+p.y*.55-time*3.3)+.025*sin(p.x*2.8+p.y*1.7-time*1.2)+.045*sin(p.x*.61-p.y*.35-time*.8));}
 void main(){vec3 p=position;vec2 q=p.xz;p.y+=height(q);float dx=(height(q+vec2(.03,0.))-height(q-vec2(.03,0.)))/.06;float dz=(height(q+vec2(0.,.03))-height(q-vec2(0.,.03)))/.06;waterNormal=normalize(vec3(-dx,1.,-dz));world=p;crest=sin(dot(q,direction)*1.65-time*2.1);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`
 uniform sampler2D terrain;uniform float time;uniform float strength;varying vec3 world;varying vec3 waterNormal;varying float crest;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 uv=(world.xz+vec2(17.,11.))/vec2(34.,22.);vec4 data=texture2D(terrain,uv);float depth=world.y-data.r;if(depth<.01)discard;float shore=data.g;
 vec3 n=normalize(waterNormal);vec3 view=normalize(cameraPosition-world);float fresnel=pow(1.-max(dot(n,view),0.),3.);float shine=pow(max(dot(reflect(-normalize(vec3(-.5,1.,.7)),n),view),0.),95.);
 vec3 deep=vec3(.025,.14,.20),shallow=vec3(.13,.36,.38);vec3 col=mix(shallow,deep,smoothstep(0.,4.,depth));col=mix(col,vec3(.59,.78,.79),fresnel*.38);col+=shine*vec3(.95,.93,.84)*.3;
 float noise=hash(floor(world.xz*22.+vec2(time*.8)));float broken=smoothstep(.38,.94,crest+noise*.22);float foam=broken*(1.-smoothstep(.15,2.1,shore))*.82;foam+=smoothstep(.88,.99,crest)*(1.-smoothstep(.1,1.8,depth))*.45;
 col=mix(col,vec3(.88,.96,.92),clamp(foam,0.,.9));float alpha=mix(.56,.88,smoothstep(0.,3.,depth));gl_FragColor=vec4(col,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const geometry=new T.PlaneGeometry(34,22,200,130);geometry.rotateX(-Math.PI/2);geometry.translate(0,1,0);
 const water=new T.Mesh(geometry,material);water.renderOrder=4;scene.add(water);
 const particles=1200, pos=new Float32Array(particles*3), alpha=new Float32Array(particles);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('opacity',new T.BufferAttribute(alpha,1));
 const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute float opacity;varying float a;void main(){a=opacity;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(90./-p.z,1.5,6.);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float a;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(.90,.96,.96,a*(1.-smoothstep(.15,.5,r)));}`});
 const spray=new T.Points(pg,pm);spray.renderOrder=5;scene.add(spray);let edges:T.Vector2[]=[],playing=true,enabled=true,clock=0,power=1;
 function configure(id:LessonId,step:number) {
  uniforms.direction.value.set(id==='arch'||id==='geo'?0:1,id==='arch'||id==='geo'?-1:0);power=id==='beach'?(step===1||step===2?1.35:.65):.95;uniforms.strength.value=power;edges=[];
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const k=j*size+i,x=-17+i*34/(size-1),z=-11+j*22/(size-1),h=surfaceHeight(id,step,x,z);heights[k*4]=h;distance[k]=h>=1?0:1000}
  const dx=34/(size-1),dz=22/(size-1);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const k=j*size+i;if(i)distance[k]=Math.min(distance[k],distance[k-1]+dx);if(j)distance[k]=Math.min(distance[k],distance[k-size]+dz)}
  for(let j=size-1;j>=0;j--)for(let i=size-1;i>=0;i--){const k=j*size+i;if(i<size-1)distance[k]=Math.min(distance[k],distance[k+1]+dx);if(j<size-1)distance[k]=Math.min(distance[k],distance[k+size]+dz);heights[k*4+1]=distance[k];if(distance[k]>.01&&distance[k]<.25&&heights[k*4]<1){const x=-17+i*dx,z=-11+j*dz;if(Math.abs(x)<15&&Math.abs(z)<9.8)edges.push(new T.Vector2(x,z))}}
  depthTexture.needsUpdate=true;
 }
 function update(dt:number){if(playing)clock+=dt;uniforms.time.value=clock;const dir=uniforms.direction.value;for(let i=0;i<particles;i++){const edge=edges[(i*31)%Math.max(1,edges.length)];if(!edge){alpha[i]=0;continue}const phase=((clock*.48+i*.618)%1+1)%1;const impact=Math.sin(edge.dot(dir)*1.65-clock*2.1);const life=Math.sin(phase*Math.PI);const kick=Math.max(0,impact-.25);pos[i*3]=edge.x+Math.sin(i*17.1)*phase*.8-dir.x*phase*.5;pos[i*3+1]=1+life*(.3+(i%11)*.12)*power;pos[i*3+2]=edge.y+Math.cos(i*11.7)*phase*.6-dir.y*phase*.5;alpha[i]=life*kick*.65}pg.attributes.position.needsUpdate=true;pg.attributes.opacity.needsUpdate=true;water.visible=enabled;spray.visible=enabled}
 return {configure,update,setVisible(v:boolean){enabled=v;water.visible=v;spray.visible=v},pause(v:boolean){playing=!v}};
}
