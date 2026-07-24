// AllGames.jsx

import { useEffect, useState } from "react";
import "../styles/Allgames.css";

const API_URL = "https://67c7374cbb0988d092ea.appwrite.global/games";

function mapApiGame(raw) {
  return {
    id: raw.code,
    title: raw.name,
    description: raw.description,
    category: raw.category?.name,
    thumbnail: raw.images?.square || raw.images?.thumb || raw.images?.cover,
    playUrl: raw.url,
  };
}

export default function AllGames() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        const rawGames = Array.isArray(data)
          ? data
          : data.data || data.games || [];

        setGames(rawGames.map(mapApiGame));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGame) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow || "auto";
    };
  }, [selectedGame]);

  const openGame = (game) => {
    setIframeLoading(true);
    setSelectedGame(game);
  };

  const closeGame = () => {
    setSelectedGame(null);
  };

  return (
    <>
      <div className="all-games-page">
        <div className="allgames-header">
          <h2>🎮 All Games</h2>
        </div>

        {loading ? (
          <div className="loading-games">Loading games...</div>
        ) : (
          <div className="games-grid">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => openGame(game)}
              >
                <img src={game.thumbnail} alt={game.title} loading="lazy" />

                <div className="game-overlay">
                  <h3>{game.title}</h3>

                  <p>{game.category}</p>
                  <button
                    className="play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGame(game);
                    }}
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Game Player */}
      {selectedGame && (
        <div className="iframe-overlay">
          {/* Close Button */}
          <button
            className="close-game"
            onClick={closeGame}
            aria-label="Close Game"
          >
            ✕
          </button>

          {iframeLoading && (
            <div className="iframe-loading">
              Loading {selectedGame.title}...
            </div>
          )}

          <iframe
            src={selectedGame.playUrl}
            title={selectedGame.title}
            className="game-iframe"
            allow="fullscreen; autoplay; accelerometer; gyroscope; gamepad"
            allowFullScreen
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      )}
    </>
  );
}
