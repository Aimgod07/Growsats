import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GameWebViewOverlay from "../src/components/timer/Gamewebviewoverlay";

const SKELETON_COUNT = 12;

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

// ---- Styles ---------------------------------------------------------------
const styles = {
  page: {
    backgroundColor: "#10101c",
    minHeight: "100vh",
    padding: "16px 12px 32px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
    gap: "10px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#d4ff3e",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px 6px 4px 0",
    lineHeight: 1,
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
  searchWrap: {
    marginBottom: "14px",
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid #2c2c46",
    backgroundColor: "#1c1c30",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },
  categoryRow: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "6px",
    marginBottom: "16px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  categoryChip: (active) => ({
    flexShrink: 0,
    padding: "7px 14px",
    borderRadius: "999px",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    border: active ? "1px solid #d4ff3e" : "1px solid #2c2c46",
    backgroundColor: active ? "rgba(212,255,62,0.12)" : "#1c1c30",
    color: active ? "#d4ff3e" : "#9494b0",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: "12px",
  },
  card: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: "16px",
    overflow: "hidden",
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
  skeleton: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: "16px",
    border: "1px solid #2c2c46",
    backgroundImage:
      "linear-gradient(100deg, #1b1b2e 20%, #2a2a46 40%, #1b1b2e 60%)",
    backgroundSize: "200% 100%",
    animation: "allGamesShimmer 1.4s ease-in-out infinite",
  },
  errorBox: {
    color: "#9494b0",
    fontSize: "13px",
    padding: "24px 4px",
    textAlign: "center",
  },
  emptyBox: {
    color: "#9494b0",
    fontSize: "13px",
    padding: "40px 4px",
    textAlign: "center",
  },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .all-games-categories::-webkit-scrollbar { display: none; }
  @keyframes allGamesShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .all-game-card:active { transform: scale(0.94); }
`;

// ---- Skeleton template ---------------------------------------------------
function GameCardSkeleton() {
  return <div style={styles.skeleton} aria-hidden="true" />;
}

// ---- Game card template ---------------------------------------------------
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

// ---- Main component ---------------------------------------------------
export default function AllGames({
  apiUrl = "https://67c7374cbb0988d092ea.appwrite.global/games",
  title = "All Games",
}) {
  const [allGames, setAllGames] = useState([]);
  const [status, setStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // The one piece of state that controls the overlay.
  const [activeGame, setActiveGame] = useState(null);

  const navigate = useNavigate();

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
        console.error("Failed to load games:", err);
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

  const categories = useMemo(() => {
    const set = new Set();
    allGames.forEach((g) => g.category && set.add(g.category));
    return ["All", ...Array.from(set).sort()];
  }, [allGames]);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allGames.filter((g) => {
      const matchesCategory =
        activeCategory === "All" || g.category === activeCategory;
      const matchesQuery = !q || g.title?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [allGames, query, activeCategory]);

  // Opening a game is now just "set it as active" — GameWebViewOverlay
  // handles native mounting vs. web iframe, the timer, and the claim flow.
  const handleSelectGame = useCallback((game) => {
    if (!game.playUrl) return;
    setActiveGame(game);
  }, []);

  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => navigate("/Home")}
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <h2 style={styles.headerTitle}>{title}</h2>
        </div>

        {status === "error" && (
          <button type="button" style={styles.retryBtn} onClick={fetchGames}>
            Retry
          </button>
        )}
      </div>

      {/* search box */}
      {status !== "error" && (
        <div style={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            style={styles.searchInput}
          />
        </div>
      )}

      {status === "success" && categories.length > 1 && (
        <div className="all-games-categories" style={styles.categoryRow}>
          {categories.map((cat) => (
            <div
              key={cat}
              style={styles.categoryChip(activeCategory === cat)}
              role="button"
              tabIndex={0}
              onClick={() => setActiveCategory(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveCategory(cat);
                }
              }}
            >
              {cat}
            </div>
          ))}
        </div>
      )}

      {status === "error" ? (
        <div style={styles.errorBox}>
          Couldn't load games right now. Tap retry to try again.
        </div>
      ) : (
        <div style={styles.grid}>
          {status === "loading"
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))
            : filteredGames.map((game) => (
                <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
              ))}
        </div>
      )}

      {status === "success" && filteredGames.length === 0 && (
        <div style={styles.emptyBox}>No games match your search.</div>
      )}

      <GameWebViewOverlay
        game={activeGame}
        onClose={() => setActiveGame(null)}
      />
    </div>
  );
}