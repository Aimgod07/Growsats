// Add semantic styling hooks to the imported screens and dynamically loaded cards.
export function finishScreen(screen, artwork) {
  function start() {
    document.body.dataset.screen = screen;
    if (screen === 'login') {
      const hero = document.querySelector('main > div > div');
      if (hero) {
        hero.className = 'pl-login-hero';
        hero.innerHTML = `<img class="pl-login-art" alt="Neon gaming arena" src="${artwork.cover}"><div class="pl-login-overlay"></div><div class="pl-login-brand"><span class="material-symbols-outlined" aria-hidden="true">sports_esports</span> PLAYLOOT <span class="pl-login-brand-tag">THE ARCADE IS OPEN</span></div><div class="pl-login-copy"><span class="pl-eyebrow">YOUR NEXT ADVENTURE STARTS HERE</span><h1>Play. Compete.<br><span>Find your game.</span></h1><p>Discover quick rounds, new challenges,<br>and games worth coming back to.</p><div class="pl-login-features"><span>Instant play</span><span>Fresh challenges</span><span>Your pace</span></div></div>`;
      }
      document.querySelectorAll('button').forEach((button) => {
        if (button.textContent.includes('ENTER ARCADE')) button.classList.add('pl-entry-action');
      });
    }
    if (screen === 'cashout') {
      document.querySelectorAll('main div.rounded-xl').forEach((card) => {
        const copy = card.cloneNode(true);
        copy.querySelectorAll('.material-symbols-outlined').forEach((icon) => icon.remove());
        if (!copy.textContent.trim() && card.querySelector('.material-symbols-outlined')?.textContent.trim() === 'shield') card.remove();
      });
    }
    if (screen === 'profile') {
      const recommendations = document.getElementById('gz-prof-tabs');
      const cosmeticTabs = recommendations?.querySelector('#gz-prof-tabs');
      cosmeticTabs?.remove();
      const heading = recommendations?.querySelector('h2');
      if (heading) heading.textContent = 'From the arcade';
      const viewAll = recommendations?.querySelector('span');
      if (viewAll?.textContent === 'View all') {
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.path = 'all-games';
        link.className = 'pl-text-link';
        link.textContent = 'View all →';
        viewAll.replaceWith(link);
      }
      const identity = document.querySelector('main section');
      const stats = document.getElementById('gz-bento-profile');
      if (identity && stats) {
        stats.classList.add('pl-profile-stats');
        identity.after(stats);
        if (recommendations) stats.after(recommendations);
      }
    }
    document.querySelectorAll('main > div > section:first-child').forEach((section) => {
      if (section.querySelector('h1')) section.classList.add('pl-identity-card');
    });
    const iconNames = { notifications: 'Notifications', add: 'Add funds', close: 'Close', settings: 'Settings', edit: 'Edit', arrow_back: 'Go back', search: 'Search' };
    function enhance(root) {
      root.querySelectorAll('button').forEach((button) => {
        if (button.dataset.finished) return;
        button.dataset.finished = 'true';
        const copy = button.cloneNode(true);
        copy.querySelectorAll('.material-symbols-outlined').forEach((el) => el.remove());
        const text = copy.textContent.trim();
        const symbol = button.querySelector('.material-symbols-outlined')?.textContent.trim();
        if (!text && symbol) {
          button.classList.add('pl-icon-button');
          if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', iconNames[symbol] || symbol.replaceAll('_', ' '));
        } else if (!button.classList.contains('pl-dot')) button.classList.add('pl-control');
      });
      root.querySelectorAll('span.rounded-full, span.rounded-lg, span.rounded, span.rounded-md').forEach((tag) => {
        if (!tag.classList.contains('material-symbols-outlined') && tag.textContent.trim()) tag.classList.add('pl-badge');
      });
      root.querySelectorAll('img').forEach((img) => {
        if (img.dataset.finished) return;
        img.dataset.finished = 'true';
        img.decoding = 'async';
        img.addEventListener('error', () => {
          img.src = '/images/game-fallback.svg';
          img.classList.add('pl-art-fallback');
        }, { once: true });
        if (img.complete && !img.naturalWidth) img.dispatchEvent(new Event('error'));
      });
      root.querySelectorAll('.payout-card').forEach((card) => card.classList.add('pl-payout-card'));
    }
    enhance(document);
    new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) enhance(node.parentElement || node);
      }));
    }).observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      const update = () => {
        const min = Number(slider.min || 0), max = Number(slider.max || 100);
        slider.style.setProperty('--range-progress', `${100 * (slider.value - min) / (max - min || 1)}%`);
      };
      slider.addEventListener('input', update);
      update();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
