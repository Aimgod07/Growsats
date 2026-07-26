import React, { useEffect, useState, useCallback } from "react";
import "./mainscroller.css";


const DEFAULT_API_URL = "https://your-api.example.com/games/play-and-win";
const SKELETON_COUNT = 8; 

function GameCard({ game, onSelect }) {
  return (
    <div
      className="ms-game-card"
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
      {game.badge && <span className="ms-badge">{game.badge}</span>}

      {game.thumbnail ? (
        <img
          className="ms-game-card-img"
          src={game.thumbnail}
          alt={game.title}
          loading="lazy"
        />
      ) : (
        <div className="ms-game-card-placeholder" />
      )}

      <div className="ms-card-scrim" />
      <span className="ms-play-btn" aria-hidden="true">
        ▶
      </span>
      {game.title && <span className="ms-card-title">{game.title}</span>}
    </div>
  );
}

function GameCardSkeleton() {
  return <div className="ms-game-card ms-skeleton" aria-hidden="true" />;
}

// ---- Main component ---------------------------------------------------
export default function MainScroller({
  apiUrl = DEFAULT_API_URL,
  title = "PLAY AND WIN",
  onViewAll,
  onSelectGame,
}) {
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | success | error

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
        const list = Array.isArray(data) ? data : data.games || [];
        setGames(list);
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

  const handleSelect = (game) => {
    if (onSelectGame) onSelectGame(game);
  };

  return (
    <div className="ms-main-body">
      <div className="ms-inner-box">
        <div className="ms-header">
          <span className="ms-title">
            <span className="ms-title-icon" aria-hidden="true">
              🔥
            </span>
            {title}
          </span>
          <button type="button" className="ms-view-all" onClick={onViewAll}>
            View All <span aria-hidden="true">›</span>
          </button>
        </div>

        {status === "error" ? (
          <div className="ms-error">
            Couldn't load games right now.
            <button type="button" className="ms-retry" onClick={fetchGames}>
              Retry
            </button>
          </div>
        ) : (
          <div className="ms-scroller">
            {status === "loading"
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))
              : games.map((game) => (
                  <GameCard key={game.id} game={game} onSelect={handleSelect} />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}