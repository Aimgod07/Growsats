/* Skyline Sprint — original, offline Three.js city runner. */
import {loadRunnerAssets} from './models.js';
(async()=>{'use strict';const $=id=>document.getElementById(id);if(!window.THREE){document.body.innerHTML='Missing game engine. Keep assets/ beside index.html.';return;}
const scene=new THREE.Scene();scene.background=new THREE.Color('#c0dfec');scene.fog=new THREE.Fog('#c0dfec',45,160);let renderer;try{renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true});}catch{document.body.innerHTML='<div class="error">Enable WebGL in your browser to play.</div>';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const camera=new THREE.PerspectiveCamera(51,1,.1,200);scene.add(new THREE.HemisphereLight('#e2f5ff','#8a8574',2.5));const sun=new THREE.DirectionalLight('#ffe6bc',3.2);sun.position.set(-15,25,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:35,bottom:-25,near:1,far:100});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const V=(x,y,z)=>new THREE.Vector3(x,y,z),M=(c,e={})=>new THREE.MeshStandardMaterial({color:c,roughness:.72,...e});const white=M('#f6edda'),dark=M('#253951'),glass=M('#5093b0',{metalness:.4,roughness:.22}),gold=M('#ffd060',{metalness:.6,roughness:.28}),pink=M('#d96483');
function mesh(g,m,x=0,y=0,z=0,p=scene){let o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function box(w,h,d,m,x,y,z,p){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);}
function rod(a,b,r,m,p=scene){const d=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),m,0,0,0,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
const assets=await loadRunnerAssets();
const ground=box(220,.2,400,M('#b6bfba'),0,-.25,-100);const road=box(9,.12,400,M('#4a5868',{roughness:.95}),0,-.08,-100);const sidewalks=[];for(let s of [-1,1])sidewalks.push(box(4,.22,400,M('#d9cfb7'),s*6.5,-.01,-100));
let seed=80;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
// Recycled city blocks: shop fronts, balconies, roofs, trees and street furniture.
const blocks=[];const colors=['#d8a081','#91b8b6','#e0c28c','#afbad1','#ddadac','#a2b39b'];
for(let i=0;i<14;i++){let g=new THREE.Group();g.position.z=15-i*15;scene.add(g);blocks.push(g);
for(let x of [-1.5,1.5])for(let z of [-5,0,5])box(.10,.018,2.2,M('#f4d58c'),x,.006,z,g);
for(let side of [-1,1]){const x=side*11,h=7+random()*10,paint=M(colors[(i+(side===1?2:0))%colors.length]);box(7,h,13,paint,x,h/2,0,g);box(7.4,.3,13.3,white,x,h,0,g);box(7.1,.22,13.1,white,x,3.5,0,g);
 for(let floor=0;floor<Math.floor((h-4)/2);floor++)for(let z of [-4,0,4]){box(.06,1.25,1.6,white,x-side*3.52,5+floor*2,z,g);box(.07,1.08,1.38,glass,x-side*3.56,5+floor*2,z,g);if(floor%2===0){box(.8,.1,2,white,x-side*3.8,4.4+floor*2,z,g);box(.04,.5,2,dark,x-side*4.15,4.7+floor*2,z,g);}}
 for(let z of [-3.7,1,4.3]){box(.08,2.5,2.3,glass,x-side*3.53,1.6,z,g);const canopy=box(1.25,.16,2.6,i%2?pink:gold,x-side*3.9,3,z,g);canopy.rotation.z=side*.12;}
 // Pavement trees, guards and lamps.
 const tree=assets.prop('pine');tree.position.set(side*6.2,.26,-4);g.add(tree);box(1.7,.32,1.7,M('#b9b2a1'),side*6.2,.1,-4,g);
 rod(V(side*4.9,0,4),V(side*4.9,4.5,4),.06,dark,g);rod(V(side*4.9,4.5,4),V(side*4.1,4.5,4),.05,dark,g);box(.6,.12,.35,gold,side*4.1,4.45,4,g);
 box(.7,.9,.7,M('#478d8b'),side*5.4,.45,0,g);box(1.3,.1,.55,M('#ad825d'),side*6.1,.6,2,g);for(let a of [-.45,.45])box(.08,.6,.45,dark,side*6.1+a,.3,2,g);
}}
const hero=new THREE.Group();scene.add(hero);hero.add(assets.cat);
// Pooled obstacle rows guarantee one clear lane; the other lanes offer jump/slide choices.
const rows=[];const coinGeo=new THREE.CylinderGeometry(.22,.22,.075,20),coinM=M('#ffcc43',{metalness:.6,roughness:.25,emissive:'#b77b13',emissiveIntensity:.15});
function makeRow(i){const g=new THREE.Group();scene.add(g);const cars=Array.from({length:3},(_,lane)=>assets.prop(['van','coupe','pickup'][(i*2+lane+Math.floor(i/3))%3]));cars.forEach(c=>g.add(c));const barriers=[],gates=[],coins=[];for(let lane=0;lane<3;lane++){const b=assets.prop('hurdle');g.add(b);barriers.push(b);let gate=new THREE.Group();for(let x of [-1,1])box(.12,2.5,.15,dark,x,1.25,0,gate);box(2.2,.65,.4,pink,0,1.8,0,gate);box(1.6,.09,.43,white,0,1.8,0,gate);g.add(gate);gates.push(gate);for(let j=0;j<4;j++){const c=mesh(coinGeo,coinM,0,0,0,g);c.rotation.x=Math.PI/2;coins.push({m:c,taken:false,lane,j});}}
const row={g,cars,barriers,gates,coins,s:0,types:[],checked:false};rows.push(row);resetRow(row,35+i*25,i);}
function resetRow(row,s,index){row.s=s;row.g.position.z=-s;row.checked=false;const safe=index%3;row.types=[];for(let lane=0;lane<3;lane++){const type=lane===safe?'clear':['car','barrier','gate'][(index+lane)%3];row.types.push(type);for(const [name,array] of [['car',row.cars],['barrier',row.barriers],['gate',row.gates]]){array[lane].visible=type===name;array[lane].position.set((lane-1)*3,0,0);}}row.coins.forEach(c=>{c.taken=false;c.m.visible=c.lane===safe||row.types[c.lane]==='barrier';c.m.position.set((c.lane-1)*3,c.lane===safe?1:1.9,6+c.j*2);});}
for(let i=0;i<10;i++)makeRow(i);
const particles=[];for(let i=0;i<35;i++){const m=mesh(new THREE.IcosahedronGeometry(.065,0),gold);m.visible=false;particles.push({m,life:0,v:V(0,0,0)});}
let mode='menu';let paused=false;let s=0;let lane=1;let x=0;let height=0;let vy=0;let slide=0;let coins=0;let best=0;let time=0;let last=performance.now();let speed=15;let score=0;let lives=3;let invuln=0;let messageLife=0;let muted=false;let audio;let swipe=null;
try{best=+localStorage.getItem('skyline-best')||0;}catch{}$('best').textContent=best;
function note(f){if(muted||!audio)return;let o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.15);}
function unlock(){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();}catch{}}
function announce(a,b){$('feedback').innerHTML=a+'<small>'+b+'</small>';messageLife=1.3;}
function action(a){if(mode!=='play'||paused)return;if(a==='left')lane=Math.max(0,lane-1);if(a==='right')lane=Math.min(2,lane+1);if(a==='jump'&&height===0&&slide<=0){vy=8.5;note(420);}if(a==='slide'&&height===0)slide=.78;}
function start(){assets.resetPose();PlaylootScores.start();unlock();mode='play';paused=false;s=x=height=vy=slide=coins=score=invuln=0;lane=1;lives=3;speed=15;seed=80;rows.forEach((r,i)=>resetRow(r,35+i*25,i));blocks.forEach((b,i)=>b.position.z=15-i*15);particles.forEach(p=>{p.life=0;p.m.visible=false;});$('menu').classList.add('hidden');$('pause').classList.add('hidden');announce('LET’S GO','FOLLOW THE COINS · WATCH THE TRAFFIC');}
function end(){PlaylootScores.finish(score);mode='over';hero.visible=true;if(score>best){best=score;try{localStorage.setItem('skyline-best',best);}catch{}}$('best').textContent=best;$('menu').innerHTML='<div class="eyebrow">SUNRISE DISTRICT / RUN COMPLETE</div><h1>'+score+' points.<br><em>Go again?</em></h1><p>'+Math.floor(s)+' meters · '+coins+' coins · Best '+best+'<br>Find the open lane. Jump striped barriers and slide under pink gates.</p><button class="play" id="again">ONE MORE RUN ↗</button><div class="small">Three hearts per run · Coins add 10 points each</div>';$('menu').classList.remove('hidden');$('again').onclick=start;note(180);}
function pause(){if(mode!=='play')return;paused=!paused;swipe=null;$('pause').classList.toggle('hidden',!paused);}
$('start').disabled=false;$('start').textContent='LET’S RUN ↗';$('start').onclick=start;$('resume').onclick=pause;$('pauseButton').onclick=pause;$('sound').onclick=()=>{muted=!muted;unlock();$('sound').style.opacity=muted?.4:1;$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');};for(const a of ['left','right','jump','slide'])$(a).onclick=()=>action(a);
window.addEventListener('keydown',e=>{const m={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',Space:'jump',KeyW:'jump',ArrowDown:'slide',KeyS:'slide'};if(m[e.code]){e.preventDefault();if(!e.repeat)action(m[e.code]);}if(e.code==='KeyP'&&!e.repeat)pause();});const canvas=$('game');canvas.addEventListener('pointerdown',e=>{swipe={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!swipe)return;let dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;if(Math.max(Math.abs(dx),Math.abs(dy))>20)action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'slide':'jump');else action('jump');swipe=null;});canvas.addEventListener('pointercancel',()=>swipe=null);window.addEventListener('blur',()=>{if(mode==='play'&&!paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play'&&!paused)pause();});window.addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='skyline:pause'&&!paused)pause();if(e.data?.type==='skyline:resume'&&paused)pause();});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<.75?58:49;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.035);last=now;if(!paused){time+=dt;if(mode==='play'){
 speed=Math.min(26,15+s*.003);s+=speed*dt;x=THREE.MathUtils.damp(x,(lane-1)*3,15,dt);slide=Math.max(0,slide-dt);invuln=Math.max(0,invuln-dt);if(vy!==0||height>0){vy-=22*dt;height=Math.max(0,height+vy*dt);if(height===0)vy=0;}
 for(const r of rows){
 for(const c of r.coins){if(c.m.visible&&!c.taken&&Math.abs(s-(r.s-c.m.position.z))<.65&&Math.abs(x-c.m.position.x)<.8&&Math.abs(height+1-c.m.position.y)<1){c.taken=true;c.m.visible=false;coins++;note(700+(coins%4)*100);for(let i=0;i<3;i++){let p=particles.find(p=>p.life<=0);if(p){p.life=.4;p.m.visible=true;p.m.position.set(x,height+1,-s);p.v.set((random()-.5)*3,random()*3,(random()-.5)*3);}}}c.m.rotation.z=time*3;}
 if(!r.checked&&s>=r.s-1.5){r.checked=true;const hitLane=Math.round(x/3)+1,type=r.types[THREE.MathUtils.clamp(hitLane,0,2)];const hit=(type==='car'||type==='barrier'&&height<.95||type==='gate'&&slide<=0);if(hit&&invuln<=0){lives--;invuln=1.4;announce(lives?'OUCH!':'RUN COMPLETE',lives?lives+' HEARTS LEFT':'NICE RUN');note(120);if(lives===0){score=Math.floor(s)+coins*10;end();break;}}}
 if(s-r.s>16){const next=Math.max(...rows.map(a=>a.s))+25;resetRow(r,next,Math.round((next-35)/25));}
 }
 score=Math.floor(s)+coins*10;$('score').textContent=score;$('instructions').innerHTML='♥'.repeat(lives)+' &nbsp; / &nbsp; '+coins+' COINS<br>'+Math.floor(s)+' METERS · SUNRISE DISTRICT';
 }
 for(const b of blocks)if(b.position.z>-s+30)b.position.z-=210;
 for(const p of particles)if(p.life>0){p.life-=dt;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(Math.max(0,p.life/.4));if(p.life<=0)p.m.visible=false;}
 if(messageLife>0){messageLife-=dt;if(messageLife<=0)$('feedback').innerHTML='';}
 }
 hero.position.set(x,height,-s);hero.visible=invuln<=0||Math.sin(time*35)>-.2;if(!paused){
   assets.pose(mode!=='play'?'ready':height>0?'jump':slide>0?'crouch':'run',dt,speed);
   hero.rotation.z=-(lane*3-3-x)*.06;
 }
 ground.position.z=road.position.z=-s-100;sidewalks.forEach(a=>a.position.z=-s-100);camera.position.set(x*.13,5.2,-s+8.8);camera.lookAt(x*.08,1,-s-13);sun.position.set(-15,25,-s+12);sun.target.position.set(0,0,-s-10);$('progress').style.width=(s%500)/5+'%';renderer.render(scene,camera);
}
requestAnimationFrame(frame);
})().catch(error=>{
 console.error('Skyline Sprint asset loading failed',error);
 const button=document.getElementById('start');button.disabled=false;button.textContent='Reload game';button.onclick=()=>location.reload();
 document.querySelector('#menu p').textContent='The city models could not load. Reload to try again.';
});
