/* Shared sound effects for games without a native audio system. */
(()=>{
 'use strict';
 let context,enabled=true,last=0,active=false;
 try{enabled=localStorage.getItem('playloot-effects')!=='off';}catch{}
 function tone(frequency=440,duration=.09,end=frequency){
  if(!enabled||document.hidden)return;
  try{
   context??=new(window.AudioContext||window.webkitAudioContext)();
   if(context.state==='suspended')context.resume();
   const now=context.currentTime;
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,now);
   oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,end),now+duration);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   oscillator.connect(gain).connect(context.destination);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
   oscillator.start(now);oscillator.stop(now+duration+.01);
  }catch{}
 }
 function play(kind){
  if(kind==='score'){tone(660,.13,990);return;}
  if(kind==='finish'){tone(523,.3,1046);return;}
  if(kind==='hit'){tone(145,.18,45);return;}
  tone(kind==='action'?350:520,.07,kind==='action'?550:390);
 }
 window.PlaylootAudio={play};
 function setup(){
  const native=document.currentScript?.dataset.native==='true'||document.documentElement.dataset.nativeAudio==='true';
  if(native){
   // Native games own their effects and mute button.
   const unlock=event=>{
    if(event.target.closest?.('#sound,#soundBtn,[data-sound]'))return;
    const button=document.querySelector('#sound,#soundBtn');
    if(!button)return;
    const label=(button.getAttribute('aria-label')||button.textContent||'').toLowerCase();
    if(/enable sound|turn sound on|unmute|sound off|♪ off/.test(label))button.click();
   };
   document.addEventListener('pointerdown',unlock,{once:true});
   document.addEventListener('keydown',unlock,{once:true});
   return;
  }
  const button=document.createElement('button');
  button.type='button';button.id='playloot-sound';
  button.style.cssText='position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:10000;border:1px solid #ffffff60;border-radius:22px;padding:9px 13px;background:#142634e8;color:white;font:600 12px system-ui;cursor:pointer';
  function label(){button.textContent=enabled?'Sound on':'Sound off';button.setAttribute('aria-label',enabled?'Mute sound':'Enable sound');button.setAttribute('aria-pressed',String(enabled));}
  label();button.onclick=()=>{enabled=!enabled;try{localStorage.setItem('playloot-effects',enabled?'on':'off');}catch{}label();if(enabled)play('click');};
  document.body.append(button);
  function input(event){
   if(event.target.closest?.('#playloot-sound,input,select,textarea'))return;
   if(event.type==='keydown'&&(event.repeat||!['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','KeyW','KeyA','KeyS','KeyD'].includes(event.code)))return;
   if(performance.now()-last<65)return;last=performance.now();active=true;
   play(event.target.closest?.('button,a,[role=button]')?'click':'action');
  }
  document.addEventListener('pointerdown',input);document.addEventListener('keydown',input);
  const previous=new WeakMap();
  new MutationObserver(records=>{
   if(!active)return;
   for(const record of records){
    const element=(record.target.nodeType===1?record.target:record.target.parentElement)?.closest?.('#score,#coins,[data-score],#hearts');
    if(!element)continue;
    const value=element.textContent.trim(),old=previous.get(element);previous.set(element,value);
    if(old===value)continue;
    if(element.id==='hearts'){if(old&&value.split('♥').length<old.split('♥').length)play('hit');}
    else if(Number(value)>Number(old||0))play('score');
   }
  }).observe(document.body,{subtree:true,childList:true,characterData:true});
  const scores=window.PlaylootScores;
  if(scores){const finish=scores.finish;scores.finish=score=>{if(active)play('finish');return finish(score);};}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)context?.suspend();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
