import {GLTFLoader} from '../strikepoint/assets/gltf-loader.js';

const T=window.THREE;
const $=id=>document.getElementById(id);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});}
catch(error){$('description').textContent='3D graphics are unavailable. Enable hardware acceleration and reload.';$('start').textContent='3D graphics unavailable';throw error;}
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
const scene=new T.Scene();
scene.background=new T.Color('#88c9e9');
scene.fog=new T.Fog('#cda985',100,290);
const camera=new T.PerspectiveCamera(58,1,.1,500);
scene.add(new T.HemisphereLight('#fff4d9','#9b6243',2.4));
const sun=new T.DirectionalLight('#fff0ca',3);
sun.position.set(-35,70,30);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:180});
sun.shadow.normalBias=.03;
scene.add(sun,sun.target);

const vehicleSpecs={
 coupe:{name:'Coupe',speed:19,acceleration:8,steering:.63},
 pickup:{name:'Pickup',speed:16,acceleration:7,steering:.59},
 van:{name:'Van',speed:13,acceleration:5.7,steering:.53}
};
const roadWidth=6.4;
const route=new T.CatmullRomCurve3([
 [0,34,0],[0,34,-35],[12,36,-75],[43,38,-100],[72,38,-125],
 [75,42,-165],[45,44,-193],[5,42,-202],[-30,40,-228],
 [-31,43,-270],[3,47,-300],[42,47,-322],[52,45,-363],
 [23,44,-391],[-15,46,-405],[-30,49,-444],[-7,49,-480]
].map(p=>new T.Vector3(...p)),false,'catmullrom',.35);
const trackLength=route.getLength();
const samples=Array.from({length:701},(_,i)=>route.getPointAt(i/700));
const tangentAt=t=>route.getTangentAt(T.MathUtils.clamp(t,0,1)).normalize();
let seed=783;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.94,...extra});
const rockMaterials=['#ad6040','#be7450','#d18b5d','#a7593a'].map(c=>material(c));
const wood=material('#785236');
const beamGeometry=new T.CylinderGeometry(1,1,1,6);
const rockGeometry=new T.CylinderGeometry(.91,1,1,7,1);
function mesh(geometry,mat,parent=scene){
 const object=new T.Mesh(geometry,mat);
 object.castShadow=object.receiveShadow=true;
 parent.add(object);
 return object;
}
function beam(a,b,radius=.12){
 const delta=b.clone().sub(a);
 const object=mesh(beamGeometry,wood);
 object.scale.set(radius,delta.length(),radius);
 object.position.copy(a).add(b).multiplyScalar(.5);
 object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
 return object;
}

// Continuous road surface follows the same samples used for wheel contact.
const roadCanvas=document.createElement('canvas');
roadCanvas.width=roadCanvas.height=512;
const paint=roadCanvas.getContext('2d');
paint.fillStyle='#d3aa69';paint.fillRect(0,0,512,512);
for(let i=0;i<18000;i++){
 paint.fillStyle=i%2?'#6e50221c':'#fff3c523';
 paint.fillRect(random()*512,random()*512,1+random()*3,1+random()*3);
}
const roadTexture=new T.CanvasTexture(roadCanvas);
roadTexture.wrapS=roadTexture.wrapT=T.RepeatWrapping;
roadTexture.colorSpace=T.SRGBColorSpace;
roadTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const positions=[],uvs=[],indices=[];
for(let i=0;i<samples.length;i++){
 const p=samples[i],tangent=tangentAt(i/700);
 const right=new T.Vector3(-tangent.z,0,tangent.x).normalize();
 for(const side of [-1,1]){
  const v=p.clone().addScaledVector(right,side*roadWidth/2);
  positions.push(v.x,v.y,v.z);uvs.push((side+1)/2,i/700*trackLength/7);
 }
 if(i<700){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
}
const roadGeometry=new T.BufferGeometry();
roadGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
roadGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
roadGeometry.setIndex(indices);roadGeometry.computeVertexNormals();
mesh(roadGeometry,material('#fff0bd',{map:roadTexture,side:T.DoubleSide}));
const floor=mesh(new T.PlaneGeometry(1100,1300),material('#a76b44'));
floor.rotation.x=-Math.PI/2;floor.position.set(0,-12,-240);floor.castShadow=false;
for(let i=0;i<90;i++){
 const x=(random()<.5?-1:1)*(30+random()*160),z=40-random()*600;
 const height=18+random()*50,width=10+random()*25;
 if(samples.some(p=>(p.x-x)**2+(p.z-z)**2<(width+9)**2))continue;
 const tower=new T.Group();tower.position.set(x,-12,z);scene.add(tower);
 for(let layer=0;layer<5;layer++){
  const radius=width*(1-layer*.10);
  const rock=mesh(rockGeometry,rockMaterials[(i+layer)%4],tower);
  rock.scale.set(radius,height/5,radius);rock.position.y=height*(layer+.5)/5;rock.rotation.y=(i%4)*.3;
 }
}
for(let i=0;i<samples.length;i+=18){
 const p=samples[i],tangent=tangentAt(i/700),right=new T.Vector3(-tangent.z,0,tangent.x).normalize();
 for(const sign of [-1,1]){
  const edge=p.clone().addScaledVector(right,sign*(roadWidth/2+.18));
  beam(edge.clone().add(new T.Vector3(0,-1.1,0)),edge.clone().add(new T.Vector3(0,.55,0)),.11);
  if(i%36===0)beam(edge.clone().add(new T.Vector3(0,-1,0)),edge.clone().add(new T.Vector3(0,-14,0)),.14);
 }
 if(i%36===0)beam(p.clone().addScaledVector(right,-3.8).add(new T.Vector3(0,-.85,0)),p.clone().addScaledVector(right,3.8).add(new T.Vector3(0,-.85,0)),.2);
}
// Shared geometry lets the static canyon and timber supports render in batches.
scene.updateMatrixWorld(true);
const staticGroups=new Map();
scene.traverse(object=>{
 if(!object.isMesh)return;
 const key=object.geometry.uuid+object.material.uuid;
 if(!staticGroups.has(key))staticGroups.set(key,[]);
 staticGroups.get(key).push(object);
});
for(const objects of staticGroups.values()){
 if(objects.length<2)continue;
 const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);
 objects.forEach((object,i)=>{batch.setMatrixAt(i,object.matrixWorld);object.removeFromParent();});
 batch.castShadow=batch.receiveShadow=true;scene.add(batch);
}
const coinMaterial=material('#ffce32',{metalness:.55,roughness:.25,emissive:'#a36908',emissiveIntensity:.18});
const coins=[];
for(let i=1;i<=36;i++){
 const at=i/38;
 const object=mesh(new T.CylinderGeometry(.37,.37,.095,24),coinMaterial);
 object.rotation.x=Math.PI/2;
 const p=route.getPointAt(at);object.position.copy(p).y+=1.1;
 coins.push({object,at,taken:false});
}
const checkpointAt=[.20,.43,.67,.88];
const gates=[];
for(const [i,at] of [...checkpointAt, .995].entries()){
 const p=route.getPointAt(at),t=tangentAt(at),right=new T.Vector3(-t.z,0,t.x).normalize();
 const left=p.clone().addScaledVector(right,-3.3),r=p.clone().addScaledVector(right,3.3);
 beam(left,left.clone().add(new T.Vector3(0,4.5,0)),.16);
 beam(r,r.clone().add(new T.Vector3(0,4.5,0)),.16);
 beam(left.clone().add(new T.Vector3(0,4.5,0)),r.clone().add(new T.Vector3(0,4.5,0)),.13);
 const banner=mesh(new T.BoxGeometry(5.4,.55,.09),material(i===4?'#1a6654':'#f0b536'));
 banner.position.copy(p).y+=4.1;banner.rotation.y=Math.atan2(right.z,right.x)*-1;
 gates.push({at,banner});
}

const keys=new Set(),held=new Map(),cars=new Map();
let selected='pickup',car,mode='garage',speed=0,yaw=0,steering=0;
let remaining=180,collected=0,checkpoint=0,respawnAt=0,fallSpeed=0,falling=false;
let noticeTime=0,engine,audio,muted=false,engineGain;
const position=new T.Vector3();
function tone(frequency,end,duration=.15){
 if(muted||!audio)return;
 const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 oscillator.frequency.setValueAtTime(frequency,now);
 oscillator.frequency.exponentialRampToValueAtTime(end,now+duration);
 gain.gain.setValueAtTime(.05,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
 oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(now+duration);
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
function unlockAudio(){
 try{
  audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  if(!engine){
   engine=audio.createOscillator();engine.type='triangle';engineGain=audio.createGain();
   engineGain.gain.value=0;engine.connect(engineGain).connect(audio.destination);engine.start();
  }
 }catch{ /* The game remains playable when device audio is unavailable. */ }
}
function notify(text){$('notice').textContent=text;noticeTime=2.4;}
function clearInput(){keys.clear();held.clear();}
function placeCar(at){
 position.copy(route.getPointAt(at));position.y+=.04;
 const t=tangentAt(at);yaw=Math.atan2(-t.x,-t.z);
 speed=steering=fallSpeed=0;falling=false;
}
function choose(name){
 if(!cars.has(name)||mode!=='garage')return;
 selected=name;if(car)scene.remove(car);car=cars.get(name);scene.add(car);
 document.querySelectorAll('[data-car]').forEach(b=>b.classList.toggle('selected',b.dataset.car===name));
 placeCar(.012);
}
function updateHud(){
 $('coins').textContent=collected;
 $('checkpoint').textContent=checkpoint+' / 4';
 const seconds=Math.max(0,Math.ceil(remaining));
 $('time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 $('speed').innerHTML=Math.round(Math.abs(speed)*3.6)+' <small>KM/H</small>';
}
function start(){
 if(!car)return;
 unlockAudio();clearInput();placeCar(.012);camera.position.copy(position).add(new T.Vector3(Math.sin(yaw)*8.5,4.4,Math.cos(yaw)*8.5));collected=checkpoint=respawnAt=0;remaining=180;
 coins.forEach(c=>{c.taken=false;c.object.visible=true;});
 gates.forEach((g,i)=>g.banner.material.color.set(i===4?'#1a6654':'#f0b536'));
 mode='drive';$('menu').hidden=$('result').hidden=$('paused').hidden=true;
 $('hud').hidden=$('controls').hidden=$('speed').hidden=$('pause').hidden=false;
 window.PlaylootScores?.start();notify('Follow the gold. Stay on the trail.');updateHud();
}
function finish(won){
 mode='result';speed=0;clearInput();
 const score=collected*25+checkpoint*200+(won?Math.ceil(remaining)*5:0);
 window.PlaylootScores?.finish(score);
 $('result-label').textContent=won?'TRAIL COMPLETE':'TIME IS UP';
 $('result-title').textContent=won?'Canyon conquered.':'One more drive?';
 $('result-info').textContent=score+' points · '+collected+' coins · '+vehicleSpecs[selected].name;
 $('result').hidden=false;$('controls').hidden=$('pause').hidden=true;
 tone(won?550:180,won?880:65,.4);
}
function pause(){if(mode!=='drive')return;mode='paused';clearInput();$('paused').hidden=false;}
function garage(){
 mode='garage';clearInput();speed=0;$('paused').hidden=$('result').hidden=true;
 $('menu').hidden=false;$('hud').hidden=$('controls').hidden=$('speed').hidden=$('pause').hidden=true;
 placeCar(.012);
}
$('start').onclick=$('again').onclick=$('restart').onclick=start;
$('garage').onclick=$('exit').onclick=garage;
$('pause').onclick=pause;
$('resume').onclick=()=>{mode='drive';$('paused').hidden=true;unlockAudio();};
$('sound').onclick=()=>{unlockAudio();muted=!muted;$('sound').textContent=muted?'♩':'♪';$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');};
document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>choose(b.dataset.car));
const controls={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
window.addEventListener('keydown',e=>{
 if(controls[e.code]){e.preventDefault();keys.add(controls[e.code]);}
 if(e.code==='Escape'||e.code==='KeyP'){if(mode==='drive')pause();else if(mode==='paused')$('resume').click();}
});
window.addEventListener('keyup',e=>keys.delete(controls[e.code]));
window.addEventListener('blur',()=>{clearInput();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
document.querySelectorAll('[data-control]').forEach(button=>{
 button.onpointerdown=e=>{e.preventDefault();held.set(e.pointerId,button.dataset.control);button.setPointerCapture(e.pointerId);unlockAudio();};
 const release=e=>held.delete(e.pointerId);
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=release;
});
const pressed=key=>keys.has(key)||[...held.values()].includes(key);
function nearestTrack(){
 let best=Infinity,index=0;
 for(let i=0;i<samples.length;i++){
  const p=samples[i],distance=(p.x-position.x)**2+(p.z-position.z)**2;
  if(distance<best){best=distance;index=i;}
 }
 return {at:index/700,distance:Math.sqrt(best),point:samples[index]};
}
function drive(dt){
 remaining=Math.max(0,remaining-dt);
 if(remaining===0){finish(false);return;}
 if(falling){
  fallSpeed+=dt*14;position.y-=fallSpeed*dt;
  if(position.y<route.getPointAt(respawnAt).y-8){placeCar(respawnAt);remaining=Math.max(0,remaining-6);notify('Back at checkpoint · 6 second penalty');}
  return;
 }
 const spec=vehicleSpecs[selected];
 if(pressed('brake'))speed=Math.max(-4,speed-12*dt);
 else if(pressed('gas'))speed=Math.min(spec.speed,speed+spec.acceleration*dt);
 else speed=T.MathUtils.damp(speed,0,.65,dt);
 const input=Number(pressed('left'))-Number(pressed('right'));
 steering=T.MathUtils.damp(steering,input,8,dt);
 yaw+=steering*spec.steering*T.MathUtils.clamp(speed/6,-.65,1)*dt;
 position.x-=Math.sin(yaw)*speed*dt;position.z-=Math.cos(yaw)*speed*dt;
 const near=nearestTrack();
 if(near.distance>roadWidth/2+.12){falling=true;fallSpeed=.5;tone(160,50,.2);notify('Off the trail!');return;}
 position.y=near.point.y+.04;
 for(const coin of coins){
  if(!coin.taken&&coin.object.position.distanceTo(position.clone().add(new T.Vector3(0,.8,0)))<1.5){coin.taken=true;coin.object.visible=false;collected++;tone(720,1100,.11);}
 }
 if(checkpoint<4&&near.at>=checkpointAt[checkpoint]&&near.at<checkpointAt[checkpoint]+.03){
  respawnAt=checkpointAt[checkpoint]+.008;gates[checkpoint].banner.material.color.set('#58ba88');checkpoint++;remaining+=15;
  notify('Checkpoint '+checkpoint+' · +15 seconds');tone(430,860,.25);
 }
 if(near.at>.992&&checkpoint===4)finish(true);
}
function resize(){
 const w=window.innerWidth,h=window.innerHeight;
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.fov=w<h?66:58;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
let last=performance.now(),lastActivity=0;
function frame(now){
 const dt=Math.min(.04,(now-last)/1000);last=now;
 if(mode==='drive'){
  drive(dt);
  if((keys.size||held.size)&&now-lastActivity>4000){lastActivity=now;if(parent!==window)parent.postMessage({type:'playloot:activity'},location.origin);}
 }
 if(car){
  car.position.copy(position);car.rotation.set(falling?Math.min(.4,fallSpeed*.03):0,yaw,-steering*Math.abs(speed)*.0015);
  const back=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const desired=position.clone().addScaledVector(back,mode==='garage'?8:8.5);
  desired.y+=mode==='garage'?4.2:4.4;
  if(mode==='garage')desired.add(new T.Vector3(5.5,0,0));
  camera.position.lerp(desired,1-Math.exp(-dt*6));
  camera.lookAt(position.x-Math.sin(yaw)*3,position.y+1.15,position.z-Math.cos(yaw)*3);
  sun.position.copy(position).add(new T.Vector3(-35,70,30));sun.target.position.copy(position);
 }
 coins.forEach(c=>{c.object.rotation.z+=dt;});
 if(noticeTime>0&&mode==='drive'){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
 if(audio&&engineGain){engine.frequency.setTargetAtTime(45+Math.abs(speed)*7,audio.currentTime,.06);engineGain.gain.setTargetAtTime(mode==='drive'&&!muted?.018:0,audio.currentTime,.08);}
 if(mode==='drive')updateHud();
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
async function boot(){
 const loader=new GLTFLoader();
 const loaded=await Promise.all(Object.keys(vehicleSpecs).map(async name=>[name,await loader.loadAsync(new URL('../skyline-sprint/assets/'+name+'.glb',import.meta.url).href)]));
 for(const [name,{scene:model}] of loaded){
  model.rotation.y=-Math.PI/2;
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
  const scale=Math.min(1.9/size.x,2.1/size.y,3.9/size.z),center=bounds.getCenter(new T.Vector3());
  model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  const root=new T.Group();root.add(model);cars.set(name,root);
 }
 choose(selected);camera.position.copy(position).add(new T.Vector3(5,4,8));
 $('start').textContent='Start your engine';$('start').disabled=false;
}
boot().catch(error=>{console.error(error);$('description').textContent='The vehicles could not load. Reload to try again.';$('start').textContent='Reload';$('start').disabled=false;$('start').onclick=()=>location.reload();});
