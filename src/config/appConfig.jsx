import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BACKEND_URL } from "../utils/api";
import { clearGameCatalog } from '../utils/gameCatalog';
import { trackedFetch } from '../utils/loading';

export const DEFAULT_APP_CONFIG = {
  version: 1,
  branding: { appName: "PLAYLOOT", lootLabel: "Your Loot", lootIcon: "redeem", lootIconUrl: "", lootBackgroundColor: "#4cd7f6", lootTextColor: "#071016", accent: "#4cd7f6", highlight: "#d4ff3e" },
  navigation: {
    enabled: true,
    items: [
      { id: "arcade", label: "Arcade", icon: "sports_esports", enabled: true },
      { id: "ranks", label: "Ranks", icon: "leaderboard", enabled: true },
      { id: "loot", label: "Loot", icon: "redeem", enabled: true },
      { id: "profile", label: "Profile", icon: "badge", enabled: true },
    ],
  },
  components: {
    buttons: {
      featuredPlay: { title: "Play now", icon: "play_arrow", iconUrl: "", backgroundColor: "#4cd7f6", textColor: "#071016" },
      dailySpin: { title: "Open Lucky Spin", icon: "casino", iconUrl: "", backgroundColor: "#ffffff", textColor: "#39206d" },
      exploreGames: { title: "Explore games", icon: "arrow_forward", iconUrl: "", backgroundColor: "#ffffff", textColor: "#193c55" },
      viewRankings: { title: "View rankings", icon: "arrow_forward", iconUrl: "", backgroundColor: "#ffffff", textColor: "#503817" },
    },
  },
  screens: {
    allGames: { grid: { limit: 0 } },
    arcade: {
      enabled: true,
      sections: { hero: true, featuredCarousel: true, categories: true, gameGrid: true, missions: true, offers: true },
      carousel: { enabled: true, count: 5, selectedGameIds: [] },
      groGames: { enabled: true, limit: 0 },
      categories: { enabled: true, selected: [] },
      grid: { enabled: true, limit: 24, categories: [], providers: [] },
    },
    ranks: { enabled: true, sections: { leaderboard: true } },
    loot: { enabled: true, sections: { balance: true, daily: true, rewards: true, redeem: true } },
    profile: { enabled: true, sections: { identity: true, stats: true, recentGames: true, notifications: true, settings: true } },
  },
};

function merge(base, incoming) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return base;
  const result = { ...base, ...incoming };
  for (const key of Object.keys(base)) {
    if (base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) result[key] = merge(base[key], incoming[key]);
  }
  return result;
}

const ConfigContext = createContext(DEFAULT_APP_CONFIG);

export function AppConfigProvider({ children }) {
  const [remote, setRemote] = useState(null);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await trackedFetch(`${BACKEND_URL}/api/app-config?platform=${Capacitor.isNativePlatform() ? "apk" : "web"}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (active && data?.config) setRemote(previous => {
          const next = {...data.config, catalogRevision:data.catalogRevision};
          if (JSON.stringify(previous) === JSON.stringify(next)) return previous;
          clearGameCatalog();
          return next;
        });
      } catch {} finally { pending = false; }
    };
    void refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
  }, []);
  const value = useMemo(() => {
    const next = merge(DEFAULT_APP_CONFIG, remote);
    next.screens.arcade = {...next.screens.arcade, grid:{...next.screens.arcade.grid,enabled:false},carousel:{...next.screens.arcade.carousel,sources:['grogames']}};
    return next;
  }, [remote]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--pms-accent", value.branding?.accent || DEFAULT_APP_CONFIG.branding.accent);
    root.style.setProperty("--pms-highlight", value.branding?.highlight || DEFAULT_APP_CONFIG.branding.highlight);
    document.title = value.branding?.appName || DEFAULT_APP_CONFIG.branding.appName;
  }, [value]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useAppConfig() { return useContext(ConfigContext); }
