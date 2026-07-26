import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Zap, Loader2 } from "lucide-react";
import "../../styles/Leaderboard.css";
import Footer from "./Footer";

async function fetchLeaderboard() {



  await mockDelay(500);

  const resetAt = new Date(Date.now() + (18 * 3600 + 43 * 60 + 54) * 1000).toISOString();

  return {
    resetAt,
    players: [
      { rank: 1, name: "Annais Schultz", avatarLetter: "A", avatarColor: "#4f6bed", coins: 818000 },
      { rank: 2, name: "aos rembo", avatarLetter: "a", avatarColor: "#0f766e", coins: 818000 },
      { rank: 3, name: "Dored Bookr", avatarLetter: "D", avatarColor: "#9333ea", coins: 818000 },
      { rank: 4, name: "Carla Megan", avatarLetter: "C", avatarColor: "#9333ea", coins: 570000 },
      { rank: 5, name: "Marco Stanboli", avatarLetter: "M", avatarColor: "#a8886f", coins: 232000 },
      { rank: 6, name: "Lolita Meranda", avatarLetter: "L", avatarColor: "#f97316", coins: 232000 },
      { rank: 7, name: "giovanny chloe", avatarLetter: "g", avatarColor: "#65a30d", coins: 188000 },
    ],
  };
}

function mockDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCoins(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  }
  return `${value}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "00h : 00m : 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

const RANK_ORDER = [2, 1, 3]; 
const RANK_CLASS = { 1: "podium-card--first", 2: "podium-card--second", 3: "podium-card--third" };

//cards

function PodiumCard({ player }) {
  return (
    <div className={`podium-card ${RANK_CLASS[player.rank] || ""}`}>
      <div className="podium-card__avatar-wrap">
        <div className="podium-card__avatar" style={{ backgroundColor: player.avatarColor }}>
          {player.avatarLetter}
        </div>
        <span className="podium-card__rank">{player.rank}</span>
      </div>
      <p className="podium-card__name">{player.name}</p>
      <span className="podium-card__coins">
        <span className="coin-dot">🪙</span> {formatCoins(player.coins)}
      </span>
    </div>
  );
}

function ListRow({ player }) {
  return (
    <div className="list-row">
      <span className="list-row__rank">{player.rank}</span>
      <div className="list-row__avatar" style={{ backgroundColor: player.avatarColor }}>
        {player.avatarLetter}
      </div>
      <span className="list-row__name">{player.name}</span>
      <span className="list-row__coins">
        <span className="coin-dot">🪙</span> {formatCoins(player.coins)}
      </span>
    </div>
  );
}

//main component

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [resetAt, setResetAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setPlayers(data.players);
      setResetAt(data.resetAt);
    } catch (err) {
      setError(err.message || "Couldn't load the leaderboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);

//countdown

  useEffect(() => {
    if (!resetAt) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  const countdownLabel = useMemo(() => {
    if (!resetAt) return "";
    return formatCountdown(new Date(resetAt).getTime() - now);
  }, [resetAt, now]);

  const podium = useMemo(() => {
    const byRank = {};
    players.forEach((p) => {
      if (p.rank <= 3) byRank[p.rank] = p;
    });
    return RANK_ORDER.map((rank) => byRank[rank]).filter(Boolean);
  }, [players]);

  const rest = useMemo(() => players.filter((p) => p.rank > 3), [players]);

  if (loading) {
    return (
      <div className="leaderboard leaderboard--center">
        <Loader2 size={28} className="spin icon-green" />
        <p className="leaderboard__loading-text">Loading leaderboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard leaderboard--center">
        <p className="leaderboard__error-text">{error}</p>
        <button className="leaderboard__retry" onClick={loadData}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      
      {/* ---------------- Section heading ---------------- */}
      <div className="section-heading">
        <h2 className="section-heading__title">Leaderboard</h2>
      </div>

      {/* ---------------- Podium (top 3) ---------------- */}
      <div className="podium">
        {podium.map((player) => (
          <PodiumCard key={player.rank} player={player} />
        ))}
      </div>

      {/* ---------------- Wavy divider ---------------- */}
      <div className="wavy-divider-wrap">
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="wavy-divider">
          <path
            d="M0,4 L150,4 C165,4 165,20 185,20 L215,20 C235,20 235,4 250,4 L400,4"
            fill="none"
            stroke="rgba(52,211,153,0.35)"
            strokeWidth="2"
          />
        </svg>
      </div>

      

      {/* ---------------- Reset banner + countdown ---------------- */}
      <div className="reset-banner">
        <Zap size={14} />
        <span>The Leaderboard will be reset in</span>
        <Zap size={14} />
      </div>
      <p className="reset-countdown">{countdownLabel}</p>

      {/* ---------------- Ranked list (4+) ---------------- */}
      <div className="leaderboard-list">
        {rest.map((player) => (
          <ListRow key={player.rank} player={player} />
        ))}
      </div>
      <Footer/>
    </div>
  );
}