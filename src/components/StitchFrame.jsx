import DesktopExtras from './DesktopExtras';
import responsiveFrameCss from '../styles/responsive-frame.css?raw';
import {createPortal} from 'react-dom';
import {AdPlacement} from './LiveFeatures';
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import GameWebViewOverlay from "./timer/GameWebViewOverlay";
import SpinWheel from "./SpinWheel";
import { FEATURED_GAMES } from "../data/featuredGames";
import { getToken, BACKEND_URL } from "../utils/api";
import "../utils/gameCatalog";
import polishCss from "../styles/stitch-polish.css?raw";
import stitchUtilityCss from "../styles/stitch-utilities.css?inline";
import { enhanceArcade } from "./stitch/arcade";
import {installCoverMotion} from '../utils/coverMotion';

import { finishScreen } from "./stitch/finish";
import referenceArtwork from "../data/referenceArtwork.json";
import { useAppConfig } from "../config/appConfig";
import {useWallet} from './WalletState';
import { beginLoading } from '../utils/loading';

const GAMES_API_URL = `${BACKEND_URL}/api/games/catalog`;

const SCREENS = {
  arcade: { load: () => import("../../.stitch/designs/eb7ea18c382b4a80ab35bb97e09fecdd.html?raw"), title: "Playloot arcade" },
  leaderboard: { load: () => import("../../.stitch/designs/0c330acf70324cdea289b0eea92980be.html?raw"), title: "Playloot leaderboard" },
  avatarLoadout: { load: () => import("../../.stitch/designs/efb816459997440a85b495e3fcd88b65.html?raw"), title: "Playloot avatar loadout" },
  avatarSelector: { load: () => import("../../.stitch/designs/19555cbc3dd64abc9bf60ff2bef0b297.html?raw"), title: "Playloot avatar selector" },
};

const ROUTES = {
  notifications: "/notifications", coins: "/missions", diamonds: "/offers?reward=diamonds",
  home: "/Home",
  arcade: "/Home",
  "arcade-lobby": "/Home",
  "all-games": "/all-games?source=gamezop",
  leaderboard: "/leaderboard",
  ranks: "/leaderboard",
  rewards: "/redeem",
  loot: "/redeem",
  cashout: "/redeem",
  "withdraw-loot-cashout": "/redeem",
  "loot-cashout": "/redeem",
  profile: "/profile",
  "gamer-profile": "/profile",
  "profile-settings": "/profile/settings",
  settings: "/profile/settings",
  "avatar-selector": "/avatar",
  "avatar-loadout": "/avatar/loadout",
  hub: "/hub",
};

const NAVIGATION_BRIDGE = `<script>
  const routeByPath = {
    notifications: "/notifications", coins: "/missions", diamonds: "/offers?reward=diamonds",
    home: "/Home", arcade: "/Home", "arcade-lobby": "/Home",
    "all-games": "/all-games?source=gamezop",
    leaderboard: "/leaderboard", ranks: "/leaderboard",
    rewards: "/redeem", loot: "/redeem", cashout: "/redeem",
    "withdraw-loot-cashout": "/redeem", "loot-cashout": "/redeem",
    profile: "/profile", "gamer-profile": "/profile",
    "profile-settings": "/profile/settings", settings: "/profile/settings",
    "avatar-selector": "/avatar", "avatar-loadout": "/avatar/loadout", hub: "/hub"
  };

  function resolvePath(raw) {
    if (!raw) return null;
    const key = String(raw).trim().toLowerCase();
    return routeByPath[key] || null;
  }

  function sendNavigate(path) {
    parent.postMessage({ type: "playloot:navigate", path }, "*");
  }

  // The header logo is a remote googleusercontent URL that fails offline,
  // leaving a broken image + alt text. Swap in an inline brand mark.
  var LOGO_SVG = '<svg viewBox="0 0 48 46" width="30" height="29" role="img" aria-label="Playloot">'
    + '<path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>';

  function fixLogo() {
    document.querySelectorAll('header button').forEach(function(button) {
      const icon = button.querySelector('.material-symbols-outlined')?.textContent.trim();
      if (icon === 'notifications') {
        button.dataset.path = 'notifications';
        button.setAttribute('aria-label', 'Open notifications');
      } else if (icon === 'add') {
        const currency = button.parentElement.querySelector('.material-symbols-outlined')?.textContent.trim();
        if (currency === 'monetization_on' || currency === 'diamond') {
          button.dataset.path = currency === 'diamond' ? 'diamonds' : 'coins';
          button.setAttribute('aria-label', currency === 'diamond' ? 'Earn diamonds' : 'Earn coins');
        }
      }
    });
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var alt = (imgs[i].getAttribute("alt") || "").toLowerCase();
      if (alt.indexOf("playloot") === -1) continue;
      var wrap = document.createElement("span");
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.innerHTML = LOGO_SVG;
      if (imgs[i].parentElement) imgs[i].parentElement.replaceChild(wrap, imgs[i]);
      return;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fixLogo);
  } else {
    fixLogo();
  }

  document.querySelectorAll("button").forEach((button) => {
    const label = button.textContent.replace(/\\s+/g, " ").trim().toLowerCase();
    if (label.includes("arcade") || label.includes("try as guest") || label.includes("continue with") || label === "discord" || label === "steam deck") button.dataset.path = "home";
    else if (label.includes("edit profile") || label.includes("settings")) button.dataset.path = "profile-settings";
    else if (label.includes("switch avatar") || label.includes("unlock skins") || label.includes("avatar selector")) button.dataset.path = "avatar-selector";
    else if (label.includes("equip avatar") || label.includes("save avatar")) button.dataset.path = "profile";
  });

  document.addEventListener("click", (event) => {
    const routeElement = event.target.closest ? event.target.closest("[data-path]") : null;
    if (!routeElement) return;
    // Always swallow the in-iframe anchor default so href="#" never
    // jumps/scrolls the frame when a tab is tapped.
    event.preventDefault();
    const path = resolvePath(routeElement.dataset.path);
    if (path) {
      sendNavigate(path);
    }
  }, true);

  // Keyboard accessibility: Enter/Space on focused [data-path] elements.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const routeElement = event.target.closest ? event.target.closest("[data-path]") : null;
    if (!routeElement) return;
    event.preventDefault();
    const path = resolvePath(routeElement.dataset.path);
    if (path) sendNavigate(path);
  }, true);
</script>`;

// Replaces the static "Top Battlegrounds" grid on the arcade screen with
// live GameZop cards. Runs inside the iframe (same-origin srcDoc).
const GAME_GRID_LOADER = `<script>
(function () {
  var API_URL = "__GAMES_API_URL__";
  var APP_CONFIG = __APP_CONFIG__;
  var arcadeConfig = APP_CONFIG.screens && APP_CONFIG.screens.arcade || {};
  var gridConfig = arcadeConfig.grid || {};
  var categoryConfig = arcadeConfig.categories || {};
  var VISIBLE_COUNT = Number(gridConfig.limit) || 6;
  var allGames = [];
  var activeCategory = "";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pickThumb(g) {
    if (!g) return "";
    if (g.images && (g.images.square || g.images.thumb || g.images.cover)) {
      return g.images.square || g.images.thumb || g.images.cover;
    }
    return g.thumbnail || "";
  }

  function extractList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.games)) return data.games;
    return [];
  }

  function gameCategory(game) {
    var category = game && game.category;
    return String(typeof category === "string" ? category : category && category.name || "Arcade").trim();
  }

  function isAllowed(game) {
    var categories = Array.isArray(gridConfig.categories) ? gridConfig.categories : [];
    var providers = Array.isArray(gridConfig.providers) ? gridConfig.providers : [];
    return (!categories.length || categories.indexOf(gameCategory(game)) !== -1)
      && (!providers.length || providers.indexOf(String(game.providerId || "")) !== -1);
  }

  function findFilters() {
    var labels = document.querySelectorAll("span");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() !== "Arcade Categories") continue;
      var section = labels[i].parentElement && labels[i].parentElement.parentElement;
      if (!section) return null;
      return { row: section.querySelector("div.overflow-x-auto"), count: labels[i].parentElement.querySelector("span:last-child") };
    }
    return null;
  }

  function renderGames(grid) {
    var filtered = activeCategory ? allGames.filter(function (game) {
      return gameCategory(game) === activeCategory;
    }) : allGames;
    var visible = filtered.slice(0, VISIBLE_COUNT);
    if (!visible.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#bcc9cd;font-size:13px;padding:20px 8px">No games in this category yet.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < visible.length; i++) html += cardHtml(visible[i], i);
    grid.innerHTML = html;
    grid.style.gap = "16px";
  }

  function renderFilters(filters, grid) {
    if (!filters || !filters.row) return;
    if (categoryConfig.enabled === false || arcadeConfig.sections && arcadeConfig.sections.categories === false) { filters.row.parentElement.style.display = "none"; return; }
    var allowedCategories = Array.isArray(categoryConfig.selected) ? categoryConfig.selected : [];
    var categories = [];
    allGames.forEach(function (game) {
      var category = gameCategory(game);
      if ((!allowedCategories.length || allowedCategories.indexOf(category) !== -1) && categories.indexOf(category) === -1) categories.push(category);
    });
    categories.sort();
    if (filters.count) filters.count.textContent = "Filter (" + categories.length + ")";
    var names = ["Hot & Trending"].concat(categories);
    filters.row.innerHTML = names.map(function (name, index) {
      var category = index ? name : "";
      var selected = category === activeCategory;
      var style = selected
        ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/20"
        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface font-semibold active:bg-surface-container-highest transition-colors";
      return '<button type="button" data-arcade-category="' + esc(category) + '" aria-pressed="' + selected + '" class="flex-shrink-0 px-3.5 py-2 rounded-lg font-label-md text-label-md flex items-center gap-1.5 ' + style + '">' + (index ? esc(name) : '🔥 Hot &amp; Trending') + '</button>';
    }).join("");
    if (!filters.row.dataset.bound) {
      filters.row.dataset.bound = "1";
      filters.row.addEventListener("click", function (event) {
        var button = event.target.closest("[data-arcade-category]");
        if (!button) return;
        activeCategory = button.getAttribute("data-arcade-category") || "";
        renderFilters(filters, grid);
        renderGames(grid);
      });
    }
  }

  function findSection() {
    // The heading row is removed by UI_CLEANUP_LOADER, so anchor off the
    // grid itself: it is the only 2-col grid holding game cards.
    var grids = document.querySelectorAll("div.grid.grid-cols-2");
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].querySelector("[data-game-id]")) return { grid: grids[i], countEl: null };
    }
    // Fallback: header may not be stripped yet (first paint race).
    var heads = document.querySelectorAll("h2");
    for (var j = 0; j < heads.length; j++) {
      var t = (heads[j].textContent || "").toLowerCase();
      if (t.indexOf("battleground") !== -1) {
        var wrap = heads[j].closest("div.flex.flex-col.space-y-3");
        if (!wrap) wrap = heads[j].parentElement.parentElement;
        var grid = wrap ? wrap.querySelector("div.grid") : null;
        var headerRow = heads[j].closest("div.flex.items-center.justify-between");
        var countEl = headerRow ? headerRow.querySelector("span:last-child") : null;
        if (grid) return { grid: grid, countEl: countEl };
      }
    }
    return null;
  }

  function cardHtml(g, i) {
    var title = esc(g.name || g.title || "Game");
    var img = esc(pickThumb(g));
    var code = esc(g.code || g.id || ("g" + i));
    var url = esc(g.url || g.playUrl || "");
    var orientation = esc(g.screen_orientation || g.orientation || "portrait");
    var online = "Instant play";
    return '<div class="group relative rounded-xl bg-surface-container overflow-hidden flex flex-col shadow-lg active:scale-[0.98] transition-all"'
      + ' data-game-card="1" data-game-id="' + code + '" data-game-title="' + title + '" data-game-url="' + url + '"'
      + ' data-game-thumb="' + img + '" data-game-orientation="' + orientation + '" role="button" tabindex="0" style="cursor:pointer">'
      + '<div class="relative w-full aspect-[4/3] overflow-hidden bg-surface-container-highest">'
      + '<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="' + img + '" alt="' + title + '" loading="lazy" decoding="async">'
      + '<div class="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-black/30"></div>'
      + '<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-surface-container-lowest/80 text-primary font-label-sm text-label-sm font-bold flex items-center gap-1 backdrop-blur-sm">'
      + '<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> ' + online
      + '</span>'
      + '</div>'
      + '<div class="p-3 flex flex-col" style="padding:14px;gap:8px">'
      + '<h3 class="font-headline-sm text-headline-sm text-on-surface font-bold truncate">' + title + '</h3>'
      + '<div class="flex items-center justify-between mt-1 text-on-surface-variant font-body-sm text-body-sm">'
      + '<span class="flex items-center gap-1 text-tertiary"><span class="material-symbols-outlined text-[16px]">monetization_on</span> Free Entry</span>'
      + '<span class="material-symbols-outlined text-primary text-[20px]">play_circle</span>'
      + '</div></div></div>';
  }

  function skeletonHtml() {
    var out = "";
    for (var i = 0; i < VISIBLE_COUNT; i++) {
      out += '<div class="rounded-xl bg-surface-container overflow-hidden flex flex-col" aria-hidden="true">'
        + '<div class="w-full aspect-[4/3]" style="background:linear-gradient(100deg,#191b26 20%,#282934 40%,#191b26 60%);background-size:200% 100%;animation:gzShimmer 1.4s ease-in-out infinite"></div>'
        + '<div class="p-3 flex flex-col gap-2"><div style="height:10px;border-radius:6px;background:#282934"></div>'
        + '<div style="height:14px;border-radius:6px;background:#282934;width:80%"></div></div></div>';
    }
    return out + '<style>@keyframes gzShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>';
  }

  function bindClicks(grid) {
    function openFromEl(el) {
      if (!el) return;
      parent.postMessage({ type: "playloot:play-game", game: {
        id: el.getAttribute("data-game-id"),
        title: el.getAttribute("data-game-title"),
        playUrl: el.getAttribute("data-game-url"),
        thumbnail: el.getAttribute("data-game-thumb"),
        orientation: el.getAttribute("data-game-orientation") || "portrait"
      } }, "*");
    }
    grid.addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest("[data-game-card]") : null;
      if (!card) return;
      e.preventDefault();
      openFromEl(card);
    }, true);
    grid.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest ? e.target.closest("[data-game-card]") : null;
      if (!card) return;
      e.preventDefault();
      openFromEl(card);
    }, true);
  }

  function load() {
    var found = findSection();
    if (!found) return;
    var grid = found.grid;
    var filters = findFilters();
    var catalog = parent.__playlootGameCatalog;
    function show(list) {
      list = list.filter(isAllowed);
      if (gridConfig.enabled === false || arcadeConfig.sections && arcadeConfig.sections.gameGrid === false) {
        grid.closest("div.flex.flex-col.space-y-3").style.display = "none";
        return;
      }
      if (found.countEl && list.length) {
        found.countEl.textContent = list.length + " Games Online";
      }
      if (!list.length) {
        allGames = [];
        grid.innerHTML = '<p style="grid-column:1/-1;color:#bcc9cd;padding:20px">No games are currently enabled.</p>';
        if (found.countEl) found.countEl.textContent = '0 Games Online';
        return;
      }
      allGames = list;
      renderFilters(filters, grid);
      renderGames(grid);
      bindClicks(grid);
    }
    var cached = catalog && catalog.peek(API_URL);
    if (cached) {
      show(cached);
      return;
    }
    grid.innerHTML = skeletonHtml();
    var request = catalog
      ? catalog.get(API_URL)
      : (parent.__playlootTrackedFetch || fetch)(API_URL).then(function (r) {
          if (!r.ok) throw new Error("bad " + r.status);
          return r.json();
        }).then(extractList);
    request.then(show).catch(function () {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#bcc9cd;font-size:13px;padding:20px 8px">'
        + 'Couldn\\'t load live games. <button id="gz-retry" style="color:#4cd7f6;font-weight:700;background:none;border:none;cursor:pointer">Tap to retry</button></div>';
      var btn = document.getElementById("gz-retry");
      if (btn) btn.addEventListener("click", function (e) { e.preventDefault(); load(); });
    });
  }

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
</script>`;

// Uniform vertical rhythm between top-level blocks on every screen.
// Replaces the placeholder numbers in the Stitch screens with live data from
// the playloot Worker (wallet / profile / leaderboard), using the session token.
const LIVE_DATA_LOADER = `<script>
(function () {
  // All three placeholders are substituted with JSON.stringify(...) at the
  // call site, so they must stay unquoted here.
  var TOKEN = __SESSION_TOKEN__;
  var SCREEN = __SCREEN_NAME__;
  var BASE = __BACKEND_URL__;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function get(path) {
    return (parent.__playlootTrackedFetch || fetch)(BASE + path, { headers: { authorization: "Bearer " + TOKEN } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function compact(value) {
    var n = Number(value || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\\.0$/, "") + "M";
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\\.0$/, "") + "K";
    return n.toLocaleString();
  }

  function group(value) {
    return Number(value || 0).toLocaleString();
  }

  function setExact(el, value) {
    if (el && value !== undefined && value !== null) el.textContent = value;
  }

  function findLeafByText(re, root) {
    var nodes = (root || document).querySelectorAll("span, h1, h2, h3, p");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].children && nodes[i].children.length > 0) continue;
      if (re.test((nodes[i].textContent || "").trim())) return nodes[i];
    }
    return null;
  }

  function nextLeaf(node) {
    var el = node && node.nextElementSibling;
    return el && el.children.length === 0 ? el : null;
  }

  // Balances are located by the Material Symbols icon that labels them, never
  // by the placeholder number baked into the design. Matching on "350" or
  // "24,500" silently broke whenever a design was regenerated.
  function applyWallet(wallet) {
    if (!wallet) return;
    var coinsExact = group(wallet.coins);
    var coinsShort = compact(wallet.coins);
    var gems = group(wallet.diamonds);
    var cash = "$" + Number(wallet.cash).toFixed(2);

    var icons = document.querySelectorAll("span.material-symbols-outlined");
    for (var i = 0; i < icons.length; i++) {
      var icon = (icons[i].textContent || "").trim();
      var isCoin = icon === "monetization_on";
      var isGem = icon === "diamond";
      if (!isCoin && !isGem) continue;

      var target = nextLeaf(icons[i]);
      if (!target || !/^[\\d][\\d,]*\\.?\\d*K?$/.test((target.textContent || "").trim())) continue;
      // Only the coin pill is abbreviated ("24.5K"); gems always show in full.
      var inPill = isCoin && icons[i].parentElement && /rounded/.test(icons[i].parentElement.className || "");
      target.textContent = inPill ? coinsShort : isCoin ? coinsExact : gems;
    }

    // Cash chips render a separate "$" glyph, so only the number is written
    // here; the hero figure carries its own currency symbol.
    var leaves = document.querySelectorAll("span, p, h1, h2, h3");
    for (var j = 0; j < leaves.length; j++) {
      if (leaves[j].children.length > 0) continue;
      if ((leaves[j].textContent || "").trim() !== "$") continue;
      var amount = nextLeaf(leaves[j]);
      if (amount && /^[\\d][\\d,]*\\.\\d\\d$/.test((amount.textContent || "").trim())) {
        amount.textContent = Number(wallet.cash).toFixed(2);
      }
    }

    var hero = document.querySelectorAll(".font-display-mobile");
    for (var d = 0; d < hero.length; d++) {
      if (hero[d].children.length === 0 && /^\\$[\\d,]+\\.\\d\\d$/.test((hero[d].textContent || "").trim())) {
        hero[d].textContent = cash;
      }
    }

    // Payout rows ship fabricated USD amounts and there is no disbursement
    // data source yet, so mark them unavailable rather than invent money.
    var spans = document.querySelectorAll("span");
    for (var u = 0; u < spans.length; u++) {
      if (spans[u].children.length > 0) continue;
      if (/^\\$[\\d,]+\\.\\d\\d\\s*USD$/.test((spans[u].textContent || "").trim())) {
        spans[u].textContent = "—";
      }
    }
  }

  function applyProfile(profile, leaderboard) {
    if (!profile) return;

    var name = document.querySelector("h1.font-headline-lg-mobile") || document.querySelector("h1");
    setExact(name, profile.name);

    var level = findLeafByText(/^LVL\\s?\\d+$/i);
    if (level) level.textContent = "LVL " + profile.level;

    // Tier sits next to the workspace_premium glyph.
    var premium = document.querySelector('span.material-symbols-outlined');
    var icons = document.querySelectorAll("span.material-symbols-outlined");
    for (var i = 0; i < icons.length; i++) {
      if ((icons[i].textContent || "").trim() !== "workspace_premium") continue;
      var badge = nextLeaf(icons[i]);
      if (badge && /VIP$/i.test((badge.textContent || "").trim())) {
        badge.textContent = profile.tier.charAt(0) + profile.tier.slice(1).toLowerCase() + " VIP";
      }
    }
    void premium;

    // Anchored on structure/semantics, not on the sample design's alt text.
    // Both the small header avatar and the large hero avatar get updated.
    if (profile.avatarUrl) {
      var avatars = document.querySelectorAll('img[alt="Profile" i], img[data-alt*="avatar portrait" i]');
      for (var a = 0; a < avatars.length; a++) avatars[a].src = profile.avatarUrl;
    }

    applyStat("Games Completed", group(profile.stats && profile.stats.gamesPlayed));
    if (leaderboard && leaderboard.me) {
      applyStat("Global Leaderboard", "#" + leaderboard.me.rank);
    } else {
      applyStat("Global Leaderboard", "—");
    }
    // These two have no backing column yet, so show them as unavailable
    // rather than the sample figures baked into the design.
    applyStat("Gold Cups Won", "—");
    applyStat("Career Win Rate", "—");
  }

  // Stats render as a value <p> immediately followed by a label <p>.
  function applyStat(label, value) {
    var nodes = document.querySelectorAll("p");
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].textContent || "").trim() !== label) continue;
      var previous = nodes[i].previousElementSibling;
      if (previous && previous.tagName === "P" && previous.children.length === 0) {
        previous.textContent = value;
        return;
      }
    }
  }

  function contenderRow(player, index) {
    var accent = index === 0 ? "#ffb95f" : index === 1 ? "#4cd7f6" : index === 2 ? "#a78bfa" : "#869397";
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.07);position:relative;overflow:hidden">'
      + '<span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:' + accent + '"></span>'
      + '<span style="width:26px;flex-shrink:0;text-align:center;font-size:15px;font-weight:800;color:' + accent + '">' + player.rank + '</span>'
      + '<div style="min-width:0;flex:1">'
      + '<p style="margin:0;font-size:13.5px;font-weight:800;color:#e1e1f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(player.name) + '</p>'
      + '<p style="margin:2px 0 0;font-size:11px;color:#869397">' + group(player.coins) + ' pts · Lv ' + player.level + '</p>'
      + '</div>'
      + '<span style="font-size:11px;font-weight:800;color:' + accent + '">💎 ' + group(player.diamonds) + '</span>'
      + '</div>';
  }

  function applyLeaderboard(data) {
    if (!data || !data.players) return;
    var header = findLeafByText(/^Top Contenders$/i);
    var list = null;
    if (header) {
      var section = header.closest("div.flex.flex-col.gap-2") || header.parentElement.parentElement;
      if (section) {
        var kids = Array.prototype.filter.call(section.children, function (el) {
          return el.tagName === "DIV" && el.querySelector("div.w-7");
        });
        list = kids.length ? kids[0].parentElement : null;
      }
    }
    if (list) {
      var html = "";
      for (var i = 0; i < Math.min(10, data.players.length); i++) html += contenderRow(data.players[i], i);
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "8px";
      list.innerHTML = html;
    }

    var contendersValue = findLeafByText(/^142,500$/);
    if (contendersValue) contendersValue.textContent = group(data.totalPlayers || data.players.length);
    var mine = data.me;
    if (mine) {
      var rankValue = findLeafByText(/^#142$/);
      if (rankValue) rankValue.textContent = "#" + mine.rank;
      var tierValue = findLeafByText(/Diamond II Division|Gold Division|Silver Division/i);
      if (tierValue) tierValue.textContent = mine.tier.charAt(0) + mine.tier.slice(1).toLowerCase() + " Division";
    }
  }

  function run() {
    if (!TOKEN) return;
    get("/api/wallet").then(function (wallet) {
      if (wallet) applyWallet(wallet);
      if (SCREEN === "profile") {
        get("/api/profile").then(function (profile) {
          if (!profile) return;
          get("/api/leaderboard").then(function (board) {
            applyProfile(profile, board);
          });
        });
      }
      if (SCREEN === "leaderboard" || SCREEN === "globalLeaderboard") {
        get("/api/leaderboard").then(applyLeaderboard);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("message", function (event) {
    if (event.source === parent && event.data && event.data.type === "playloot:wallet-sync") {
      applyWallet(event.data.wallet);
    }
  });
})();
</script>`;

const SPACING_LOADER = `<script>
(function () {
  var GAP = 20;

  function space() {
    var main = document.querySelector("main");
    if (!main) return;

    var blocks = [];
    for (var i = 0; i < main.children.length; i++) {
      var el = main.children[i];
      if (el.tagName === "SCRIPT" || el.tagName === "NAV") continue;
      var cls = el.getAttribute("class") || "";
      if (!el.id && cls.indexOf("space-y-") !== -1) {
        for (var j = 0; j < el.children.length; j++) {
          if (el.children[j].tagName === "SCRIPT") continue;
          blocks.push(el.children[j]);
        }
      } else {
        blocks.push(el);
      }
    }

    for (var k = 0; k < blocks.length; k++) {
      blocks[k].style.marginTop = "0";
      blocks[k].style.marginBottom = k === blocks.length - 1 ? "0px" : GAP + "px";
    }
    main.style.paddingBottom = "112px";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", space);
  } else {
    space();
  }
})();
</script>`;

// Opens the React SpinWheel when the "Lucky Spin Vault" SPIN button is tapped.
const SPIN_LOADER = `<script>
(function () {
  function wire() {
    var heads = document.querySelectorAll("h4");
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || "").toLowerCase();
      if (t.indexOf("lucky spin") !== -1) {
        var banner = heads[i].closest("div.w-full.rounded-xl") || heads[i].parentElement.parentElement;
        var btns = banner ? banner.querySelectorAll("button") : [];
        for (var j = 0; j < btns.length; j++) {
          (function (btn) {
            if (btn.dataset.spinWired) return;
            btn.dataset.spinWired = "1";
            btn.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              parent.postMessage({ type: "playloot:spin-open" }, "*");
            }, true);
            btn.addEventListener("keydown", function (e) {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              parent.postMessage({ type: "playloot:spin-open" }, "*");
            }, true);
          })(btns[j]);
        }
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
</script>`;

// Hides removed arcade sections: LIVE DROPS ticker + CONTINUE checkpoint bar.
const UI_CLEANUP_LOADER = `<script>
(function () {
  function clean() {
    // 1. LIVE DROPS infinite ticker directly under the header.
    // NOTE: match the ticker node itself (unique combo of classes), never a
    // high-level wrapper — closest() matches self first, so searching from
    // outer divs inward would nuke the whole page.
    var tickers = document.querySelectorAll("div.w-full.bg-surface-container-lowest");
    for (var i = 0; i < tickers.length; i++) {
      var tt = (tickers[i].textContent || "");
      if (tt.indexOf("LIVE DROPS") !== -1) {
        tickers[i].remove();
        break;
      }
    }
    // 2. CONTINUE - Checkpoint Saved / Hyper Dash mini bar above categories
    var bars = document.querySelectorAll("div.relative.rounded-xl.bg-surface-container-high");
    for (var j = 0; j < bars.length; j++) {
      var bt = (bars[j].textContent || "");
      if (bt.indexOf("Checkpoint Saved") !== -1 || bt.indexOf("Hyper Dash") !== -1) {
        bars[j].remove();
        break;
      }
    }
    // 3. TOP BATTLEGROUNDS heading row (title + "N Games Online" count)
    var heads = document.querySelectorAll("h2");
    for (var h = 0; h < heads.length; h++) {
      var ht = (heads[h].textContent || "").toLowerCase();
      if (ht.indexOf("battleground") !== -1) {
        var row = heads[h].closest
          ? heads[h].closest("div.flex.items-center.justify-between")
          : null;
        if (!row && heads[h].parentElement) row = heads[h].parentElement;
        if (row && row.parentElement) row.remove();
        break;
      }
    }
    // 4. Breathing room between sections + category pills
    var st = document.createElement("style");
    st.textContent = "div.px-margin.flex.flex-col.space-y-5 > div{margin-bottom:8px}"
      + "div.flex.items-center.gap-2.overflow-x-auto{column-gap:12px !important}";
    document.head.appendChild(st);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clean);
  } else {
    clean();
  }
})();
</script>`;

// Extra home sections appended below the existing arcade blocks:
// promo banner + Quick Loot card row + 2x2 Game Zones grid.
const HOME_SECTIONS_LOADER = `<script>
(function () {
  var QUICK = [
    { t: "Free Coins", i: "monetization_on", c: "#e79400", b: "rgba(255,185,95,0.14)" },
    { t: "Daily Bonus", i: "card_giftcard", c: "#4cd7f6", b: "rgba(76,215,246,0.14)" },
    { t: "Invites", i: "group_add", c: "#d2bbff", b: "rgba(210,187,255,0.14)" },
    { t: "Missions", i: "track_changes", c: "#7cffa3", b: "rgba(124,255,163,0.14)" }
  ];

  var ZONES = [
    { t: "Quick Match", s: "60s rounds", i: "bolt", slug: "quick-match", bg: "linear-gradient(135deg,#e79400,#472a00)", fg: "#2a1700" },
    { t: "Ranked Ladder", s: "Climb tiers", i: "military_tech", bg: "linear-gradient(135deg,#4cd7f6,#003640)", fg: "#003640" },
    { t: "Boss Raids", s: "Co-op only", i: "shield", slug: "boss-raids", bg: "linear-gradient(135deg,#a78bfa,#25005a)", fg: "#25005a" },
    { t: "Tournaments", s: "Win big", i: "emoji_events", slug: "tournaments", bg: "linear-gradient(135deg,#7cffa3,#0e2414)", fg: "#0e2414" }
  ];

  function icon(name, color, size) {
    return '<span class="material-symbols-outlined" style="font-size:' + (size || 24) + 'px;color:' + color + '">' + name + '</span>';
  }

  function bannerHtml() {
    return '<div class="relative overflow-hidden rounded-xl shadow-xl" style="background:linear-gradient(120deg,rgba(76,215,246,0.22),rgba(96,1,209,0.28) 55%,rgba(17,19,29,0.9));padding:18px">'
      + '<div class="absolute" style="top:-40px;right:-30px;width:130px;height:130px;border-radius:999px;background:rgba(76,215,246,0.22);filter:blur(34px)"></div>'
      + '<div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:14px">'
      + '<div style="display:flex;flex-direction:column;gap:8px;min-width:0">'
      + '<span style="align-self:flex-start;padding:3px 9px;border-radius:999px;background:rgba(76,215,246,0.18);color:#4cd7f6;font-size:10px;font-weight:800;letter-spacing:0.1em">DAILY</span>'
      + '<h3 style="margin:0;font-size:20px;line-height:1.15;font-weight:900;color:#e1e1f0">Daily Missions</h3>'
      + '<p style="margin:0;font-size:12px;color:#bcc9cd">Earn coins &amp; gems daily</p>'
      + '<button type="button" style="align-self:flex-start;margin-top:4px;padding:9px 16px;border-radius:999px;border:none;background:#4cd7f6;color:#003640;font-size:12px;font-weight:800;cursor:pointer">Start Now</button>'
      + '</div>'
      + '<div style="position:relative;width:96px;height:96px;flex-shrink:0">'
      + '<div style="position:absolute;top:0;right:0;width:62px;height:82px;border-radius:12px;background:#0c0e18;transform:rotate(9deg);box-shadow:0 8px 18px rgba(0,0,0,0.4)"></div>'
      + '<div style="position:absolute;top:6px;right:8px;width:62px;height:82px;border-radius:12px;background:#191b26;transform:rotate(9deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 8px 18px rgba(0,0,0,0.4)">'
      + icon("deployed_code", "#4cd7f6", 26) + '<span style="font-size:9px;font-weight:800;color:#869397;letter-spacing:0.08em">SPIN</span></div>'
      + '<div style="position:absolute;bottom:0;left:0;width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6001d1,#a78bfa);display:grid;place-items:center;box-shadow:0 6px 14px rgba(0,0,0,0.4)">' + icon("casino", "#ffffff", 24) + '</div>'
      + '<div style="position:absolute;bottom:4px;right:0;font-size:20px">🪙</div>'
      + '</div></div></div>';
  }

  function quickHtml() {
    var cards = "";
    for (var i = 0; i < QUICK.length; i++) {
      var q = QUICK[i];
      cards += '<div style="flex:0 0 auto;width:112px;border-radius:14px;background:#191b26;padding:12px;display:flex;flex-direction:column;gap:10px">'
        + '<div style="width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:' + q.b + '">' + icon(q.i, q.c, 22) + '</div>'
        + '<p style="margin:0;font-size:11.5px;font-weight:700;color:#e1e1f0;line-height:1.25">' + q.t + '</p>'
        + '</div>';
    }
    return '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="width:8px;height:16px;border-radius:3px;background:#a78bfa"></span>'
      + '<h2 style="margin:0;font-size:17px;font-weight:700;letter-spacing:0.02em;color:#e1e1f0;text-transform:uppercase">Quick Loot</h2>'
      + '</div></div>'
      + '<div class="no-scrollbar" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:4px">' + cards + '</div>'
      + '</div>';
  }

  function zonesHtml() {
    var cards = "";
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      cards += '<div' + (z.slug ? ' data-coming-soon="' + z.slug + '" role="button" tabindex="0" aria-label="' + z.t + ', coming soon"' : '') + ' style="border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;background:' + z.bg + ';color:' + z.fg + ';' + (z.slug ? 'cursor:pointer;' : '') + '">'
        + '<div style="display:flex;align-items:center;justify-content:space-between">'
        + icon(z.i, z.fg, 22) + '<span style="font-size:9px;font-weight:800;letter-spacing:0.06em;opacity:0.75">' + z.s.toUpperCase() + '</span></div>'
        + '<p style="margin:0;font-size:14px;font-weight:900;line-height:1.15">' + z.t + '</p>'
        + '</div>';
    }
    return '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="width:8px;height:16px;border-radius:3px;background:#4cd7f6"></span>'
      + '<h2 style="margin:0;font-size:17px;font-weight:700;letter-spacing:0.02em;color:#e1e1f0;text-transform:uppercase">Game Zones</h2>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">' + cards + '</div>'
      + '</div>';
  }

  function mount() {
    var main = document.querySelector("main");
    if (!main || document.getElementById("gz-home-sections")) return;
    var wrap = document.createElement("div");
    wrap.id = "gz-home-sections";
    wrap.style.gap = "22px";
    wrap.style.padding = "8px 16px 16px";
    // Order: Quick Loot → Daily Missions banner → Game Zones
    wrap.innerHTML = quickHtml() + bannerHtml() + zonesHtml();
    function openComingSoon(target) {
      var slug=target && target.getAttribute("data-coming-soon");
      if(slug) parent.postMessage({type:"playloot:coming-soon",feature:slug},"*");
    }
    wrap.addEventListener("click",function(event){openComingSoon(event.target.closest ? event.target.closest("[data-coming-soon]") : null);});
    wrap.addEventListener("keydown",function(event){if(event.key!=="Enter"&&event.key!==" ")return;var target=event.target.closest ? event.target.closest("[data-coming-soon]") : null;if(target){event.preventDefault();openComingSoon(target);}});
    main.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
</script>`;

// Steam-Profile style header tabs + "Recently Played" poster row on Profile.
const PROFILE_TABS_LOADER = `<script>
(function () {
  var API_URL = "__GAMES_API_URL__";
  var TABS = ["Statistics", "Activity", "Comments"];

  function tabsHtml() {
    var out = '<div id="gz-prof-tabs" style="display:flex;align-items:center;gap:10px;padding:2px 16px 4px">';
    for (var i = 0; i < TABS.length; i++) {
      var active = i === 0;
      out += '<button type="button" data-tab="' + i + '" style="padding:8px 18px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;border:1px solid ' + (active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)") + ';background:' + (active ? "linear-gradient(135deg,#4cd7f6,#7c3aed)" : "rgba(255,255,255,0.05)") + ';color:#fff">' + TABS[i] + '</button>';
    }
    return out + '</div>';
  }

  function posterHtml(g) {
    var img = (g.images && (g.images.tall || g.images.square || g.images.cover)) || "";
    return '<div data-game-url="' + esc(g.url || "") + '" data-game-title="' + esc(g.name || "Game") + '" data-game-id="' + esc(g.code || "") + '" data-game-thumb="' + esc(img) + '" data-game-orientation="' + esc(g.screen_orientation || g.orientation || "portrait") + '" role="button" tabindex="0" style="flex:0 0 auto;width:116px;scroll-snap-align:center">'
      + '<div style="position:relative;width:116px;height:168px;border-radius:14px;overflow:hidden;background:#11131d;box-shadow:0 10px 22px rgba(0,0,0,0.45)">'
      + (img ? '<img src="' + esc(img) + '" alt="' + esc(g.name || "Game") + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' : "")
      + '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.6))"></div>'
      + '<p style="position:absolute;left:8px;right:8px;bottom:8px;margin:0;font-size:11px;font-weight:800;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(g.name || "Game") + '</p>'
      + '</div></div>';
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadPosters(track) {
    var catalog = parent.__playlootGameCatalog;
    function show(list) {
      var html = "";
      for (var i = 0; i < Math.min(8, list.length); i++) html += posterHtml(list[i]);
      track.innerHTML = html;
      bind(track);
    }
    var cached = catalog && catalog.peek(API_URL);
    if (cached) { show(cached); return; }
    var request = catalog
      ? catalog.get(API_URL)
      : (parent.__playlootTrackedFetch || fetch)(API_URL).then(function (r) {
          if (!r.ok) throw new Error("bad");
          return r.json();
        }).then(function (data) { return Array.isArray(data) ? data : (data && data.data) || []; });
    request.then(show).catch(function () {
      track.innerHTML = '<p style="margin:0;font-size:12px;color:#869397">Couldn\\'t load games.</p>';
    });
  }

  function bind(track) {
    function open(el) {
      if (!el) return;
      var url = el.getAttribute("data-game-url");
      if (!url) return;
      parent.postMessage({ type: "playloot:play-game", game: {
        id: el.getAttribute("data-game-id"),
        title: el.getAttribute("data-game-title"),
        playUrl: url,
        thumbnail: el.getAttribute("data-game-thumb"),
        orientation: el.getAttribute("data-game-orientation") || "portrait"
      } }, "*");
    }
    track.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-game-url]") : null;
      if (!el) return;
      e.preventDefault();
      open(el);
    }, true);
    track.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var el = e.target.closest ? e.target.closest("[data-game-url]") : null;
      if (!el) return;
      e.preventDefault();
      open(el);
    }, true);
  }

  function mount() {
    if (document.getElementById("gz-prof-tabs")) return;
    var main = document.querySelector("main");
    if (!main) return;

    var wrap = document.createElement("div");
    wrap.id = "gz-prof-tabs";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "18px";
    wrap.style.padding = "8px 0 16px";

    var recent = document.createElement("div");
    recent.style.display = "flex";
    recent.style.flexDirection = "column";
    recent.style.gap = "12px";
    recent.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px">'
      + '<h2 style="margin:0;font-size:16px;font-weight:800;color:#e1e1f0">Recently Played</h2>'
      + '<span style="font-size:12px;font-weight:700;color:#4cd7f6">View all</span></div>'
      + '<div id="gz-recent-track" class="no-scrollbar" style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 16px 6px"></div>';

    wrap.innerHTML = tabsHtml();
    wrap.appendChild(recent);
    main.insertBefore(wrap, main.firstChild);

    var tabs = wrap.querySelector("#gz-prof-tabs");
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-tab]") : null;
      if (!b) return;
      e.preventDefault();
      var all = tabs.querySelectorAll("[data-tab]");
      for (var i = 0; i < all.length; i++) {
        var on = all[i] === b;
        all[i].style.background = on ? "linear-gradient(135deg,#4cd7f6,#7c3aed)" : "rgba(255,255,255,0.05)";
        all[i].style.borderColor = on ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)";
      }
    });

    var track = wrap.querySelector("#gz-recent-track");
    track.innerHTML = '<div style="width:116px;height:168px;border-radius:14px;background:linear-gradient(100deg,#1b1b2e 20%,#2a2a46 40%,#1b1b2e 60%);background-size:200% 100%;animation:gzShimmerP 1.4s ease-in-out infinite"></div>';
    var st = document.createElement("style");
    st.textContent = "@keyframes gzShimmerP{0%{background-position:200% 0}100%{background-position:-200% 0}}";
    document.head.appendChild(st);
    loadPosters(track);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
</script>`;
const BENTO_LOADER = `<script>
(function () {
  var SCREEN = "__SCREEN_NAME__";

  var CONFIG = {
    profile: {
      title: "Your Stats",
      cards: [
        { i: "sports_esports", l: "Games Played", v: "345", hi: true },
        { i: "military_tech", l: "Current Rank", v: "#142" },
        { i: "local_fire_department", l: "Best Streak", v: "12" },
        { i: "trophy", l: "Top 10 Finishes", v: "27" }
      ],
      strip: { title: "Quest Progress", a: ["Completed", "28"], b: ["Nearly Done", "6"], c: ["Locked", "14"] }
    },
    cashout: {
      title: "Cashout Summary",
      cards: [
        { i: "payments", l: "Total Received", v: "₹10,326", hi: true },
        { i: "redeem", l: "Total Redeemed", v: "₹4,200" },
        { i: "card_giftcard", l: "Gift Cards", v: "28" },
        { i: "hourglass_top", l: "Pending", v: "1" }
      ],
      strip: { title: "Payout Status", a: ["Completed", "18"], b: ["Processing", "2"], c: ["Failed", "1"] }
    }
  };

  function icon(name, color, size) {
    return '<span class="material-symbols-outlined" style="font-size:' + (size || 24) + 'px;color:' + color + '">' + name + '</span>';
  }

  function cardHtml(c) {
    var bg = c.hi
      ? "linear-gradient(135deg,#4cd7f6,#0d7f96 60%,#06b6d4)"
      : "linear-gradient(140deg,#1d1f2a,#11131d)";
    var fg = c.hi ? "#003640" : "#e1e1f0";
    var muted = c.hi ? "rgba(0,54,64,0.7)" : "#869397";
    var tile = c.hi ? "rgba(255,255,255,0.22)" : "rgba(76,215,246,0.12)";
    return '<div class="pl-stat-card" style="border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;background:' + bg + ';box-shadow:0 8px 20px rgba(0,0,0,0.35);min-height:118px">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between">'
      + '<div style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:' + tile + '">' + icon(c.i, fg, 22) + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:2px;margin-top:auto">'
      + '<span style="font-size:11px;font-weight:600;color:' + muted + '">' + c.l + '</span>'
      + '<span style="font-size:20px;font-weight:900;line-height:1.1;color:' + fg + '">' + c.v + '</span>'
      + '</div></div>';
  }

  function stripHtml(s) {
    function item(color, label, value) {
      return '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">'
        + '<span style="width:20px;height:20px;border-radius:999px;display:grid;place-items:center;background:' + color + ';color:#11131d;font-size:11px;font-weight:900">✓</span>'
        + '<span style="display:flex;flex-direction:column;line-height:1.15;min-width:0">'
        + '<span style="font-size:10.5px;color:#869397;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + label + '</span>'
        + '<span style="font-size:13px;font-weight:900;color:#e1e1f0">' + value + '</span>'
        + '</span></div>';
    }
    return '<div style="border-radius:16px;background:#191b26;padding:14px;display:flex;flex-direction:column;gap:12px">'
      + '<p style="margin:0;font-size:15px;font-weight:800;color:#e1e1f0">' + s.title + '</p>'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + item("#4ade80", s.a[0], s.a[1])
      + item("#e79400", s.b[0], s.b[1])
      + item("#ff4d4d", s.c[0], s.c[1])
      + '</div></div>';
  }

  function mount() {
    var cfg = CONFIG[SCREEN];
    if (!cfg) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("gz-bento-" + SCREEN)) return;

    var cards = "";
    for (var i = 0; i < cfg.cards.length; i++) cards += cardHtml(cfg.cards[i]);

    var wrap = document.createElement("div");
    wrap.id = "gz-bento-" + SCREEN;
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "18px";
    wrap.style.padding = "8px 16px 16px";
    wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="width:8px;height:16px;border-radius:3px;background:#4cd7f6"></span>'
      + '<h2 style="margin:0;font-size:17px;font-weight:700;letter-spacing:0.02em;color:#e1e1f0;text-transform:uppercase">' + cfg.title + '</h2>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">' + cards + '</div>'
      + '</div>'
      + stripHtml(cfg.strip);
    main.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
</script>`;

// Trims wordy microcopy on every screen: removes fluff blocks and shortens
// long labels. Innermost-first + size budgets so only small text blocks go.
const DECLUTTER_LOADER = `<script>
(function () {
  var SCREEN = "__SCREEN_NAME__";

  function removeBlock(needle, maxLen, budget) {
    maxLen = maxLen || 160; budget = (budget == null ? 40 : budget);
    needle = needle.toLowerCase();
    var els = document.querySelectorAll("span, p, div, small, h4, h5, li");
    for (var i = els.length - 1; i >= 0; i--) {
      var t = (els[i].textContent || "");
      if (!t || t.toLowerCase().indexOf(needle) === -1) continue;
      if (t.length > maxLen) continue;
      var node = els[i];
      while (node.parentElement && node.parentElement.closest) {
        var p = node.parentElement;
        var pt = (p.textContent || "");
        if (p.tagName === "MAIN" || p.tagName === "BODY") break;
        if (pt.length > maxLen || pt.length - t.length > budget) break;
        if (p.querySelector("nav")) break;
        node = p;
      }
      node.remove();
      return true;
    }
    return false;
  }

  function shorten(needle, replacement) {
    var els = document.querySelectorAll("span, p, h1, h2, h3, h4, h5, small");
    var nl = needle.toLowerCase();
    for (var i = els.length - 1; i >= 0; i--) {
      var el = els[i];
      if (el.children && el.children.length > 0) continue;
      var t = (el.textContent || "");
      if (!t || t.length > 120) continue;
      var at = t.toLowerCase().indexOf(nl);
      if (at === -1) continue;
      el.textContent = t.slice(0, at) + replacement + t.slice(at + needle.length);
      return true;
    }
    return false;
  }

  var RANKS_RULES = [
    ["r", "next match cycle", 160, 10],
    ["r", "this week", 160, 8],
    ["r", "top 1.2%", 160, 8],
    ["r", "master tier (325", 200, 80],
    ["r", "rulebook", 200, 80],
    ["r", "live sync", 160, 8],
    ["s", "Points to Next Tier", "Next Tier"],
    ["s", "MY STANDING", "YOU"]
  ];

  var RULES = {
    cashout: [
      ["r", "min. threshold"],
      ["r", "auto-routing active", 160, 8],
      ["r", "instant transfer", 160, 10],
      ["r", "web3 on-chain", 160, 10],
      ["r", "digital code key", 160, 10],
      ["r", "apple / google pay", 160, 10],
      ["r", "automated escrow"],
      ["r", "hours logged", 120, 12],
      ["s", "Total Redeemable Loot", "Available Loot"]
    ],
    leaderboard: RANKS_RULES,
    globalLeaderboard: RANKS_RULES,
    profile: [
      ["r", "[neon_elite]", 160, 8],
      ["r", "competing", 160, 8],
      ["r", "verified balance", 160, 8],
      ["r", "premium store", 160, 8],
      ["r", "420 matches", 160, 8],
      ["r", "total runs", 160, 8],
      ["s", "Career Win Rate", "Win Rate"],
      ["s", "Games Completed", "Games"],
      ["s", "Career Cash Prize Pool", "Prize Pool"]
    ]
  };

  // Whole blocks stripped by the user: [selector, text it must contain]
  var STRIP = {
    leaderboard: [["div.flex.items-center.gap-2.overflow-x-auto", "Global"]],
    globalLeaderboard: [["div.flex.items-center.gap-2.overflow-x-auto", "Global"]],
    cashout: [["div.flex.flex-col.gap-space-xs", "Payout Gateways"]],
    profile: [["section", "Battle Telemetry"]]
  };

  function stripBlock(sel, needle) {
    var list = document.querySelectorAll(sel);
    var n = needle.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if ((list[i].textContent || "").toLowerCase().indexOf(n) === -1) continue;
      if (!list[i].parentElement) continue;
      list[i].remove();
      return true;
    }
    return false;
  }

  function stripGemChip() {
    var chips = document.querySelectorAll("div.flex.items-center.gap-1");
    for (var i = 0; i < chips.length; i++) {
      var html = chips[i].innerHTML || "";
      if (html.indexOf(">diamond<") !== -1 && (chips[i].textContent || "").indexOf("350") !== -1) {
        if (chips[i].parentElement) { chips[i].remove(); return true; }
      }
    }
    return false;
  }

  // Small corner/amount pills on cards: [selector, text it must contain]
  var BADGES = {
    cashout: [
      ["span[class*='px-1.5'][class*='rounded-lg'][class*='bg-surface-container-lowest']", ""],
      ["div[class*='px-2'][class*='rounded-lg'][class*='bg-surface-container-lowest']", "tier"],
      ["span[class*='px-2'][class*='rounded-lg'][class*='bg-surface-container-lowest']", "+$"]
    ],
    profile: [
      ["div[class*='flex-col'][class*='items-end'][class*='gap-0.5']", "+"]
    ],
    leaderboard: [
      ["div[class*='items-end'][class*='flex-shrink-0']", "$"]
    ],
    globalLeaderboard: [
      ["div[class*='items-end'][class*='flex-shrink-0']", "$"]
    ]
  };

  // Leaf nodes whose whole text matches a pattern (e.g. "72% Win").
  var TEXT_RULES = {
    leaderboard: [/^\\d{1,3}\\s*%\\s*Win$/i],
    globalLeaderboard: [/^\\d{1,3}\\s*%\\s*Win$/i]
  };

  function stripText(patterns) {
    if (!patterns) return;
    var els = document.querySelectorAll("span, p, small, div");
    for (var i = els.length - 1; i >= 0; i--) {
      var el = els[i];
      if (el.children && el.children.length > 0) continue;
      var t = (el.textContent || "").trim();
      if (!t || t.length > 24) continue;
      for (var p = 0; p < patterns.length; p++) {
        if (patterns[p].test(t) && el.parentElement) { el.remove(); break; }
      }
    }
  }

  function stripBadges(list) {
    if (!list) return;
    for (var r = 0; r < list.length; r++) {
      var sel = list[r][0], needle = list[r][1].toLowerCase();
      var nodes;
      try { nodes = document.querySelectorAll(sel); } catch (e) { continue; }
      for (var i = nodes.length - 1; i >= 0; i--) {
        var t = (nodes[i].textContent || "").trim();
        if (t.length > 24) continue;
        if (needle && t.toLowerCase().indexOf(needle) === -1) continue;
        if (nodes[i].parentElement) nodes[i].remove();
      }
    }
  }

  function run() {
    stripBadges(BADGES[SCREEN]);
    stripText(TEXT_RULES[SCREEN]);
    var strips = STRIP[SCREEN];
    if (strips) {
      for (var s = 0; s < strips.length; s++) stripBlock(strips[s][0], strips[s][1]);
    }
    if (SCREEN === "leaderboard" || SCREEN === "globalLeaderboard") stripGemChip();
    var list = RULES[SCREEN];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i][0] === "r") removeBlock(list[i][1], list[i][2], list[i][3]);
      else shorten(list[i][1], list[i][2]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
</script>`;

export default function StitchFrame({ screen }) {
  const appConfig = useAppConfig();
  const wallet = useWallet();
  const navigate = useNavigate();
  const frameRef = useRef(null);
  const [adHost, setAdHost] = useState(null);
  const [loadedScreen, setLoadedScreen] = useState(null);
  const [readyScreen, setReadyScreen] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [spinOpen, setSpinOpen] = useState(false);
  const selectedScreen = SCREENS[screen] || SCREENS.arcade;

  useEffect(() => {
    if (readyScreen === screen) return;
    const finish = beginLoading('Preparing ' + screen);
    return () => finish();
  }, [screen, readyScreen]);

  useEffect(()=>{
    frameRef.current?.contentWindow?.postMessage({type:'playloot:wallet-sync',wallet:wallet.data},'*');
  },[wallet.data,readyScreen]);

  useEffect(() => {
    let active = true;
    setLoadedScreen(null);
    setReadyScreen(null);
    setActiveGame(null);
    setSpinOpen(false);
    selectedScreen.load().then(({ default: screenHtml }) => {
      if (active) setLoadedScreen({ screen, html: screenHtml });
    }).catch(() => {
      if (active) setLoadedScreen({ screen, html: "<body><p style='color:#fff;font-family:sans-serif;padding:24px'>Couldn't load this screen. Tap retry.</p></body>" });
    });
    return () => {
      active = false;
    };
  }, [screen, selectedScreen]);

  const html = loadedScreen?.screen === screen ? loadedScreen.html : "";
  const srcDoc = useMemo(() => html
    ? (() => {
        const loader =
          screen === "arcade"
            ? GAME_GRID_LOADER.replace("__GAMES_API_URL__", GAMES_API_URL)
                .replace("__APP_CONFIG__", () => JSON.stringify(appConfig).replace(/</g,'\\u003c')) +
              SPIN_LOADER +
              UI_CLEANUP_LOADER +
              HOME_SECTIONS_LOADER +
              `<script>(${enhanceArcade.toString()})(${JSON.stringify(FEATURED_GAMES).replace(/</g,'\\u003c')},${JSON.stringify(appConfig).replace(/</g,'\\u003c')},${JSON.stringify(GAMES_API_URL)});(${installCoverMotion.toString()})();</script>`
            : "";
        const declutter = DECLUTTER_LOADER.replace("__SCREEN_NAME__", screen);
        const bento =
          screen === "profile" || screen === "cashout"
            ? BENTO_LOADER.replace("__SCREEN_NAME__", screen) +
              (screen === "profile"
                ? PROFILE_TABS_LOADER.replace("__GAMES_API_URL__", GAMES_API_URL)
                : "")
            : "";
        const live = LIVE_DATA_LOADER.replace("__SESSION_TOKEN__", JSON.stringify(getToken() || ""))
          .replace("__SCREEN_NAME__", JSON.stringify(screen))
          .replace("__BACKEND_URL__", JSON.stringify(BACKEND_URL));
        const ready = `<script>document.addEventListener("DOMContentLoaded", function () { parent.postMessage({ type: "playloot:screen-ready", screen: ${JSON.stringify(screen)} }, "*"); });</script>`;
        const combined = `${NAVIGATION_BRIDGE}${loader}${bento}${declutter}${live}${SPACING_LOADER}<style>${stitchUtilityCss}\n${polishCss}\n${responsiveFrameCss}</style><script>(${finishScreen.toString()})(${JSON.stringify(screen)},${JSON.stringify(referenceArtwork)});</script>${ready}`;
        const selfHostedHtml=html
          .replace(/<script\s+src=["']https:\/\/cdn\.tailwindcss\.com["']><\/script>/i,'')
          .replace(/<script\s+id=["']tailwind-config["']>[\s\S]*?<\/script>/i,'');
        const themedHtml = selfHostedHtml.replace("</head>", '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"></head>');
        return themedHtml.includes("</body>")
          ? themedHtml.replace("</body>", `${combined}</body>`)
          : `${themedHtml}${combined}`;
      })()
    : undefined, [html, screen, appConfig]);

  useEffect(() => {
    const allowedPaths = new Set([...Object.values(ROUTES), "/all-games?source=grogames"]);
    const handleMessage = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "playloot:screen-ready" && event.data.screen === screen) {
        setReadyScreen(screen);
        return;
      }
      if (event.data?.type === "playloot:navigate" && allowedPaths.has(event.data.path)) {
        setActiveGame(null);
        setSpinOpen(false);
        navigate(event.data.path);
      } else if (event.data?.type === "playloot:coming-soon" && ['quick-match','boss-raids','tournaments'].includes(event.data.feature)) {
        navigate(`/coming-soon/${event.data.feature}`);
        return;
      }
      if (event.data?.type === "playloot:spin-open") {
        setSpinOpen(true);
        return;
      }
      if (event.data?.type === "playloot:play-game" && event.data.game?.playUrl) {
        let playUrl;
        try{playUrl=new URL(event.data.game.playUrl,window.location.href);const localGame=event.data.game.embedded===true&&playUrl.origin===window.location.origin&&playUrl.pathname.startsWith('/grogames/');if((playUrl.protocol!=='https:'&&!localGame)||playUrl.username||playUrl.password)return;}catch{return;}
        setActiveGame({
          id: event.data.game.id || event.data.game.playUrl,
          title: event.data.game.title || "Game",
          playUrl: playUrl.href,
          embedded: event.data.game.embedded === true,
          thumbnail: event.data.game.thumbnail || "",
          orientation: event.data.game.orientation || "portrait",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, screen]);

  return (
    <main
      className="stitch-shell"
      style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", background: "#0e1017" }}
    >
      <iframe
        key={screen}
        ref={frameRef}
        className="stitch-shell__frame"
        title={selectedScreen.title}
        srcDoc={srcDoc}
        onLoad={() => {
          const doc = frameRef.current?.contentDocument;
          if (screen !== 'arcade' || !doc?.querySelector('main')) { setAdHost(null); return; }
          const host = doc.createElement('div');
          host.dataset.adSlot = 'arcade';
          doc.querySelector('main').prepend(host);
          setAdHost(host);
          frameRef.current?.contentWindow?.postMessage({type:'playloot:wallet-sync',wallet:wallet.data},'*');
        }}
        style={{ display: "block", width: "min(100vw, 440px)", height: "100dvh", border: 0, background: "#0e1017", visibility: readyScreen === screen ? "visible" : "hidden" }}
      />
      {screen === 'arcade' && adHost && createPortal(<><DesktopExtras/><AdPlacement slot="arcade"/></>, adHost)}
      <GameWebViewOverlay game={activeGame} onClose={() => setActiveGame(null)} />
      {spinOpen && <SpinWheel onClose={() => setSpinOpen(false)} />}
    </main>
  );
}
