// This self-contained function runs inside the saved Stitch document.
export function enhanceArcade(games, appConfig = {}, catalogUrl = "") {
  async function start() {
    const catalog = [{"id":"switchback-rally","title":"Switchback Rally","category":"Driving","orientation":"landscape","path":"/grogames/switchback-rally/index.html","cover":"/grogames/covers/cinematic/switchback-rally.webp"},{"id":"canyon-drive","title":"Canyon Drive","category":"Driving","orientation":"landscape","path":"/grogames/canyon-drive/index.html","cover":"/grogames/covers/cinematic/canyon-drive.webp"},{"id":"courtside","title":"Courtside","category":"Sports","orientation":"portrait","path":"/grogames/courtside/index.html","cover":"/grogames/covers/cinematic/courtside.webp"},{"id":"featherfall","title":"Featherfall","category":"Puzzle","orientation":"landscape","path":"/grogames/featherfall/index.html","cover":"/grogames/covers/cinematic/featherfall.webp"},{"id":"first-touch","title":"First Touch","category":"Sports","orientation":"landscape","path":"/grogames/first-touch/index.html","cover":"/grogames/covers/cinematic/first-touch.webp"},{"id":"fruit-frenzy","title":"Fruit Frenzy","category":"Arcade","orientation":"portrait","path":"/grogames/fruit-frenzy/index.html","cover":"/grogames/covers/cinematic/fruit-frenzy.webp"},{"id":"groove-grove","title":"Groove Grove","category":"Rhythm","orientation":"portrait","path":"/grogames/groove-grove/index.html","cover":"/grogames/covers/cinematic/groove-grove.webp"},{"id":"neon-rage","title":"Neon Rage","category":"Racing","orientation":"portrait","path":"/grogames/neon-rage/index.html","cover":"/grogames/covers/cinematic/neon-rage.webp"},{"id":"skyline-sprint","title":"Skyline Sprint","category":"Runner","orientation":"portrait","path":"/grogames/skyline-sprint/index.html","cover":"/grogames/covers/cinematic/skyline-sprint.webp"},{"id":"strikepoint","title":"Strikepoint","category":"Action","orientation":"landscape","path":"/grogames/strikepoint/index.html","cover":"/grogames/covers/cinematic/strikepoint.webp"},{"id":"tidal-rush","title":"Tidal Rush","category":"Adventure","orientation":"portrait","path":"/grogames/tidal-rush/index.html","cover":"/grogames/covers/cinematic/tidal-rush.webp"},{"id":"turbo-avenue","title":"Turbo Avenue","category":"Racing","orientation":"portrait","path":"/grogames/turbo-avenue/index.html?embed=1","cover":"/grogames/covers/cinematic/turbo-avenue.webp"},{"id":"moon-rider","title":"Moon Rider","category":"Racing","orientation":"portrait","path":"/grogames/moon-rider/index.html?embed=1","cover":"/grogames/covers/cinematic/moon-rider.webp"},{"id":"sky-courier","title":"Sky Courier","category":"Action","orientation":"portrait","path":"/grogames/sky-courier/index.html?embed=1","cover":"/grogames/covers/cinematic/sky-courier.webp"},{"id":"orbit-guard","title":"Orbit Guard","category":"Action","orientation":"portrait","path":"/grogames/orbit-guard/index.html?embed=1","cover":"/grogames/covers/cinematic/orbit-guard.webp"},{"id":"meteor-drift","title":"Meteor Drift","category":"Action","orientation":"portrait","path":"/grogames/meteor-drift/index.html?embed=1","cover":"/grogames/covers/cinematic/meteor-drift.webp"},{"id":"pulse-paddle","title":"Pulse Paddle","category":"Sports","orientation":"portrait","path":"/grogames/pulse-paddle/index.html","cover":"/grogames/covers/cinematic/pulse-paddle.webp"},{"id":"archery-3d","title":"Archery 3D","category":"Sports","orientation":"landscape","path":"/grogames/archery-3d.html","cover":"/grogames/covers/cinematic/archery-3d.webp"},{"id":"ice-curl","title":"Ice Curl","category":"Sports","orientation":"portrait","path":"/grogames/ice-curl/index.html","cover":"/grogames/covers/cinematic/ice-curl.webp"}];
    if (!document.querySelector('.grogames-section') && appConfig.screens?.arcade?.groGames?.enabled !== false) {
    const limit = Math.max(0, Math.floor(Number(appConfig.screens?.arcade?.groGames?.limit) || 0));
    const visibleGames = limit ? catalog.slice(0, limit) : catalog;
    const gro=document.createElement('section');gro.className='grogames-section';
    gro.innerHTML='<div class="gro-heading"><div><small>ORIGINAL GAMES</small><h2>GroGames</h2></div><div class="gro-heading-actions"><span>'+visibleGames.length+' games</span><button type="button" class="gro-view-all">View all</button></div></div>';
    const grid=document.createElement('div');grid.className='grogames-grid';grid.setAttribute('aria-label','GroGames games');
    const style=document.createElement('style');style.textContent=`
    .grogames-section{margin:24px 16px;color:#eef0f8;min-width:0}.gro-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:16px}.gro-heading small{color:#4cd7f6;font-size:9px;letter-spacing:2px}.gro-heading h2{margin:6px 0 0;font-size:24px}.gro-heading-actions{display:flex;align-items:center;gap:10px}.gro-heading-actions>span{color:#a8b3c8;font-size:12px;white-space:nowrap}.gro-view-all{border:1px solid #4cd7f64d;border-radius:999px;background:#4cd7f614;color:#73e4fb;padding:8px 11px;font:700 11px/1 inherit;cursor:pointer;white-space:nowrap}.gro-view-all b{font-size:14px}.gro-view-all:focus-visible{outline:2px solid #69dfec;outline-offset:2px}@media(max-width:360px){.gro-heading-actions>span{display:none}}
    .grogames-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.grogames-card{display:flex;flex-direction:column;padding:0;min-width:0;text-align:left;color:#eef0f8;background:#1a1f2a;border:1px solid #ffffff12;border-radius:14px;overflow:hidden;cursor:pointer;box-shadow:0 5px 15px #0002;transition:transform .18s,border-color .18s}.grogames-art{position:relative;aspect-ratio:4/3;overflow:hidden;background:#263444}.grogames-art img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.grogames-art small{position:absolute;top:8px;left:8px;border-radius:20px;padding:4px 7px;background:#111827d9;color:#9df0df;font-size:9px}.grogames-info{padding:14px;display:flex;flex-direction:column;gap:9px}.grogames-info strong{font-size:14px;line-height:1.4;overflow-wrap:anywhere}.grogames-info>span{display:flex;justify-content:space-between;align-items:center;color:#a6b6c9;font-size:11px}.grogames-info b{color:#4cd7f6;font-size:18px}.grogames-card:focus-visible{outline:2px solid #69dfec;outline-offset:3px}.grogames-card:active{transform:scale(.98)}@media(hover:hover){.grogames-card:hover{border-color:#4cd7f680;transform:translateY(-2px)}.grogames-card:hover img{transform:scale(1.04)}}@media(max-width:340px){.grogames-grid{gap:9px}.grogames-info{padding:10px}}@media(prefers-reduced-motion:reduce){.grogames-card,.grogames-art img{transition:none}}
    `;document.head.append(style);
    for(const game of visibleGames){const card=document.createElement('button');card.type='button';card.className='grogames-card';card.dataset.grogameId=game.id;card.setAttribute('aria-label','Play '+game.title);
      // This short grid lives in a srcDoc frame. Start its cover requests at
      // insertion rather than depending on the frame's lazy-load visibility.
      const art=document.createElement('div');art.className='grogames-art';const img=document.createElement('img');img.loading='eager';img.decoding='async';img.width=640;img.height=480;img.src=game.cover;img.alt=game.title;art.append(img);const badge=document.createElement('small');badge.textContent='Instant play';art.append(badge);
      const info=document.createElement('div');info.className='grogames-info';const title=document.createElement('strong');title.textContent=game.title;const meta=document.createElement('span');meta.textContent=game.category;const play=document.createElement('b');play.textContent='▶';play.setAttribute('aria-hidden','true');meta.append(play);info.append(title,meta);card.append(art,info);
      card.onclick=()=>parent.postMessage({type:'playloot:play-game',game:{id:game.id,title:game.title,playUrl:game.path,thumbnail:game.cover,embedded:true,orientation:game.orientation}},'*');grid.append(card);
    }gro.querySelector('.gro-view-all').addEventListener('click',()=>parent.postMessage({type:'playloot:navigate',path:'/all-games?source=grogames'},'*'));gro.append(grid);const content=document.querySelector('main > div')||document.querySelector('main');content?.append(gro);
    }
    const arcade = appConfig.screens?.arcade || {};
    const sectionsConfig = arcade.sections || {};
    const carouselConfig = arcade.carousel || {};
    const buttons = appConfig.components?.buttons || {};
    const selectedIds = carouselConfig.selectedGameIds || [];
    document.documentElement.style.setProperty('--pms-accent', appConfig.branding?.accent || '#4cd7f6');
    document.documentElement.style.setProperty('--pms-highlight', appConfig.branding?.highlight || '#d4ff3e');
    const theme = document.createElement('style');
    theme.textContent = `.pl-eyebrow,.pl-caption{color:var(--pms-accent)!important}.pl-dot[aria-current="true"] span{background:var(--pms-highlight)!important}`;
    document.head.appendChild(theme);
    const sources = ['grogames'];
    let candidates = sources.includes('embedded') ? games : [];
    if (sources.includes('grogames')) candidates = candidates.concat(catalog.map(g => ({id:'gro:'+g.id, title:g.title, image:g.cover, embed:new URL(g.path, parent.location.href).href, badge:g.category, blurb:'Original Gro Games', orientation:'portrait', embedded:true, gameId:g.id})));
    if (sources.includes('gamezop') && catalogUrl) {
      try {
        const live = await parent.__playlootGameCatalog.get(catalogUrl);
        candidates = candidates.concat(live.map(g => ({id:'provider:'+g.code, gameId:g.code, title:g.name, image:g.images?.cover || g.images?.square || g.images?.thumb, embed:g.url, badge:g.category?.name || 'Arcade', blurb:g.description || '', orientation:g.screen_orientation, embedded:g.embedded === true})));
      } catch { /* Keep other selected sources available if the provider is offline. */ }
    }
    games = candidates.filter(game => !selectedIds.length || selectedIds.includes(game.id)).slice(0, Math.max(1, Number(carouselConfig.count || 5)));
    games = games.map(game => ({...game, desktopImage: ['courtside','featherfall','first-touch'].includes(game.gameId) ? `/grogames/covers/desktop/${game.gameId}.webp` : null}));
    const icon = (name) => `<span class="material-symbols-outlined" aria-hidden="true">${String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>`;
    const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const buttonIcon = (button, fallback) => button?.iconUrl
      ? `<img src="${escape(button.iconUrl)}" alt="" aria-hidden="true" style="width:18px;height:18px;object-fit:contain">`
      : icon(button?.icon || fallback);
    const buttonStyle = (button) => `background:${escape(button?.backgroundColor || '#ffffff')};color:${escape(button?.textColor || '#111827')}`;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Native scrolling supports touch, trackpad, keyboard and mouse controls.
    function carousel(track, label) {
      const slides = [...track.children];
      track.classList.add('pl-carousel');
      track.setAttribute('aria-label', label);
      track.setAttribute('aria-roledescription', 'carousel');
      track.setAttribute('role', 'region');
      track.tabIndex = 0;
      slides.forEach((slide, i) => {
        slide.classList.add('pl-slide');
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        slide.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
      });
      const controls = document.createElement('div');
      controls.className = 'pl-carousel-controls';
      controls.innerHTML = `<button type="button" class="pl-arrow" aria-label="Previous ${label}">${icon('arrow_back')}</button><div class="pl-dots">${slides.map((_, i) => `<button type="button" class="pl-dot" aria-label="Show ${label} ${i + 1}" aria-current="${i === 0 ? 'true' : 'false'}"><span></span></button>`).join('')}</div><button type="button" class="pl-arrow" aria-label="Next ${label}">${icon('arrow_forward')}</button>`;
      track.after(controls);
      const [previous, next] = controls.querySelectorAll('.pl-arrow');
      const dots = [...controls.querySelectorAll('.pl-dot')];
      let index = 0;
      function update() {
        const left = track.getBoundingClientRect().left;
        index = slides.reduce((closest, slide, i) => Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[closest].getBoundingClientRect().left - left) ? i : closest, 0);
        dots.forEach((dot, i) => dot.setAttribute('aria-current', String(index === i)));
        previous.disabled = index === 0;
        next.disabled = index === slides.length - 1;
        slides.forEach((slide, i) => { slide.inert = index !== i; });
      }
      function go(i) {
        const target = slides[Math.max(0, Math.min(i, slides.length - 1))];
        track.scrollTo({ left: track.scrollLeft + target.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: reduced.matches ? 'instant' : 'smooth' });
      }
      previous.addEventListener('click', () => go(index - 1));
      next.addEventListener('click', () => go(index + 1));
      dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
      track.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        go(index + (e.key === 'ArrowRight' ? 1 : -1));
      });
      let pending = false;
      track.addEventListener('scroll', () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { update(); pending = false; });
      }, { passive: true });
      new ResizeObserver(update).observe(track);
      update();
      return go;
    }

    const oldTrack = document.getElementById('promo-track');
    if (oldTrack && (carouselConfig.enabled === false || sectionsConfig.featuredCarousel === false)) {
      const featureSection = oldTrack.closest('section') || oldTrack.parentElement;
      if (featureSection) featureSection.style.display = 'none';
    }
    if (oldTrack && carouselConfig.enabled !== false && sectionsConfig.featuredCarousel !== false) {
      const track = document.createElement('div');
      track.id = 'promo-track';
      track.innerHTML = games.map((game, i) => `<article class="pl-feature${game.desktopImage ? ' pl-feature--wide' : ''}">
        <picture>${game.desktopImage ? `<source media="(min-width: 1024px)" srcset="${escape(game.desktopImage)}">` : ''}<img class="pl-feature-art" src="${escape(game.image)}" alt="${escape(game.title)} cover art" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></picture>
        <div class="pl-feature-shade"></div>
        <div class="pl-feature-top"><span class="pl-tag pl-tag--glass">${icon('verified')} Editor’s pick</span></div>
        <div class="pl-feature-content"><span class="pl-eyebrow">${escape(game.badge)} · Instant play</span><h3>${escape(game.title)}</h3><p>${escape(game.blurb)}</p>
        <div class="pl-feature-bottom"><button class="pl-button pl-button--primary" style="${buttonStyle(buttons.featuredPlay)}" type="button" data-feature-game="${i}">${buttonIcon(buttons.featuredPlay, 'play_arrow')} ${escape(buttons.featuredPlay?.title || 'Play now')}</button><span class="pl-caption">No download needed</span></div></div>
      </article>`).join('');
      oldTrack.replaceWith(track);
      const oldDots = document.getElementById('dot-0')?.parentElement;
      if (oldDots) oldDots.remove();
      if (games.length) carousel(track, 'featured game');
      else track.innerHTML = '<p>No featured games selected. Update the carousel in PMS.</p>';
      track.addEventListener('click', (e) => {
        const button = e.target.closest('[data-feature-game]');
        if (!button) return;
        const game = games[Number(button.dataset.featureGame)];
        parent.postMessage({ type: 'playloot:play-game', game: { id: game.gameId || game.id, embedded: game.embedded !== false, title: game.title, playUrl: game.embed, thumbnail: game.image, orientation: game.orientation || 'landscape' } }, '*');
      });
    }

    // Replace the finance-style banner with a compact arcade greeting.
    const lootHeading = [...document.querySelectorAll('h3')].find((el) => el.textContent.toLowerCase().includes('mystery loot'));
    const lootCard = lootHeading?.closest('div.relative.overflow-hidden.rounded-xl');
    if (lootCard) {
      const greeting = document.createElement('section');
      greeting.className = 'pl-welcome';
      greeting.innerHTML = `
        <div class="pl-catalog-stage">
          <img class="pl-hero-canvas" src="/playloot-media/arcade-world-poster.jpg" alt="" aria-hidden="true" decoding="async">
          <div class="pl-hero-shade" aria-hidden="true"></div>
          <img class="pl-catalog-crest" src="/playloot-art/crest.png" alt="Playloot">
          <div class="pl-catalog-badges"><span>100+Games</span><span>10x rewards</span></div>
          <div class="pl-catalog-trails" aria-hidden="true">
            <img class="pl-trail-coin" src="/playloot-art/hero-coin.png" alt="">
            <img class="pl-trail-timer" src="/playloot-art/hero-timer.png" alt="">
            <img class="pl-trail-gem" src="/playloot-art/hero-gem.png" alt="">
            <img class="pl-trail-trophy" src="/playloot-art/hero-trophy.png" alt="">
          </div>
          <h1>Play More<br><span>Earn More</span></h1>
          <div class="pl-power-row" aria-hidden="true">
            <img src="/playloot-art/powers-b.png" alt="">
            <img src="/playloot-art/powers-a.png" alt="">
          </div>
          <div class="pl-catalog-actions">
            <a href="/all-games" data-path="all-games" class="pl-catalog-button">Game Catalog</a>
            <a href="/all-games" data-path="all-games">Explore →</a>
          </div>
          <ul class="pl-catalog-genres" aria-label="Game genres"><li>Action</li><li>Arcade</li><li>Adventure</li><li>Battle</li></ul>
          <div class="pl-catalog-characters" aria-hidden="true">
            <img class="pl-catalog-duo" src="/playloot-art/arcade-adventurers-holding-chest.webp" width="1254" height="1254" alt="" loading="eager" fetchpriority="high" decoding="async">
          </div>
        </div>
      `;
      if (sectionsConfig.hero === false) greeting.style.display = 'none';
      lootCard.replaceWith(greeting);
      const characters = greeting.querySelector('.pl-catalog-duo');
      const revealCharacters = () => characters.decode().then(() => {
        characters.classList.add('is-ready');
      });
      revealCharacters().catch(() => {
        characters.src = '/playloot-art/arcade-adventurers-holding-chest.png';
        revealCharacters().catch(() => { /* Preserve the reserved scene area if both formats fail. */ });
      });

    }

    const sections = document.getElementById('gz-home-sections');
    if (sections) {
      const addArt = (element, names) => {
        if (!element) return;
        const art = document.createElement('span');
        art.className = 'pl-card-art';
        art.setAttribute('aria-hidden', 'true');
        for (const name of names) {
          const image = document.createElement('img');
          image.src = '/playloot-art/' + name + '.png';
          image.alt = '';
          image.loading = 'lazy';
          art.append(image);
        }
        element.append(art);
      };
      const quickCards = sections.querySelectorAll('div.no-scrollbar > div');
      const destinations = ['rewards', null, 'profile', 'all-games'];
      quickCards.forEach((card, i) => {
        card.classList.add('pl-quick-card');
        addArt(card.querySelector('.gz-quick-icon'), [['money-bag'], ['mystery'], ['cash'], ['owl']][i]);
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        if (destinations[i]) card.dataset.path = destinations[i];
        else {
          const open = () => parent.postMessage({ type: 'playloot:spin-open' }, '*');
          card.addEventListener('click', open);
          card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        }
      });
      const zones = sections.lastElementChild?.lastElementChild;
      if (zones) [...zones.children].forEach((zone, i) => {
        zone.classList.add('pl-zone');
        const title = zone.querySelector('p');
        if (title) {
          const words = title.textContent.trim().split(/\s+/);
          const accent = document.createElement('span');
          accent.textContent = words.pop();
          title.textContent = words.join(' ') + ' ';
          title.append(accent);
        }
        addArt(zone, [['zone-bow'], ['zone-gloves'], ['zone-belt'], ['zone-shield']][i]);
        zone.dataset.zone = i;
        if (i === 3) {
          zone.removeAttribute('data-coming-soon');
          zone.dataset.path = 'tournaments';
        } else {
          zone.dataset.path = i === 1 ? 'leaderboard' : 'all-games';
        }
        zone.setAttribute('role','button');
        zone.tabIndex = 0;
      });
      const missionButton = sections.querySelector('button');
      if (missionButton) missionButton.dataset.path = 'all-games';
      addArt(sections.querySelector('.gz-mission-art'), ['mission-target']);
      const offers = document.createElement('section');
      offers.className = 'pl-offers';
      offers.innerHTML = `<div class="pl-section-heading"><h2>${icon('local_fire_department')} In the spotlight</h2><span class="pl-caption">Discover more</span></div><div class="pl-offer-track">
        <article class="pl-offer pl-offer--violet"><div><span class="pl-eyebrow">DAILY RITUAL</span><h3>A little luck.<br>A fresh start.</h3><p>Your daily spin is waiting.</p><button type="button" class="pl-button pl-button--light" style="${buttonStyle(buttons.dailySpin)}" data-open-spin>${buttonIcon(buttons.dailySpin, 'casino')} ${escape(buttons.dailySpin?.title || 'Open Lucky Spin')}</button></div><div class="pl-offer-emblem" aria-hidden="true">${icon('casino')}<span class="pl-orbit"></span></div></article>
        <article class="pl-offer pl-offer--blue"><div><span class="pl-eyebrow">PICK UP & PLAY</span><h3>Your next<br>high score awaits.</h3><p>Find a new favorite in the arcade.</p><a href="#" data-path="all-games" class="pl-button pl-button--light" style="${buttonStyle(buttons.exploreGames)}">${buttonIcon(buttons.exploreGames, 'arrow_forward')} ${escape(buttons.exploreGames?.title || 'Explore games')}</a></div><div class="pl-offer-emblem" aria-hidden="true">${icon('sports_esports')}<span class="pl-orbit"></span></div></article>
        <article class="pl-offer pl-offer--gold"><div><span class="pl-eyebrow">THE LEADERBOARD</span><h3>Meet the<br>top contenders.</h3><p>See who’s leading the arena.</p><a href="#" data-path="leaderboard" class="pl-button pl-button--light" style="${buttonStyle(buttons.viewRankings)}">${buttonIcon(buttons.viewRankings, 'arrow_forward')} ${escape(buttons.viewRankings?.title || 'View rankings')}</a></div><div class="pl-offer-emblem" aria-hidden="true">${icon('emoji_events')}<span class="pl-orbit"></span></div></article>
      </div>`;
      sections.before(offers);
      offers.querySelectorAll('.pl-offer-emblem').forEach((emblem, i) => {
        addArt(emblem, [['die'], ['controller'], ['trophies']][i]);
      });
      if (sectionsConfig.offers === false) offers.style.display = 'none';
      carousel(offers.querySelector('.pl-offer-track'), 'spotlight');
      const trust = document.createElement('section');
      trust.className = 'pl-trust';
      trust.innerHTML = `
        <div class="pl-trust-stage">
          <div class="pl-trust-panel"></div>
          <img class="pl-trust-phoenix" src="/playloot-art/phoenix.png" alt="" loading="lazy">
          <div class="pl-trust-benefits">
            <h2>Playloot</h2>
            <span>Earn coins</span>
            <span>Collect rewards</span>
            <span>Request withdrawals</span>
          </div>
          <div class="pl-trust-message">
            <h3>Find your<br><span class="pl-trust-reward-text">next reward</span></h3>
            <p>Browse offers and see what you can earn.</p>
            <a href="/offers" data-path="offers" class="pl-catalog-button">Explore offers <span aria-hidden="true">→</span></a>
          </div>
          <img class="pl-trust-guardian" src="/playloot-art/guardian.png" alt="" loading="lazy">
        </div>
      `;
      sections.after(trust);
      offers.querySelector('[data-open-spin]').addEventListener('click', () => parent.postMessage({ type: 'playloot:spin-open' }, '*'));
      const vaultHeading = [...document.querySelectorAll('h4')].find((el) => el.textContent.includes('Lucky Spin'));
      const vault = vaultHeading?.closest('div.w-full.rounded-xl');
      if (vault) {
        vault.classList.add('pl-art-vault');
        addArt(vault, ['die']);
        offers.after(vault);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
