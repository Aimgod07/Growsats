(()=>{
  document.documentElement.dataset.uiPolished='true';
  const interactive='button,.primary,.secondary,.play,[role="button"]';
  document.addEventListener('pointerdown',event=>event.target.closest(interactive)?.classList.add('ui-pressed'));
  for(const type of ['pointerup','pointercancel','pointerleave']) document.addEventListener(type,event=>event.target.closest(interactive)?.classList.remove('ui-pressed'));
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches(interactive))event.target.classList.add('ui-pressed')});
  document.addEventListener('keyup',event=>event.target.closest?.(interactive)?.classList.remove('ui-pressed'));
})();

(()=>{
 const parts=location.pathname.split('/').filter(Boolean);
 const last=parts.at(-1)||'';
 const slug=last.endsWith('.html')&&last!=='index.html'?last.slice(0,-5):last==='index.html'?parts.at(-2):last;
 let hash=0;for(const char of slug||document.title)hash=(hash*31+char.charCodeAt(0))>>>0;
 // Individually art-directed palettes: panel hue, action hue, corners,
 // saturation and panel brightness. Avoid one blue template for every game.
 const palettes={
 'saltwake':[184,35,18,38,25], 'cloud-skipper':[201,48,28,75,39],
 'courtside':[24,192,12,65,32], 'featherfall':[94,39,25,48,28],
 'first-touch':[145,48,14,50,26], 'fruit-frenzy':[4,86,28,73,36],
 'groove-grove':[286,168,22,68,34], 'neon-rage':[326,185,6,80,25],
 'skyline-sprint':[232,23,10,62,32], 'strikepoint':[166,43,6,25,22],
 'tidal-rush':[218,165,22,80,37], 'turbo-avenue':[355,51,8,70,30],
 'moon-rider':[258,55,18,42,32], 'sky-courier':[37,195,20,56,31],
 'orbit-guard':[209,14,8,46,22], 'meteor-drift':[14,178,12,62,28],
 'pulse-paddle':[305,180,24,72,29], 'archery-3d':[75,36,16,37,26],
 'ice-curl':[178,263,26,58,38]
 };
 const theme=palettes[slug]||[hash%360,(hash*137+65)%360,10+hash%19,40+hash%36,24+hash%14];
 const root=document.documentElement;root.dataset.gameTheme=slug==='strikepoint'?'tactical':slug;
 ['--game-hue','--game-accent','--game-radius','--game-saturation','--game-lightness'].forEach((key,i)=>root.style.setProperty(key,theme[i]+(i===2?'px':i>2?'%':'')));
 // Keep instructions available on demand, without a permanent prose sidebar.
 const rule=document.querySelector('.game-info .rule');
 if(rule){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='How to play';rule.replaceWith(details);details.className='rule';details.append(summary,rule);}
})();
