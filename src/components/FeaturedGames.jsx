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
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerIcon: {
    fontSize: "18px",
    lineHeight: 1,
    filter: "drop-shadow(0 0 6px rgba(255,130,40,0.6))",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 800,
    margin: 0,
  },
  retryBtn: {
    color: "#d4ff3e",
    fontSize: "13px",
    fontWeight: 700,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  },
  scrollRow: {
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
    width: "130px",
    height: "130px",
    borderRadius: "16px",
    overflow: "hidden",
    scrollSnapAlign: "start",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    background: "linear-gradient(150deg, #23233b, #191930)",
    border: "1px solid #2c2c46",
    boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
    transition: "transform 0.12s ease",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  cardScrim: {
    position: "absolute",
    inset: "auto 0 0 0",
    height: "60%",
    background:
      "linear-gradient(180deg, rgba(16,16,28,0) 0%, rgba(16,16,28,0.92) 100%)",
    pointerEvents: "none",
  },
  cardTitle: {
    position: "absolute",
    left: "8px",
    right: "8px",
    bottom: "8px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.2,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
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
    boxShadow:
      "0 0 0 6px rgba(212,255,62,0.14), 0 4px 10px rgba(0,0,0,0.4)",
    pointerEvents: "none",
  },
  // ---- "View All" card
  viewAllCard: {
    flexShrink: 0,
    width: "130px",
    height: "130px",
    borderRadius: "16px",
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
    width: "130px",
    height: "130px",
    flexShrink: 0,
    borderRadius: "16px",
    border: "1px solid #2c2c46",
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
`;

// ---- Skeleton template ---------------------------------------------------
function GameCardSkeleton() {
  return <div style={styles.skeleton} aria-hidden="true" />;
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
      {game.thumbnail && (
        <img
          src={game.thumbnail}
          alt={game.title}
          style={styles.cardImg}
          loading="lazy"
        />
      )}
      <div style={styles.cardScrim} />
      <span style={styles.playBadge} aria-hidden="true">
        ▶
      </span>
      <span style={styles.cardTitle}>{game.title}</span>
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
  title = "Featured",
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
            🔥
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