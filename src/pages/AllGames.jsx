import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, Search, AlertTriangle, RefreshCw } from "lucide-react";
import GameWebViewOverlay from "../components/timer/GameWebViewOverlay";
import { API_ENDPOINTS, mapApiGame } from "../utils/api";
import { getGameCatalog, peekGameCatalog } from "../utils/gameCatalog";
import "../styles/arcade-catalog.css";
import "../styles/resource.css";
import { useAppConfig } from "../config/appConfig";
import {installCoverMotion} from '../utils/coverMotion';

const SKELETON_COUNT = 12;
const GROGAMES_MANIFEST = "/grogames/manifest.json";

function mapGroGame(game) {
  return {
    id: game.id,
    title: game.title,
    description: `${game.category || "Arcade"} · Play instantly`,
    category: game.category || "Arcade",
    tag: game.provider || "GroGames",
    providerId: game.providerId || "grogames",
    orientation: game.orientation || "portrait",
    thumbnail: game.cover,
    playUrl: new URL(game.path, window.location.origin).href,
    embedded: true,
  };
}

const styles = {
  page: {
    backgroundColor: "#07080f",
    minHeight: "100dvh",
    width: "100%",
    maxWidth: "960px",
    margin: "0 auto",
    padding: "12px 16px 32px",
    fontFamily:
      "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 2,
    margin: "-12px -16px 14px",
    padding: "12px 16px",
    gap: "10px",
    background: "rgba(10,13,26,0.96)",
    borderBottom: "1px solid #262d4a",
    backdropFilter: "blur(12px)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  backBtn: {
    color: "#e1e1f0",
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #273054",
    borderRadius: "10px",
    background: "#13172c",
    cursor: "pointer",
    padding: 0,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 800,
    margin: 0,
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerSubtitle: {
    color: "#869397",
    fontSize: "11px",
    margin: "4px 0 0",
  },
  gameCountBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 7px",
    border: "1px solid rgba(76,215,246,0.3)",
    borderRadius: "999px",
    background: "rgba(6,182,212,0.12)",
    color: "#4cd7f6",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  gameCountDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#4cd7f6",
  },
  retryBtn: {
    color: "#4cd7f6",
    fontSize: "13px",
    fontWeight: 700,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  },
  refreshBtn: {
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #33384b",
    background: "#1b1e2a",
    color: "#4cd7f6",
    cursor: "pointer",
  },
  searchWrap: {
    position: "relative",
    marginBottom: "14px",
  },
  searchIcon: {
    position: "absolute",
    left: "13px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#869397",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px 12px 40px",
    borderRadius: "10px",
    border: "1px solid #262d4a",
    backgroundColor: "#111424",
    color: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },
  categoryRow: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "8px",
    marginBottom: "16px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  categoryChip: (active) => ({
    flexShrink: 0,
    padding: "7px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    border: active ? "1px solid #06b6d4" : "1px solid #262d4a",
    backgroundColor: active ? "rgba(6,182,212,0.16)" : "#111424",
    color: active ? "#acedff" : "#bcc9cd",
    fontFamily: "inherit",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 164px), 1fr))",
    gap: "14px",
  },
  card: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1.12",
    padding: "1px",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    background: "linear-gradient(145deg, #4cd7f6, #26344b 35%, #171a2c 100%)",
    borderRadius: "10px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
    transition: "transform 0.12s ease",
    margin: "0 0 2px 0",
  },
  cardInner: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0c0e18",
    border: "1px solid #191b26",
    borderRadius: "9px",
  },
  cardHeader: {
    minHeight: "32px",
    padding: "7px 9px 5px",
    color: "white",
    background: "#111424",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "left",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardArtwork: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    margin: "0 7px",
    marginBottom: "4px",
    overflow: "hidden",
    background: "#10121e",
    borderLeft: "1px solid #262d4a",
    borderRight: "1px solid #262d4a",
    borderRadius: "6px",
  },
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  cardScrim: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(4,7,16,0.02), rgba(4,7,16,0.34))",
    pointerEvents: "none",
  },
  cardFooter: {
    minHeight: "40px",
    margin: "0 7px 10px",
    padding: "8px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flexWrap: "wrap",
    background: "linear-gradient(180deg, #070912, #03040a)",
  },
  tag: {
    padding: "3px 9px",
    borderRadius: "999px",
    backgroundColor: "rgba(212,255,62,0.12)",
    border: "1px solid rgba(212,255,62,0.35)",
    color: "#d4ff3e",
    fontSize: "9.5px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  tagDim: {
    padding: "3px 9px",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid #2c2c46",
    color: "#9494b0",
    fontSize: "9.5px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  playBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#4cd7f6",
    color: "#003640",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    paddingLeft: "2px",
    boxShadow: "0 0 0 5px rgba(76,215,246,0.14), 0 4px 10px rgba(0,0,0,0.4)",
    pointerEvents: "none",
  },
  skeleton: {
    width: "100%",
    aspectRatio: "1 / 1.12",
    borderRadius: "10px",
    backgroundImage:
      "linear-gradient(100deg, #1b1b2e 20%, #2a2a46 40%, #1b1b2e 60%)",
    backgroundSize: "200% 100%",
    animation: "allGamesShimmer 1.4s ease-in-out infinite",
  },
  errorBox: {
    color: "#f4b8b1",
    fontSize: "13px",
    padding: "16px",
    textAlign: "center",
    border: "1px solid rgba(255,180,171,0.24)",
    borderRadius: "10px",
    background: "rgba(147,0,10,0.12)",
  },
  emptyBox: {
    color: "#bcc9cd",
    fontSize: "13px",
    padding: "40px 4px",
    textAlign: "center",
  },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap');
  .all-games-categories::-webkit-scrollbar { display: none; }
  @keyframes allGamesShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .all-game-card:active { transform: scale(0.94); }
`;

function GameCardSkeleton() {
  return <div style={styles.skeleton} aria-hidden="true" />;
}

function GameCard({ game, onSelect }) {
  return (
    <div
      className="all-game-card"
      style={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(game)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(game);
        }
      }}
    >
      <div className="catalog-card-inner" style={styles.cardInner}>
        <div className="catalog-card-title" style={styles.cardHeader}>{game.title}</div>
        <div className="catalog-card-art" style={styles.cardArtwork}>
            <img src={game.thumbnail || "/images/game-fallback.svg"} alt={game.title} style={styles.cardImg} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/game-fallback.svg"; }} />
          <div style={styles.cardScrim} />
          <span className="catalog-play" style={styles.playBadge} aria-hidden="true">▶</span>
        </div>
        <div className="catalog-card-meta" style={styles.cardFooter}>
          <span className="catalog-tag" style={styles.tag}>{game.category || game.tag || "Arcade"}</span>
          <span className="catalog-instant">Instant play ↗</span>
        </div>
      </div>
    </div>
  );
}

export default function AllGames({ title = "All Games" }) {
  useEffect(() => installCoverMotion(), []);
  const appConfig = useAppConfig();
  const arcadeConfig = appConfig.screens?.arcade || {};

  const source = "grogames";
  const cachedGamezop = source === "gamezop" ? peekGameCatalog(API_ENDPOINTS.games) : null;
  const [allGames, setAllGames] = useState(() => (cachedGamezop || []).map(mapApiGame));
  const [status, setStatus] = useState(() => cachedGamezop ? "success" : "loading");
  const [error, setError] = useState(null);
  // Tracks "do we have a catalog on screen", independent of the status string.
  const hasLoadedRef = useRef(Boolean(cachedGamezop));
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeGame, setActiveGame] = useState(null);
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get('game');

  const navigate = useNavigate();
  const pageTitle = title !== "All Games" ? title : source === "grogames" ? "GroGames" : "Gamezop Games";

  const fetchGames = useCallback((forceRefresh = false) => {
    let cancelled = false;
    // A refresh must not wipe the catalog the player is already browsing.
    setStatus(hasLoadedRef.current ? "refreshing" : "loading");

    const request = source === "grogames"
      ? fetch(GROGAMES_MANIFEST, { cache: forceRefresh ? "reload" : "default" }).then((response) => {
          if (!response.ok) throw new Error(`GroGames catalog returned ${response.status}`);
          return response.json();
        })
      : getGameCatalog(API_ENDPOINTS.games, forceRefresh);

    request
      .then((rawGames) => {
        if (cancelled) return;
        const games = rawGames.map(source === "grogames" ? mapGroGame : mapApiGame);
        hasLoadedRef.current = true;
        setAllGames(games);
        setStatus("success");
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load games:", err);
        setError(err.message || "Couldn't refresh the catalog.");
        // Decide from whether we actually have a catalog to show, not from the
        // status string: by now it may already read "refreshing".
        setStatus(hasLoadedRef.current ? "stale" : "error");
      });

    return () => { cancelled = true; };
  }, [source]);

  useEffect(() => {
    const cleanup = fetchGames();
    return cleanup;
  }, [fetchGames, appConfig.catalogRevision]);

  const categories = useMemo(() => {
    const set = new Set();
    allGames.forEach((g) => g.category && set.add(g.category));
    const selected = source === 'grogames' ? [] : arcadeConfig.categories?.selected || [];
    const available = Array.from(set).sort().filter((category) => !selected.length || selected.includes(category));
    return ["All", ...available];
  }, [allGames, arcadeConfig.categories?.selected, source]);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    const configuredCategories = source === 'grogames' ? [] : arcadeConfig.grid?.categories || [];
    const configuredProviders = arcadeConfig.grid?.providers || [];
    // View all originals must not inherit the provider catalog or Arcade preview cap.
    const configuredLimit = Number(source === 'grogames' ? (appConfig.screens?.allGames?.grid?.groGamesLimit ?? 0) : (appConfig.screens?.allGames?.grid?.gamezopLimit ?? appConfig.screens?.allGames?.grid?.limit ?? 0));
    const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? Math.floor(configuredLimit) : undefined;
    return allGames.filter((g) => {
      if (configuredCategories.length && !configuredCategories.includes(g.category)) return false;
      if (source === "gamezop" && configuredProviders.length && !configuredProviders.includes(g.providerId)) return false;
      const matchesCategory = activeCategory === "All" || g.category === activeCategory;
      const matchesQuery =
        !q ||
        g.title?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q) ||
        g.tag?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    }).slice(0, limit);
  }, [allGames, query, activeCategory, arcadeConfig.grid, appConfig.screens?.allGames?.grid, source]);

  const handleSelectGame = useCallback((game) => {
    let url;
    try {
      url = new URL(game.playUrl, window.location.origin);
      const isLocalGroGame = game.embedded === true && url.origin === window.location.origin && url.pathname.startsWith("/grogames/");
      if ((!isLocalGroGame && url.protocol !== "https:") || url.username || url.password) return;
    } catch { return; }
    if (!Capacitor.isNativePlatform() && game.embedded !== true) {
      window.open(url.href, "_blank", "noopener,noreferrer");
    }
    setActiveGame({ ...game, playUrl: url.href });
  }, []);

  useEffect(() => {
    if (!requestedGameId || activeGame || status !== 'success') return;
    const requested = allGames.find(game => game.id === requestedGameId);
    if (requested) handleSelectGame(requested);
  }, [requestedGameId, activeGame, status, allGames, handleSelectGame]);

  return (
    <div className="arcade-catalog" style={styles.page}>
      <style>{globalCSS}</style>

      <div className="catalog-header" style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => navigate("/Home")}
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <div>
            <div style={styles.headerTitleRow}>
              <h1 style={styles.headerTitle}>{pageTitle}</h1>
              <span style={styles.gameCountBadge}>
                <span style={styles.gameCountDot} aria-hidden="true" />
                {status === "loading" ? "Loading" : `${allGames.length} games`}
              </span>
            </div>
            <p style={styles.headerSubtitle}>{source === "grogames" ? "Original games made for Playloot." : "Instant games from Gamezop."}</p>
          </div>
        </div>

        {status !== "error" && (
          <button
            type="button"
            style={styles.refreshBtn}
            onClick={() => fetchGames(true)}
            aria-label="Refresh games"
            disabled={status === "loading" || status === "refreshing"}
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              style={{
                display: "block",
                animation: status === "refreshing" ? "spin 0.9s linear infinite" : undefined,
              }}
            />
          </button>
        )}

        {status === "error" && (
          <button type="button" style={styles.retryBtn} onClick={fetchGames}>
            Retry
          </button>
        )}
      </div>

      {status !== "error" && arcadeConfig.sections?.gameGrid !== false && (
        <div className="catalog-search" style={styles.searchWrap}>
          <Search size={16} style={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={source === "grogames" ? "Search GroGames" : "Search Gamezop games"}
            style={styles.searchInput}
            aria-label="Search games"
          />
        </div>
      )}

      {arcadeConfig.categories?.enabled !== false && arcadeConfig.sections?.categories !== false && (status === "success" || status === "stale") && categories.length > 1 && (
        <div className="all-games-categories" style={styles.categoryRow}>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              style={styles.categoryChip(activeCategory === cat)}
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {status === "error" ? (
        <div style={styles.errorBox}>
          Couldn't load games right now. Tap retry to try again.
        </div>
      ) : (
        <>
          {status === "stale" && (
            <div className="resource-banner" role="status">
              <AlertTriangle size={15} aria-hidden="true" className="resource-banner__icon" />
              <span className="resource-banner__text">
                {error || "Couldn't refresh the catalog."} Showing the games we already have.
              </span>
              <button type="button" className="resource-banner__action" onClick={fetchGames}>
                <RefreshCw size={13} aria-hidden="true" /> Retry
              </button>
            </div>
          )}

          <div className="catalog-grid" style={styles.grid}>
            {status === "loading"
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))
              : filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                ))}
          </div>
        </>
      )}

      {(status === "success" || status === "stale") && filteredGames.length === 0 && (
        <div style={styles.emptyBox}>No games match your search.</div>
      )}

      <GameWebViewOverlay
        game={activeGame}
        onClose={() => setActiveGame(null)}
      />
    </div>
  );
}
