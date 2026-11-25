// Runs in both the React document and the isolated Arcade document.
export function installCoverMotion(root = document) {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const style = document.createElement('style');
  style.textContent = `@keyframes gameCoverDrift{0%,100%{transform:scale(1.025) translateY(0)}50%{transform:scale(1.075) translateY(-1%)}}
  img[data-game-cover]{animation:gameCoverDrift 8s ease-in-out infinite;animation-play-state:paused;transform-origin:center;}
  img[data-game-cover][data-cover-visible="true"]{animation-play-state:running;}
  @media(prefers-reduced-motion:reduce){img[data-game-cover]{animation:none!important;transform:none!important;}}`;
  style.textContent += '@media(max-width:767px){img[data-game-cover]{animation:none!important;transform:none!important;}}';
  document.head.append(style);
  const selector = '.grogames-art img';
  const seen = new WeakSet();
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.dataset.coverVisible = String(e.isIntersecting && !document.hidden);
  }), {threshold:0.15});
  function scan() { root.querySelectorAll(selector).forEach(img => {
    if (seen.has(img)) return;
    seen.add(img); img.dataset.gameCover = 'true'; observer.observe(img);
  }); }
  function visibility() { root.querySelectorAll('[data-game-cover]').forEach(img => {
    if (document.hidden) img.dataset.coverVisible='false';
    else {observer.unobserve(img);observer.observe(img);}
  }); }
  scan();
  const changes = new MutationObserver(scan);
  changes.observe(root,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',visibility);
  return () => {observer.disconnect();changes.disconnect();style.remove();document.removeEventListener('visibilitychange',visibility);};
}
