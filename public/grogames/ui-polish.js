(()=>{
  document.documentElement.dataset.uiPolished='true';
  const interactive='button,.primary,.secondary,.play,[role="button"]';
  document.addEventListener('pointerdown',event=>event.target.closest(interactive)?.classList.add('ui-pressed'));
  for(const type of ['pointerup','pointercancel','pointerleave']) document.addEventListener(type,event=>event.target.closest(interactive)?.classList.remove('ui-pressed'));
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches(interactive))event.target.classList.add('ui-pressed')});
  document.addEventListener('keyup',event=>event.target.closest?.(interactive)?.classList.remove('ui-pressed'));
})();
