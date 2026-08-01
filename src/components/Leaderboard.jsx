import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, MoreHorizontal, Clock3, Gem, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
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

function Avatar({ player, className }) {
  return (
    <div className={className} style={{ backgroundColor: player.avatarColor }} aria-label={player.name}>
      {player.avatarLetter}
    </div>
  );
}

function PodiumCard({ player }) {
  return (
    <article className={`podium-card ${RANK_CLASS[player.rank]}`}>
      <div className="podium-card__profile">
        <div className="podium-card__avatar-shell">
          <span className="podium-card__crown-dot" aria-hidden="true" />
          <Avatar player={player} className="podium-card__avatar" />
        </div>
        <p className="podium-card__name">{player.name}</p>
        <span className="podium-card__coins"><Gem size={12} /> {formatCoins(player.coins)}</span>
      </div>
      <div className="podium-card__platform" aria-label={`Rank ${player.rank}`}>
        <span>{player.rank}</span>
      </div>
    </article>
  );
}

function ListRow({ player }) {
  return (
    <div className="list-row">
      <span className="list-row__rank">{player.rank}</span>
      <Avatar player={player} className="list-row__avatar" />
      <div className="list-row__details">
        <span className="list-row__name">{player.name}</span>
        <span className="list-row__handle">@{player.name.toLowerCase().replace(/\s+/g, "")}</span>
      </div>
      <span className="list-row__coins"><Gem size={13} /> {formatCoins(player.coins)}</span>
    </div>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
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
    const byRank = Object.fromEntries(players.filter((player) => player.rank <= 3).map((player) => [player.rank, player]));
    return RANK_ORDER.map((rank) => byRank[rank]).filter(Boolean);
  }, [players]);
  const rest = useMemo(() => players.filter((player) => player.rank > 3), [players]);
  const monthLabel = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date()), []);

  if (loading) {
    return <div className="leaderboard leaderboard--center"><Loader2 size={28} className="spin icon-green" /><p>Loading leaderboard...</p></div>;
  }
  if (error) {
    return <div className="leaderboard leaderboard--center"><p className="leaderboard__error-text">{error}</p><button className="leaderboard__retry" onClick={loadData}>Try again</button></div>;
  }

  return (
    <main className="leaderboard">
      <header className="leaderboard-header">
        <button className="leaderboard-header__button" onClick={() => navigate("/Home")} aria-label="Back to home"><ChevronLeft size={22} /></button>
        <div><h1>Leaderboard</h1><p>{monthLabel}</p></div>
        <button className="leaderboard-header__button" aria-label="More leaderboard options"><MoreHorizontal size={21} /></button>
      </header>

      <section className="podium" aria-label="Top three players">
        {podium.map((player) => <PodiumCard key={player.rank} player={player} />)}
      </section>

      <div className="leaderboard-status"><Clock3 size={14} /> <span>Leaderboard updates in</span> <strong>{countdownLabel}</strong></div>

      <section className="leaderboard-list" aria-label="Remaining player rankings">
        {rest.map((player) => <ListRow key={player.rank} player={player} />)}
      </section>
      <Footer />
    </main>
  );
}