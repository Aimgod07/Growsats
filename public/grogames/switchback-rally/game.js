import {advance,cars,ground,makeRace,routes} from './race.js';
import {render} from './scene.js';
const $=id=>document.getElementById(id);
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const panel=$('panel'),footer=document.querySelector('footer'),heading=panel.querySelector('h1');
const keys=new Set(),touches=new Map(),buttons=[...document.querySelectorAll('[data-key]')];
const mappings={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
let mode='garage',state,view,last=0,acc=0,width,height,audio,lastActivity=0;
function controls(){
  const held=new Set([...Array.from(keys,k=>mappings[k]),...touches.values()]);
  return Object.fromEntries(['gas','brake','left','right'].map(k=>[k,held.has(k)]));
}
function clear(){keys.clear();touches.clear();buttons.forEach(b=>b.classList.remove('on'));acc=0;}
function tone(hz,duration){
  if(!audio||audio.state!=='running')return;
  const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=hz;
  gain.gain.setValueAtTime(.048,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
  osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
function reset(){
  state=makeRace(cars[$('vehicle').selectedIndex],routes[$('course').selectedIndex]);
  view={x:state.x,y:state.y};hud();
}
function hud(){
  $('distance').textContent=Math.min(state.route.length,Math.floor(state.x))+' / '+state.route.length+' m';
  $('coins').textContent='● '+state.coins;$('route').textContent=state.route.name;
}
function ui(){
  const driving=mode==='racing',garage=mode==='garage';
  panel.hidden=driving;footer.hidden=!driving;$('pause').hidden=!driving;
  $('choices').hidden=!garage;$('garage').hidden=garage;$('hint').hidden=!garage;
  if(garage){heading.innerHTML='Switchback<br><i>Rally</i>';$('message').textContent='Race the hills. Balance in the air and land on your wheels.';$('start').textContent='Race '+state.route.name+' →';}
  if(mode==='paused'){heading.textContent='Paused';$('message').textContent=state.route.name+' · '+Math.floor(state.x)+' m';$('start').textContent='Resume race';}
}
function start(){
  try{audio??=new AudioContext();audio.resume().catch(()=>{});}catch{/* Audio is optional. */}
  if(mode!=='paused'){reset();window.PlaylootScores?.start();}
  clear();mode='racing';ui();last=performance.now();
}
function pause(){if(mode==='racing'){mode='paused';clear();ui();}}
function end(){
  mode='result';clear();ui();const win=state.status==='finished';
  heading.textContent=win?'Finish line!':'Rolled over';
  $('message').textContent=Math.min(state.route.length,Math.floor(state.x))+' m · '+state.coins+' coins · '+state.elapsed.toFixed(1)+' seconds';
  $('start').textContent='Race again';tone(win?780:150,.3);
  window.PlaylootScores?.finish(Math.min(state.route.length,Math.floor(state.x))+state.coins*25+(win?500:0));
}
$('pause').onclick=pause;$('start').onclick=start;
$('garage').onclick=()=>{mode='garage';clear();reset();ui();};
$('course').onchange=$('vehicle').onchange=()=>{reset();ui();};
for(const b of buttons){
  b.onpointerdown=e=>{if(mode!=='racing')return;e.preventDefault();b.setPointerCapture(e.pointerId);touches.set(e.pointerId,b.dataset.key);b.classList.add('on');};
  b.onlostpointercapture=b.onpointerup=b.onpointercancel=e=>{touches.delete(e.pointerId);if(![...touches.values()].includes(b.dataset.key))b.classList.remove('on');};
}
window.addEventListener('keydown',e=>{
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){if(mode==='paused')start();else pause();}
  if(mode==='racing'&&mappings[e.code]){e.preventDefault();keys.add(e.code);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function resize(){width=canvas.clientWidth;height=canvas.clientHeight;const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);}
function frame(now){
  const delta=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
  if(mode==='racing'){
    acc+=delta;const input=controls(),coins=state.coins;
    while(acc>=1/120&&state.status==='racing'){advance(state,input,1/120);acc-=1/120;}
    if(state.coins>coins)tone(880,.12);
    view.x+=(state.x+state.vx*.12-view.x)*(1-Math.exp(-delta*7));
    view.y+=(ground(state.x+2,state.route)+1.2-view.y)*(1-Math.exp(-delta*4));
    if(Object.values(input).some(Boolean)&&now-lastActivity>4000&&parent!==window){
      parent.postMessage({type:'playloot:activity'},'*');lastActivity=now;
    }
    hud();if(state.status!=='racing')end();
  }
  render(ctx,width,height,state,view,mode==='garage');requestAnimationFrame(frame);
}
reset();ui();resize();window.addEventListener('resize',resize);requestAnimationFrame(frame);
