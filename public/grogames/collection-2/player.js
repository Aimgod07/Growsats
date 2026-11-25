/* Shared portrait shell. Scores are proposals; the server owns sessions and rewards. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), meta=GroCollection.find(g=>g.id===document.body.dataset.game), canvas=$('game'), c=canvas.getContext('2d',{alpha:false});
 const params=new URLSearchParams(location.search); let origin=location.origin;
 try { const candidate=new URL(params.get('parentOrigin')||document.referrer||location.href); if(['https:','http:'].includes(candidate.protocol))origin=candidate.origin; } catch {}
 const emit=(type,data={})=>{if(parent!==window)parent.postMessage({type,gameId:meta.id,...data},origin);};
 let best=0;let game;let state='intro';let score=0;let time=0;let last=0;let particles=[];let toastUntil=0;let audio;let sound=false;let lastActivity=0;(false);
 try{best=Number(localStorage.getItem('gro-best:'+meta.id))||0;}catch{}
 const accent=`hsl(${meta.hue} 90% 68%)`,secondary=`hsl(${(meta.hue+60)%360} 85% 70%)`;
 // Cache the atmospheric artwork once; animation only redraws moving objects.
 const backdrop=document.createElement('canvas');backdrop.width=400;backdrop.height=600;
 const bc=backdrop.getContext('2d'),wash=bc.createLinearGradient(0,0,400,600);
 wash.addColorStop(0,`hsl(${meta.hue} 40% 17%)`);wash.addColorStop(1,'#070d1b');bc.fillStyle=wash;bc.fillRect(0,0,400,600);
 const halo=bc.createRadialGradient(310,125,5,310,125,180);halo.addColorStop(0,`hsla(${meta.hue} 85% 70% / .17)`);halo.addColorStop(1,'#0000');bc.fillStyle=halo;bc.fillRect(0,0,400,340);
 if(['dodge','shooter','lander','orbit','catch'].includes(meta.mode)){
  bc.fillStyle=`hsl(${meta.hue} 28% 25%)`;bc.beginPath();bc.arc(320,125,47,0,Math.PI*2);bc.fill();bc.strokeStyle='#ffffff12';bc.lineWidth=9;bc.beginPath();bc.ellipse(320,125,76,15,-.35,0,Math.PI*2);bc.stroke();
 }else if(['jump','slalom','stack'].includes(meta.mode)){
  for(let layer=0;layer<2;layer++)for(let i=0;i<12;i++){const h=35+(i*73+layer*47)%170,x=i*39-layer*15;bc.fillStyle=layer?'#142238':'#1e2c44';bc.fillRect(x,600-h,33,h);bc.fillStyle='#7bcaff18';for(let j=0;j<h/17-1;j++)bc.fillRect(x+7,610-h+j*17,4,5);}
 }else if(['flap','hopper','balance'].includes(meta.mode)){
  for(let layer=0;layer<3;layer++){bc.fillStyle=`hsla(${meta.hue} 35% ${18+layer*4}% / .5)`;bc.beginPath();bc.moveTo(0,600);for(let i=0;i<7;i++)bc.lineTo(i*75,450+layer*35-Math.sin(i*2+layer)*70);bc.lineTo(400,600);bc.fill();}
 }
 document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--secondary',secondary);
 $('cover').src=$('art').src=meta.cover;$('hint').textContent=meta.help;$('best').textContent=best;
 function tone(f=500){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.13);}catch{}}
 function modal(title,text,button){$('heading').textContent=title;$('description').textContent=text;$('play').textContent=button;$('restart').hidden=state!=='paused';if(!$('dialog').open)$('dialog').showModal();}
 const api={
  rand:(a,b)=>a+Math.random()*(b-a),int:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),accent,secondary,
  add(n,x=200,y=280){score+=n;for(let i=0;i<10&&particles.length<80;i++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:-Math.random()*180,t:.7});tone();},
  end(win=true){if(state!=='playing')return;state='result';best=Math.max(best,score);try{localStorage.setItem('gro-best:'+meta.id,String(best));}catch{}$('best').textContent=best;PlaylootScores.finish(score);$('eyebrow').textContent=win?'CHALLENGE COMPLETE':'KEEP YOUR STREAK ALIVE';modal(win?'Beautifully played.':'One more run?',`${score.toLocaleString()} points · Best ${best.toLocaleString()}. Score recorded automatically. Every completed replay is recorded.`,'Play again →');},
  hint(text){$('toast').textContent=text;toastUntil=time+2;},get time(){return time;},get score(){return score;}
 };
 function start(){PlaylootScores.start();score=0;time=0;lastActivity=0;particles=[];$('toast').textContent='';game=GroFactories[meta.mode](api);state='playing';$('dialog').close();canvas.focus();last=performance.now();emit('playloot:activity');}
 function pause(){if(state!=='playing')return;state='paused';game.up?.();modal('Take a breather.',meta.help,'Resume →');}
 $('play').onclick=()=>{if(state==='paused'){state='playing';last=performance.now();$('dialog').close();canvas.focus();}else start();};$('restart').onclick=start;$('pause').onclick=pause;
 $('dialog').addEventListener('cancel',e=>e.preventDefault());
 $('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ On':'♪ Off';$('sound').ariaLabel=sound?'Disable sound':'Enable sound';tone();};
 function point(e){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/400,r.height/600);return [(e.clientX-r.left-(r.width-400*scale)/2)/scale,(e.clientY-r.top-(r.height-600*scale)/2)/scale];}
 function activity(){if(time-lastActivity>10||lastActivity===0){emit('playloot:activity');lastActivity=time;}}
 canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;canvas.setPointerCapture(e.pointerId);activity();game.down?.(...point(e));});
 canvas.addEventListener('pointermove',e=>{if(state==='playing')game.move?.(...point(e));});
 canvas.addEventListener('pointerup',e=>{if(state==='playing')game.up?.(...point(e));});canvas.addEventListener('pointercancel',()=>game.up?.());
 addEventListener('keydown',e=>{if(e.key==='Escape'||e.key.toLowerCase()==='p'){pause();return;}if(state!=='playing')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();activity();game.key?.(e.key);});
 addEventListener('keyup',()=>game.up?.());document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 function resize(){const d=Math.min(devicePixelRatio||1,1.5);canvas.width=400*d;canvas.height=600*d;c.setTransform(d,0,0,d,0,0);}addEventListener('resize',resize);resize();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;if(state==='playing'){time+=dt;game.update?.(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.t-=dt;}particles=particles.filter(p=>p.t>0);if(time>toastUntil)$('toast').textContent='';}
 c.drawImage(backdrop,0,0);c.fillStyle='#a5c9ff25';for(let i=0;i<35;i++){c.beginPath();c.arc((i*137)%400,(i*83+time*(i%3+1)*2)%600,1,0,Math.PI*2);c.fill();}game?.draw(c);for(const p of particles){c.globalAlpha=Math.max(0,p.t);c.fillStyle=accent;c.fillRect(p.x,p.y,4,4);}c.globalAlpha=1;if($('score').textContent!==String(score))$('score').textContent=score;const clock=Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0');if($('meter').textContent!==clock)$('meter').textContent=clock;}
 game=GroFactories[meta.mode](api);modal(meta.title,meta.help,'Play now →');requestAnimationFrame(frame);
})();
