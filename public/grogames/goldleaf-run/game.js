import {GLTFLoader} from '../strikepoint/assets/gltf-loader.js';
import {rigRunner} from './runner-rig.js';
const T = window.THREE;
const $ = id => document.getElementById(id);
const stage = $('stage'), action = $('action'), panel = $('panel');
let seed = 7351;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const wrap = (v, period) => ((v % period) + period) % period;

async function loadModel(name) {
  const response = await fetch(name + '.mesh');
  if (!response.ok) throw Error('Missing ' + name);
  const buffer = await response.arrayBuffer(), [count, indices] = new Uint32Array(buffer, 0, 2);
  const geometry = new T.BufferGeometry(), offset = 8 + count * 12;
  geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, 8, count * 3), 3));
  geometry.setIndex(new T.BufferAttribute(new Uint16Array(buffer, offset, indices), 1));
  const tail = offset + indices * 2;
  let material;
  if (name === 'runner') {
    // Read through a copy since the packed triangle list can end on a two-byte boundary.
    geometry.setAttribute('uv', new T.BufferAttribute(new Float32Array(buffer.slice(tail)), 2));
    const texture = await new T.TextureLoader().loadAsync('runner.webp');
    texture.flipY = false; texture.colorSpace = T.SRGBColorSpace;
    material = new T.MeshStandardMaterial({map:texture, roughness:.88, side:T.DoubleSide});
  } else {
    const rgb = new Uint8Array(buffer, tail), color = new Float32Array(rgb.length);
    for (let i = 0; i < rgb.length; i++) color[i] = T.ColorManagement.toWorkingColorSpace(new T.Color(rgb[i]/255,0,0), T.SRGBColorSpace).r;
    geometry.setAttribute('color', new T.BufferAttribute(color, 3));
    material = new T.MeshStandardMaterial({vertexColors:true, roughness:.9, side:T.DoubleSide});
  }
  geometry.computeVertexNormals();
  return new T.Mesh(geometry, material);
}
function roadTexture(renderer) {
  const c = document.createElement('canvas'); c.width=1024; c.height=2048;
  const g=c.getContext('2d');
  g.fillStyle='#938766';g.fillRect(0,0,c.width,c.height);
  for(let row=-1;row<17;row++) for(let col=-1;col<5;col++){
    const x=col*256+(row%2)*128, y=row*128, tone=Math.floor(random()*18);
    g.beginPath();g.moveTo(x+9,y+4);g.lineTo(x+239,y+2);g.lineTo(x+253,y+11);
    g.lineTo(x+253,y+113);g.lineTo(x+244,y+125);g.lineTo(x+12,y+126);g.lineTo(x+3,y+118);g.lineTo(x+2,y+14);g.closePath();
    const grad=g.createLinearGradient(x,y,x+80,y+128);grad.addColorStop(0,`rgb(${220+tone},${198+tone},${153+tone})`);grad.addColorStop(1,`rgb(${195+tone},${171+tone},${132+tone})`);
    g.fillStyle=grad;g.fill();g.strokeStyle='#c5b494';g.lineWidth=2;g.stroke();
    if(random()<.22){g.beginPath();g.moveTo(x+3,y+48);g.lineTo(x+26,y+56);g.lineTo(x+44,y+47);g.lineTo(x+57,y+52);g.strokeStyle='#a6987899';g.stroke();}
  }
  for(let i=0;i<110000;i++){g.fillStyle=random()<.5?'#5d503117':'#fff5d21a';g.fillRect(random()*1024,random()*2048,1+random()*4,2);}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapT=T.RepeatWrapping;tex.repeat.y=12;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return tex;
}
async function boot(){
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(59,1,.1,350);
  scene.background=new T.Color(0x8bd3f9);scene.fog=new T.FogExp2(0xc8e1d8,.0083);
  const sky=new T.Mesh(new T.SphereGeometry(300,36,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 p;void main(){float h=normalize(p).y;gl_FragColor=vec4(mix(vec3(.76,.89,.94),vec3(.15,.59,.96),smoothstep(-.08,.63,h)),1.);}' }));
  scene.add(sky,new T.HemisphereLight(0xfff5dd,0xb4c89a,1.9));
  const sun=new T.DirectionalLight(0xffe0a5,2);sun.position.set(-15,23,6);sun.target.position.set(0,0,-12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:22,bottom:-22,near:.5,far:75});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const names=['runner','pine','crate','coin','bridge','hurdle'];
  const models=Object.fromEntries(await Promise.all(names.map(async n=>[n,await loadModel(n)])));
  const boardAsset=(await new GLTFLoader().loadAsync('skateboard.glb')).scene;
  boardAsset.rotation.x=Math.PI/2+.48;
  boardAsset.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(boardAsset),center=bounds.getCenter(new T.Vector3());
  const boardScale=1.15/bounds.getSize(new T.Vector3()).z;
  const boardTemplate=new T.Group();
  boardAsset.position.copy(center).multiplyScalar(-boardScale);boardAsset.scale.setScalar(boardScale);
  boardAsset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  boardTemplate.add(boardAsset);
  const pickup=boardTemplate.clone(true),rideBoard=boardTemplate.clone(true);
  scene.add(pickup,rideBoard);rideBoard.visible=false;
  const timer=document.createElement('div');timer.id='skate-timer';timer.hidden=true;
  timer.innerHTML='<span>SKATEBOARD</span><progress max="12" value="12" aria-label="Skateboard time remaining"></progress>';
  stage.append(timer);
  const box=new T.BoxGeometry(),ball=new T.IcosahedronGeometry(1,1), cone=new T.ConeGeometry(1,1,4);
  const materials=new Map();
  function mat(color){if(!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color,roughness:1,flatShading:true}));return materials.get(color);}
  function item(parent,geo,color,x,y,z,w,h,d,angle=0){
    const mesh=new T.Mesh(geo,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=angle;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function model(parent,key,x,y,z,w,h,d,angle=0){
    const mesh=models[key].clone();mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=angle;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const roadMap=roadTexture(renderer);
  const road=new T.Mesh(new T.PlaneGeometry(8,192),new T.MeshStandardMaterial({map:roadMap}));road.rotation.x=-Math.PI/2;road.position.z=-80;road.receiveShadow=true;scene.add(road);
  item(scene,box,0x8daf4c,6,-.72,-82,27,1.25,202);
  item(scene,box,0x279ccc,-76,-1.42,-70,140,.4,216);
  // Mountain ridges use continuous triangulated silhouettes, with rock above the tree line.
  for(let layer=0;layer<3;layer++){
    const positions=[],colors=[],indices=[],cols=110,rows=12;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const x=(i-cols/2)*3.1,t=j/rows;
      const peak=14+8*Math.sin(i*.23+layer)+5*Math.cos(i*.49+layer*2)+3*Math.sin(i*.97);
      const y=t*(peak+layer*3)+random()*1.6-3;
      positions.push(x,y,-68-layer*21-24*t+2*Math.sin(i*.27)+random());
      const col=new T.Color(y>24?0xd9e2e1:y>17?0x768c98:layer?0x648f97:0x6e9c59);
      col.multiplyScalar(.89+.18*random());colors.push(col.r,col.g,col.b);
      if(i<cols&&j<rows){const a=j*(cols+1)+i;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
    }
    const geo=new T.BufferGeometry();geo.setIndex(indices);geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    scene.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,side:T.DoubleSide})));
  }
  for(let i=0;i<34;i++)item(scene,ball,0xfff9ed,random()*235-118,21+random()*17,-120-random()*22,3+random()*8,1+random()*2,4);
  const period=120,scenery=new T.Group();scene.add(scenery);
  for(let s=0;s<10;s++){
    const z=10-s*12;
    for(const side of [-1,1]){
      for(let k=0;k<3;k++)item(scenery,box,0xa97942,side*4.55,.58,z-k*4,.22,1.55,.26);
      for(const y of [.52,1.06])item(scenery,box,0xb78750,side*4.55,y,z-4,.15,.16,12);
    }
    for(let k=0;k<3;k++){
      const size=1.9+random()*2.3;
      model(scenery,'pine',7+random()*12,size*.9,z-random()*10,size,size,size,random()*6);
      item(scenery,ball,0x839455,5.2+random()*3,.08,z-random()*10,.65,.43,.7);
      item(scenery,ball,0x73bace,-8-random()*55,-1.19,z-random()*10,1.8,.035,.2);
    }
    for(let k=0;k<42;k++){
      const x=(random()<.48?-1:1)*(4.05+random()*2.85), depth=z-random()*12;
      const h=.12+random()*.22;
      item(scenery,cone,k%2?0x749833:0xa0b942,x,h*.31,depth,.09,h,.1,random()*6);
      if(k%4===0)item(scenery,ball,k%8?0xffda54:0xfff4d3,x,h*.8,depth,.055,.045,.055);
    }
    if(s%3===0){
      item(scenery,box,0x785637,4.95,2.35,z,.29,4.75,.31);
      item(scenery,box,0x765137,4.35,4.55,z,1.5,.22,.3);
      item(scenery,box,0x3a4340,3.83,4.08,z,.3,.62,.3);
      item(scenery,box,0xffd57a,3.83,4.08,z,.32,.4,.32);
      item(scenery,box,0xffdbab,16,1.75,z,4,3.5,4);
      item(scenery,cone,0xbe633e,16,4.1,z,3.7,2.8,3.7,Math.PI/4);
      item(scenery,box,0x476463,16,1.75,z+2.01,1,1.3,.05);
    }
    if(s===5)model(scenery,'bridge',-16,-.2,z,11,4,4);
    if(s===4||s===9){
      for(const x of [-4.1,4.1])item(scenery,box,0x775336,x,2.55,z,.33,5.1,.36);
      item(scenery,box,0x875d3d,0,5.05,z,8.9,.3,.38);
      item(scenery,box,0x39779a,0,4.38,z,1.45,1.2,.09);
      item(scenery,cone,0xf6d477,0,4.37,z+.07,.33,.54,.07);
    }
  }
  // Batch repeated scenery with shared geometry/material into single draw calls.
  const groups=new Map();for(const obj of [...scenery.children]){
    const key=obj.geometry.uuid+obj.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(obj);scenery.remove(obj);
  }
  for(const objects of groups.values()){
    const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length*2);
    objects.forEach((obj,i)=>{obj.updateMatrix();batch.setMatrixAt(i,obj.matrix);obj.position.z-=period;obj.updateMatrix();batch.setMatrixAt(i+objects.length,obj.matrix);});batch.castShadow=true;batch.receiveShadow=true;scenery.add(batch);
  }
  const {rider:player,animate:animateRunner}=rigRunner(models.runner);
  player.scale.setScalar(1.17);player.rotation.y=Math.PI;scene.add(player);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'#372a20aa');gradient.addColorStop(1,'#372a2000');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadow=new T.Mesh(new T.PlaneGeometry(1.55,1.3),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;scene.add(shadow);
  const lanes=[-2.35,0,2.35],rows=[];
  for(let i=0;i<10;i++){
    const coins=Array.from({length:3},()=>model(scene,'coin',0,1,0,.39,.39,.23));
    rows.push({coins,crate:model(scene,'crate',0,.76,0,.82,.8,.82),hurdle:model(scene,'hurdle',0,.53,0,1.04,.74,.73)});
  }
  let skateTime=0,boardAt=38,boardLane=1,jumpTime=0,skateJump=false;
  let distance=0,count=0,lives=3,lane=1,px=0,height=0,velocity=0,shield=0,time=0,mode='ready',tick=0;
  function place(row,index){
    row.at=10+index*13.5;row.index=index;row.lane=index===0?1:Math.floor(random()*3);
    row.block=index===0?0:(row.lane+1+Math.floor(random()*2))%3;
    row.obstacle=index%3===1?row.hurdle:row.crate;row.crate.visible=row.hurdle.visible=false;row.obstacle.visible=true;row.hit=false;
    row.coins.forEach(c=>c.visible=true);
  }
  function hud(){ $('coins').textContent=count;$('hearts').textContent='♥'.repeat(lives)+'♡'.repeat(3-lives);$('hearts').setAttribute('aria-label',lives+' lives');$('distance').textContent=Math.floor(distance)+' m';}
  function overlay(title,message,button){$('title').textContent=title;$('message').textContent=message;action.textContent=button;action.disabled=false;panel.hidden=false;$('pause').hidden=true;}
  function reset(){skateTime=jumpTime=0;boardAt=38;boardLane=1;skateJump=false;timer.hidden=true;distance=count=height=velocity=shield=px=tick=0;lives=3;lane=1;rows.forEach(place);hud();}
  function resume(){mode='run';panel.hidden=true;$('pause').hidden=false;$('distance').hidden=false;renderer.domElement.focus();}
  function pause(){if(mode==='run'){mode='paused';overlay('Paused','Your run is waiting.','Resume run');}}
  function finish(){mode='over';window.PlaylootScores?.finish(count);overlay('Trail complete',Math.floor(distance)+' metres · '+count+' coins collected','Run again');}
  function jump(){if(mode==='run'&&height===0){velocity=8.6;jumpTime=0;skateJump=skateTime>0;}}
  function shift(n){if(mode==='run')lane=Math.max(0,Math.min(2,lane+n));}
  action.onclick=()=>{if(mode!=='paused'){reset();window.PlaylootScores?.start();}resume();};
  $('pause').onclick=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp',' ','Escape','p','a','d','w'].includes(e.key)){
      if(e.target===action&&e.key===' ')return;
      e.preventDefault();if(e.repeat)return;
      if(e.key==='Escape'||e.key==='p'){if(mode==='paused')resume();else pause();}
      else if(['a','ArrowLeft'].includes(e.key))shift(-1);else if(['d','ArrowRight'].includes(e.key))shift(1);else jump();
    }
  });
  let touch=null;const canvas=renderer.domElement;canvas.tabIndex=-1;canvas.style.outline='none';
  canvas.onpointerdown=e=>{touch=[e.clientX,e.clientY,e.pointerId];canvas.setPointerCapture(e.pointerId);};
  canvas.onpointercancel=()=>touch=null;
  canvas.onpointerup=e=>{if(!touch||touch[2]!==e.pointerId)return;const dx=e.clientX-touch[0],dy=e.clientY-touch[1];touch=null;if(Math.abs(dx)>21&&Math.abs(dx)>Math.abs(dy))shift(Math.sign(dx));else if(dy<18)jump();};
  function size(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,Math.sqrt(8294400/(w*h)),renderer.capabilities.maxTextureSize/Math.max(w,h)));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?67:56;camera.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage);size();reset();
  overlay('Goldleaf Run',matchMedia('(pointer:coarse)').matches?'Swipe sideways to change lanes. Swipe up or tap to jump.':'Use ← and → to change lanes. Press Space to jump.','Start run');
  let last=performance.now();
  function frame(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(mode==='run'||mode==='ready')time+=dt;
    if(mode==='run'){
      skateTime=Math.max(0,skateTime-dt);
      if(height>0||velocity>0)jumpTime+=dt;
      if(height===0&&velocity===0)skateJump=false;
      const speed=Math.min(19,8+distance*.012)*(skateTime>0||skateJump?1.35:1);distance+=dt*speed;tick+=dt*(1.48+.032*(speed-8));
      px=T.MathUtils.damp(px,lanes[lane],12,dt);height=Math.max(0,height+velocity*dt);velocity=height>0?velocity-21*dt:0;shield=Math.max(0,shield-dt);
    }
    for(const row of rows){
      if(row.at+9<distance)place(row,row.index+rows.length);
      const z=distance-row.at,object=row.obstacle;object.position.x=lanes[row.block];object.position.z=z-5;
      row.coins.forEach((coin,k)=>{
        coin.position.set(lanes[row.lane],1.06+.07*Math.sin(time*3+k),z-k*2.15);
        coin.rotation.y=.35*Math.sin(time*3+k*.2);
        if(mode==='run'&&coin.visible&&Math.abs(coin.position.z)<.79&&Math.abs(px-coin.position.x)<.8&&height<1.45){coin.visible=false;count++;hud();}
      });
      if(mode==='run'&&!row.hit&&Math.abs(object.position.z)<.96&&Math.abs(px-object.position.x)<1.04&&height<(object===row.hurdle?1.03:1.54)){
        row.hit=true;if(!shield){lives--;shield=1.65;hud();if(!lives)finish();}
      }
    }
    if(distance>boardAt+3){boardAt=distance+100;boardLane=Math.floor(random()*3);}
    pickup.visible=skateTime===0&&!skateJump;
    pickup.position.set(lanes[boardLane],.48+.12*Math.sin(time*3),distance-boardAt);
    pickup.rotation.y=.2*Math.sin(time*2);
    if(mode==='run'&&pickup.visible&&Math.abs(distance-boardAt)<1&&Math.abs(px-lanes[boardLane])<.85&&height<.6){
      skateTime=12;boardAt=distance+130;boardLane=Math.floor(random()*3);
    }
    const skating=skateTime>0||skateJump;
    timer.hidden=!skating;timer.querySelector('progress').value=skateTime;
    rideBoard.visible=skating;rideBoard.position.set(px,.13+height,0);
    const jumpProgress=Math.min(1,jumpTime/(2*8.6/21));
    rideBoard.rotation.z=skateJump?Math.PI*2*T.MathUtils.smoothstep(jumpProgress,.08,.92):0;
    const effort=Math.min(1,distance/2.2);
    const lift=animateRunner(tick,Math.min(1,height/.85),effort,skating);
    player.position.set(px,height+(skating?.22:0)+lift*player.scale.y+(skating?0:.026*effort*Math.pow(Math.sin(2*Math.PI*tick),2)),0);
    player.rotation.y=skating?Math.PI/2:Math.PI;
    player.rotation.z=(px-lanes[lane])*.09;
    player.visible=shield<=0||Math.floor(shield*13)%2===0;shadow.position.x=px;shadow.scale.setScalar(1-height*.12);
    roadMap.offset.y=distance/16;scenery.position.z=wrap(distance,period);
    camera.position.set(px*.40,3.05+height*.13,camera.aspect<1?5.4:4.8);
    camera.lookAt(px*.15,1.38,-8);if(mode==='run')$('distance').textContent=Math.floor(distance)+' m';
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);$('message').textContent='The 3D trail could not open. Check WebGL support and reload to try again.';action.textContent='Reload';action.disabled=false;action.onclick=()=>location.reload();});
