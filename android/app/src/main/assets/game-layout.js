// Layout only. Never change provider authorization, hidden state or game data.
(() => {
  if (window.__playlootLayoutInstalled) return;
  window.__playlootLayoutInstalled = true;
  const visited = new WeakSet();
  function fit(win, depth = 0) {
    if (depth > 3) return;
    let doc;
    try { doc = win.document; if (!doc.body) return; } catch { return; }
    if (!visited.has(doc)) {
      visited.add(doc);
      const style = doc.createElement('style');
      style.textContent = 'html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important}' +
        '#game-content{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;margin:0!important}';
      doc.head.appendChild(style);
      win.addEventListener('resize', () => fit(win, depth), { passive: true });
      // Providers often add their canvas after the loader has finished.
      // Watch insertion only, avoiding a style observer/render feedback loop.
      let pending = false;
      new win.MutationObserver(() => {
        if (pending) return;
        pending = true;
        win.requestAnimationFrame(() => { pending = false; fit(win, depth); });
      }).observe(doc.body, { childList: true, subtree: true });
      style.textContent += '[data-playloot-surface]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;transform:none!important;object-fit:fill!important}';
    }
    const canvases = [...doc.querySelectorAll('canvas')].filter(canvas => {
      const rect = canvas.getBoundingClientRect();
      return !canvas.hidden && rect.width > 150 && rect.height > 150;
    });
    if (canvases.length === 1) canvases[0].setAttribute('data-playloot-surface', '');
    // The provider retains ownership of loading, adverts and access checks.
    const frame = doc.querySelector('iframe#game-content');
    if (frame) {
      if (!frame.dataset.playlootLayout) {
        frame.dataset.playlootLayout = 'true';
        frame.addEventListener('load', () => fit(frame.contentWindow, depth + 1));
      }
      fit(frame.contentWindow, depth + 1);
    }
  }
  fit(window);
})();
