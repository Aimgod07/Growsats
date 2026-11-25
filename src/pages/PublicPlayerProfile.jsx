import { ArrowLeft, Clock3, ShieldCheck, Star, Trophy } from 'lucide-react';
import { CalendarDays } from '../components/PlaylootIcons';
import { Coins } from '../components/PlaylootIcons';
import { Gamepad2 } from '../components/PlaylootIcons';
import { useNavigate, useParams } from 'react-router-dom';
import {formatPlayTime} from '../utils/playTime';
import { useResource } from '../hooks/useResource';
import { backend } from '../utils/api';
import '../styles/player-hub.css';
import '../styles/resource.css';

function Avatar({ player }) {
  return <div className="neo-avatar neo-avatar--hero">{player?.avatarUrl ? <img src={player.avatarUrl} alt="" /> : <span>{player?.name?.[0]?.toUpperCase() || '?'}</span>}</div>;
}

function joined(value) {
  if (!value) return 'Player';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Player' : `Joined ${date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

export default function PublicPlayerProfile() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const profile = useResource(() => backend.playerProfile(playerId), [playerId], { retries: 1 });
  return <main className="hub public-player">
    <header className="hub__header">
      <button className="hub__back" onClick={() => navigate('/leaderboard')} aria-label="Back to leaderboard"><ArrowLeft size={21}/></button>
      <div><span className="hub__eyebrow">PLAYLOOT</span><h1>Player profile</h1></div>
      <span className="public-player__header-icon"><Trophy size={20}/></span>
    </header>
    <div className="hub__body">
      {profile.loading && <section className="public-player__state">Loading player profile…</section>}
      {profile.error && !profile.data && <section className="public-player__state" role="alert"><h2>Profile unavailable</h2><p>{profile.error.message}</p><button onClick={profile.reload}>Try again</button></section>}
      {profile.data && <>
        <section className="neo-profile__hero public-player__hero">
          <div className="neo-profile__halo"><Avatar player={profile.data}/></div><h2>{profile.data.name}</h2><p>@{profile.data.gamerId}</p>
          <div className="neo-profile__level"><span>Level {profile.data.level}</span><b>{profile.data.tier}</b></div>
          <small><CalendarDays size={13}/> {joined(profile.data.dateJoined)}</small>
        </section>
        <div className="neo-wallet">
          <div><Coins/><span>Coins</span><strong>{(profile.data.coins ?? 0).toLocaleString()}</strong></div>
          <div><Trophy/><span>Global rank</span><strong>{profile.data.rank ? `#${profile.data.rank}` : '—'}</strong></div>
        </div>
        <section className="neo-panel">
          <div className="neo-heading"><div><span>PERFORMANCE</span><h2>Player stats</h2></div><ShieldCheck/></div>
          <div className="neo-stats">
            <div><Gamepad2/><strong>{profile.data.stats?.gamesPlayed ?? 0}</strong><span>Played</span></div>
            <div><Clock3/><strong>{formatPlayTime(profile.data.stats)}</strong><span>Game time</span></div>
            <div><Star/><strong>{profile.data.stats?.rewardsEarned ?? 0}</strong><span>Rewards</span></div>
          </div>
          {!!profile.data.badges?.length && <div className="hub__badges">{profile.data.badges.map((badge) => <span key={badge.id} className={badge.earned ? 'earned' : ''}>{badge.earned ? '★' : '☆'} {badge.title}</span>)}</div>}
        </section>
        <section className="neo-panel">
          <div className="neo-heading"><div><span>ACTIVITY</span><h2>Recently played</h2></div><Gamepad2/></div>
          {profile.data.recentGames?.length ? profile.data.recentGames.map((game, index) => <div className="neo-activity" key={`${game.gameCode}-${index}`}><span className="neo-game-icon"><Gamepad2/></span><div><b>{game.title}</b><small>{Math.max(1, Math.round((game.seconds || 0) / 60))} min played</small></div></div>) : <p>No public game activity yet.</p>}
        </section>
      </>}
    </div>
  </main>;
}
