/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from "react";
import GameWebViewOverlay from "../components/timer/GameWebViewOverlay";

const FEATURED_COUNT = 10; 
const SKELETON_COUNT = 6;

export function mapApiGame(raw) {
  return {
    id: raw.code,
    title: raw.name,
    description: raw.description,
    category: raw.category?.name,
    thumbnail: raw.images?.square || raw.images?.thumb || raw.images?.cover,
    playUrl: raw.url,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Styles ---------------------------------------------------------------
const styles = {
  section: {
    backgroundColor: "#10101c",
    padding: "16px 12px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: "30px",
    marginTop: "15px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px 6px 6px",
    background: "linear-gradient(145deg, #1a4a2b 20%, #0e2414 65%, #060f07 100%)",
    border: "1px solid rgba(60,140,90,0.3)",
    clipPath: "polygon(5% 0, 100% 0, 96% 100%, 0 100%)",
    boxShadow: "4px 4px 0 #050606, 0 0 16px rgba(26,74,43,0.55)",
    transform: "skewY(-1deg)",
  },
  headerIcon: {
    width: "27px",
    height: "26px",
    display: "grid",
    placeItems: "center",
    fontSize: "17px",
    lineHeight: 1,
    color: "#7cffa3",
    background: "#080a09",
    clipPath: "polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)",
  },
  headerTitle: {
    color: "#eafff0",
    fontFamily: "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif",
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "0.02em",
    lineHeight: 2,
    textTransform: "uppercase",
    margin: 0,
  },
  retryBtn: {
    color: "#7cffa3",
    fontSize: "13px",
    fontWeight: 700,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    position: "absolute",
    right: 0,
  },  scrollRow: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    paddingBottom: "6px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitOverflowScrolling: "touch",
    scrollSnapType: "x proximity",
  },
  card: {
    position: "relative",
    flexShrink: 0,
    width: "140px",
    height: "222px",
    padding: "1px",
    scrollSnapAlign: "start",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    background: "linear-gradient(145deg, #e5c7ff 20%,#0e2414 28%, #6d28d9 100%)",
    clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 6%)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.45), 0 0 16px rgba(168,85,247,0.25)",
    transition: "transform 0.12s ease",
    marginBottom: "4px",
  },
  cardInner: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#080a13",
    clipPath: "polygon(7% 0, 93% 0, 100% 6%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 6%)",
  },
  cardHeader: {
    minHeight: "32px",
    padding: "7px 9px 5px 15px",
    color: "white",
    background: "linear-gradient(115deg, #e5c7ff 13%,#0e2414 18%, #6d28d9 100%)",
    fontSize: "12px",
    fontWeight: 750,
    lineHeight: 1.02,
    letterSpacing: "-0.035em",
    textAlign: "center",
    textTransform: "uppercase",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardArtwork: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    margin: "0 7px", marginBottom: "4px",
    overflow: "hidden",
    background: "#10121e",
    borderLeft: "2px solid #161826",
    borderRight: "2px solid #161826",
    padding: "2px",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  cardScrim: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(4,7,16,0.08), rgba(4,7,16,0.24))",
    pointerEvents: "none",
  },
  cardFooter: {
    minHeight: "44px", margin: "0 7px 10px",
    padding: "8px 10px 9px",
    color: "#ead8ff",
    background: "linear-gradient(180deg, #070912, #03040a)",
    fontSize: "10px",
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "0.02em",
    textAlign: "center",
    textTransform: "uppercase",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
  },
  playBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#d4ff3e",
    color: "#10101c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    paddingLeft: "2px",
    boxShadow: "0 0 0 5px rgba(212,255,62,0.14), 0 4px 10px rgba(0,0,0,0.4)",
    pointerEvents: "none",
  },
  // ---- "View All" card
  viewAllCard: {
    flexShrink: 0,
    width: "142px",
    height: "222px",
    clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 6%)",
    scrollSnapAlign: "start",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "rgba(212,255,62,0.07)",
    border: "1.5px dashed rgba(212,255,62,0.45)",
  },
  viewAllInner: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "linear-gradient(160deg, #25204c, #121429)",
    clipPath: "polygon(7% 0, 93% 0, 100% 5%, 100% 85%, 50% 97%, 0 85%, 0 5%)",
  },
  viewAllArrow: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "#d4ff3e",
    color: "#10101c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 800,
  },
  viewAllLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#d4ff3e",
  },
  // ---- skeleton template ----
  skeleton: {
    width: "142px",
    height: "220px",
    flexShrink: 0,
    clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 6%)",
    backgroundImage:
      "linear-gradient(100deg, #1b1b2e 20%, #2a2a46 40%, #1b1b2e 60%)",
    backgroundSize: "200% 100%",
    animation: "featuredGamesShimmer 1.4s ease-in-out infinite",
  },
  // ---- error template ----
  errorBox: {
    color: "#9494b0",
    fontSize: "13px",
    padding: "18px 4px",
  },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .featured-games-scroll::-webkit-scrollbar { display: none; }
  @keyframes featuredGamesShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .featured-game-card:active,
  .featured-view-all-card:active { transform: scale(0.94); }
  @media (max-width: 360px) {
    .featured-game-card, .featured-view-all-card, .featured-game-skeleton {
      width: 98px !important;
      height: 154px !important;
    }
  }
`;

// ---- Skeleton template ---------------------------------------------------
function GameCardSkeleton() {
  return <div className="featured-game-skeleton" style={styles.skeleton} aria-hidden="true" />;
}

// ---- Game card template ---------------------------------------------------
function GameCard({ game, onSelect }) {
  return (
    <div
      className="featured-game-card"
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
      <div style={styles.cardInner}>
        <div style={styles.cardHeader}>{game.title}</div>
        <div style={styles.cardArtwork}>
          {game.thumbnail && (
            <img src={game.thumbnail} alt={game.title} style={styles.cardImg} loading="lazy" />
          )}
          <div style={styles.cardScrim} />
          <span style={styles.playBadge} aria-hidden="true">▶</span>
        </div>
        {game.description && <div style={styles.cardFooter}>{game.description}</div>}
      </div>
    </div>
  );
}

// ---- "View All" card
function ViewAllCard({ onClick }) {
  return (
    <div
      className="featured-view-all-card"
      style={styles.viewAllCard}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span style={styles.viewAllArrow} aria-hidden="true">
        →
      </span>
      <span style={styles.viewAllLabel}>View All</span>
    </div>
  );
}

// ---- Main component ---------------------------------------------------
export default function FeaturedGames({
  apiUrl = "https://67c7374cbb0988d092ea.appwrite.global/games",
  title = "Featured Games",
  onViewAll,
}) {
  const [allGames, setAllGames] = useState([]);
  const [status, setStatus] = useState("loading");


  const [activeGame, setActiveGame] = useState(null);

  const fetchGames = useCallback(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rawList = Array.isArray(data) ? data : data.data || data.games || [];
        setAllGames(rawList.map(mapApiGame));
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load featured games:", err);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  useEffect(() => {
    const cleanup = fetchGames();
    return cleanup;
  }, [fetchGames]);

  const featuredGames = useMemo(() => {
    if (allGames.length === 0) return [];
    return shuffle(allGames).slice(0, FEATURED_COUNT);
  }, [allGames]);

  const handleViewAll = useCallback(() => {
    if (onViewAll) {
      onViewAll();
    } else if (typeof window !== "undefined") {
      window.location.href = "/all-games";
    }
  }, [onViewAll]);


  const handleSelectGame = useCallback((game) => {
    if (!game.playUrl) return;
    setActiveGame(game);
  }, []);

  return (
    <section style={styles.section}>
      <style>{globalCSS}</style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon} aria-hidden="true">
            ✦
          </span>
          <h2 style={styles.headerTitle}>{title}</h2>
        </div>
        {status === "error" && (
          <button type="button" style={styles.retryBtn} onClick={fetchGames}>
            Retry
          </button>
        )}
      </div>

      {status === "error" ? (
        <div style={styles.errorBox}>
          Couldn't load games right now. Tap retry to try again.
        </div>
      ) : (
        <div className="featured-games-scroll" style={styles.scrollRow}>
          {status === "loading"
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))
            : (
              <>
                {featuredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={handleSelectGame}
                  />
                ))}
                {/* Appears right after the 10th (last) featured game */}
                <ViewAllCard onClick={handleViewAll} />
              </>
            )}
        </div>
      )}

      <GameWebViewOverlay
        game={activeGame}
        onClose={() => setActiveGame(null)}
      />
    </section>
  );
}