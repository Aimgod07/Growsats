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
    gridTemplateColumns: "repeat(auto-fill, minmax(142px, 1fr))",
    gap: "12px",
  },
  card: {
    position: "relative",
    width: "90%",
    aspectRatio: "142 / 220",
    padding: "1px",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    background: "linear-gradient(145deg, #e5c7ff 20%,#0e2414 28%, #6d28d9 100%)",
    clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 6%)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.45), 0 0 16px rgba(168,85,247,0.25)",
    transition: "transform 0.12s ease",
    margin: "0 0 2px 0",
  },
  cardInner: {
    height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#080a13",
    clipPath: "polygon(7% 0, 93% 0, 100% 6%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 6%)",
  },
  cardHeader: {
    minHeight: "32px", padding: "7px 9px 5px", color: "white", background: "linear-gradient(115deg, #e5c7ff 11%,#0e2414 18%, #6d28d9 100%)",
    fontSize: "13px", fontWeight: 950, lineHeight: 1.02, letterSpacing: "-0.035em", textAlign: "center", textTransform: "uppercase",
    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
  cardArtwork: { position: "relative", flex: 1, minHeight: 0, margin: "0 7px", marginBottom: "4px", overflow: "hidden", background: "#10121e", borderLeft: "2px solid #161826", borderRight: "2px solid #161826" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  cardScrim: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,7,16,0.08), rgba(4,7,16,0.24))", pointerEvents: "none" },
  cardFooter: {
    minHeight: "44px", margin: "0 7px 10px", padding: "8px 10px 9px", color: "#ead8ff", background: "linear-gradient(180deg, #070912, #03040a)",
    fontSize: "10px", fontWeight: 800, lineHeight: 1.15, letterSpacing: "0.01em", textAlign: "center", textTransform: "uppercase",
    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
  },
  playBadge: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "30px", height: "30px", borderRadius: "50%",
    backgroundColor: "#d4ff3e", color: "#10101c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", paddingLeft: "2px",
    boxShadow: "0 0 0 5px rgba(212,255,62,0.14), 0 4px 10px rgba(0,0,0,0.4)", pointerEvents: "none",
  },
  skeleton: {
    width: "100%",
    aspectRatio: "142 / 220",
    clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 91%, 91% 100%, 9% 100%, 0 91%, 0 6%)",
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