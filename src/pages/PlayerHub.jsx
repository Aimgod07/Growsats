import ReminderSettings from '../components/ReminderSettings';
import CoinConversion from '../components/CoinConversion';
import RewardsBanner from '../components/RewardsBanner';
import '../styles/scroll-lists.css';
import {formatPlayTime} from '../utils/playTime';
import {AdPlacement} from '../components/LiveFeatures';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Settings2, Copy, Check, ShieldCheck, LogOut } from 'lucide-react';
import { Bell, Coins, Gamepad2, Gift, NotificationButtonIcon } from '../components/PlaylootIcons';
import DiamondIcon from '../components/DiamondIcon';
import '../styles/leaderboard-arena.css';
import { backend } from '../utils/api';
import { useResource } from '../hooks/useResource';
import { ResourceGate, ResourceBanner } from '../components/ResourceGate';
import { useAppConfig } from '../config/appConfig';
import '../styles/player-hub.css';
import '../styles/resource.css';

const tabs = [
  ['overview', 'Overview', Gamepad2], ['missions', 'Missions', Gift], ['ranks', 'Ranks', Trophy],
  ['rewards', 'Rewards', Coins], ['settings', 'Settings', Settings2],
];
// Backends may send SQLite `datetime('now')` output ("2026-03-01 00:30:00",
// UTC with no zone marker). `new Date()` reads that as *local* time, which
// shows the wrong day for anyone not on UTC, so tag it first.
const date = (value) => {
  if (!value) return '';
  const raw = typeof value === 'string' ? value.trim() : value;
  const normalised =
    typeof raw === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
      ? `${raw.replace(' ', 'T')}Z`
      : raw;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// Defaults so a section can render safely on the very first paint, before its
// request resolves. A failed load then degrades to "stale" rather than blank.
const FALLBACKS = {
  missions: { missions: [] },
  rewards: { rewards: [], claims: [] },
  notifications: { items: [], unread: 0 },
  settings: {
    online: true, stealth: false, graphics: 'auto', fps: 60,
    privateProfile: false, rewardAlerts: true, twoStep: false,
  },
  daily: { claimed: false, coins: 50 },
  invite: { code: '', referrals: 0 },
  leaderboard: { players: [], me: null },
  redeem: { options: [] },
  wallet: { coins: 0, diamonds: 0 },
  profile: {
    name: 'Player', gamerId: '', level: 1, tier: 'BRONZE', avatarUrl: null,
    stats: { gamesPlayed: 0, rewardsEarned: 0, referrals: 0 },
    badges: [], recentGames: [],
  },
};

function TwoStepSettings({ settings, reload }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const enabled = settings?.twoStep;

  async function submit() {
    setBusy(true); setError('');
    try {
      if (setup) { await backend.enableTwoStep(code); setSetup(null); setCode(''); reload(); }
      else if (enabled) { await backend.disableTwoStep(code); setCode(''); reload(); }
      else setSetup(await backend.setupTwoStep());
    } catch (err) { setError(err.message || 'Could not update two-step authentication'); }
    finally { setBusy(false); }
  }

  return <section className="hub__card">
    <h2>Two-step authentication</h2>
    <p>{enabled ? 'Enabled. Enter an authenticator code to disable.' : 'Protect sign-in with an authenticator app.'}</p>
    {setup && <p>Add this key to your authenticator: <strong>{setup.secret}</strong></p>}
    {(enabled || setup) && <input
      style={{ display: 'block', width: '100%', padding: 12, margin: '12px 0', background: '#272b3b', color: '#fff', border: '1px solid #454b61', borderRadius: 9 }}
      inputMode="numeric" placeholder="Six-digit code" value={code}
      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
    />}
    <button className="hub__primary" disabled={busy || ((enabled || setup) && code.length !== 6)} onClick={submit}>
      {busy ? 'Working…' : setup ? 'Verify and enable' : enabled ? 'Disable two-step' : 'Set up two-step'}
    </button>
    {error && <p role="alert">{error}</p>}
  </section>;
}

function PlayerAvatar({ player, size = 'normal', editable = false, onUpload }) {
  const content = player?.avatarUrl
    ? <img src={player.avatarUrl} alt="" />
    : <span>{player?.name?.[0]?.toUpperCase() || '?'}</span>;
  if (!editable) return <div className={`neo-avatar neo-avatar--${size}`}>{content}</div>;
  return <label className={`neo-avatar neo-avatar--${size} neo-avatar--editable`} aria-label="Change avatar">
    {content}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
  </label>;
}

function ProfileOverview({ appConfig, profile, wallet, daily, notifications, busy, uploadAvatar, act, navigate }) {
  const sections = appConfig.screens?.profile?.sections || {};
  const levelProgress = Math.max(12, Math.min(92, 28 + ((profile.data.level || 1) * 9) % 64));
  return <div className="neo-profile">
    <section className="neo-profile__hero" hidden={sections.identity === false}>
      <ResourceBanner resource={profile} label="your profile" onRetry={profile.reload} retrying={profile.refreshing} />
      <div className="neo-profile__halo"><PlayerAvatar player={profile.data} size="hero" editable onUpload={uploadAvatar} /></div>
      <h2>{profile.data.name}</h2><p>@{profile.data.gamerId}</p>
      <div className="neo-profile__level"><span>Level {profile.data.level}</span><b>{profile.data.tier}</b></div>
      <div className="neo-progress"><i style={{ width: `${levelProgress}%` }} /></div>
      <small>{levelProgress}% progress to the next level</small>
    </section>

    <div className="neo-quick-actions" aria-label="Player actions">
      <button onClick={() => navigate('/missions')}><Gift size={30}/><span><b>Missions</b><small>Daily objectives</small></span></button>
      <button onClick={() => navigate('/redeem')}><Coins size={30}/><span><b>Loot</b><small>Rewards and cashout</small></span></button>
      <button onClick={() => navigate('/transactions')}><img className="neo-quick-action-icon" src="/playloot-art/profile-transactions.png" alt="" /><span><b>Transactions</b><small>Withdrawals and history</small></span></button>
      <button onClick={() => navigate('/profile/settings')}><img className="neo-quick-action-icon" src="/playloot-art/profile-settings.png" alt="" /><span><b>Settings</b><small>Privacy and security</small></span></button>
    </div>

    <ResourceGate resource={wallet} label="your balance" minHeight="82px">
      <div className="neo-wallet" hidden={appConfig.screens?.loot?.sections?.balance === false}>
        <div><Coins /><span>Coins</span><strong>{(wallet.data.coins ?? 0).toLocaleString()}</strong></div>
        <div><DiamondIcon size={25} /><span>Diamonds</span><strong>{(wallet.data.diamonds ?? 0).toLocaleString()}</strong></div>
      </div>
    </ResourceGate>

    <section className="neo-panel" hidden={sections.stats === false}>
      <div className="neo-heading"><div><span>PERFORMANCE</span><h2>Player stats</h2></div><ShieldCheck /></div>
      <ResourceGate resource={profile} label="your stats" minHeight="100px">
        <div className="neo-stats">
          <div><img src="/playloot-art/controller.png" alt="" /><div><strong>{profile.data.stats?.gamesPlayed ?? 0}</strong><span>Played</span></div></div>
          <div><img src="/playloot-art/stat-time.png" alt="" /><div><strong>{formatPlayTime(profile.data.stats)}</strong><span>Game time</span></div></div>
          <div><img src="/playloot-art/stat-rewards.png" alt="" /><div><strong>{profile.data.stats?.rewardsEarned ?? 0}</strong><span>Rewards</span></div></div>
        </div>
        <div className="hub__badges">{(profile.data.badges || []).map(b => <span key={b.id} className={b.earned ? 'earned' : ''}>{b.earned ? '★' : '☆'} {b.title}</span>)}</div>
      </ResourceGate>
    </section>

    <div className="neo-profile__updates">
      <ResourceGate resource={daily} label="your daily bonus" minHeight="110px">
        <section className="neo-daily" hidden={appConfig.screens?.loot?.sections?.daily === false}>
          <span className="hub__sr-only">Daily bonus</span><div><span>DAILY DROP</span><h2>{daily.data.claimed ? 'Reward collected' : `${daily.data.coins ?? 50} coins are ready`}</h2><p>Return each day to keep building your balance.</p></div>
          <button disabled={daily.data.claimed || !!busy} onClick={() => act('daily', backend.claimDaily, ['daily', 'wallet', 'rewards', 'notifications'])}>{daily.data.claimed ? 'Claimed' : busy === 'daily' ? 'Claiming…' : 'Claim now'}</button>
        </section>
      </ResourceGate>
    <section className="neo-panel neo-profile__notifications" hidden={sections.notifications === false}>
      <div className="neo-heading"><div><span>UPDATES</span><h2>Notifications</h2></div><b>{notifications.data.items?.length ?? 0}</b></div>
      <ResourceGate resource={notifications} label="notifications" minHeight="60px" emptyWhen={(d) => !d.items?.length} emptyState={<p>Your reward alerts will appear here.</p>}>
        <div className="hub-scroll-list" tabIndex={0} role="region" aria-label="Profile notifications">{notifications.data.items.map(n => <div className="neo-activity" key={n.id}><span className="neo-game-icon"><Bell/></span><div><b>{n.text}</b>{n.path&&['/Home','/offers','/missions','/events','/leaderboard','/redeem'].includes(n.path)?<a href={n.path}>Open announcement →</a>:<small>Player update</small>}</div><time>{date(n.at)}</time></div>)}</div>
      </ResourceGate>
    </section>
    </div>

    <section className="neo-panel neo-profile__recent" hidden={sections.recentGames === false}>
      <div className="neo-heading"><div><span>ACTIVITY</span><h2>Recently played</h2></div><button onClick={() => navigate('/all-games')}>View all</button></div>
      <ResourceGate resource={profile} label="your game history" minHeight="70px">
        {profile.data.recentGames?.length ? profile.data.recentGames.map((g, i) => <div className="neo-activity" key={`${g.gameCode}-${i}`}><span className="neo-game-icon"><Gamepad2/></span><div><b>{g.title}</b><small>{Math.max(1, Math.round((g.seconds || 0) / 60))} min played</small></div><time>{date(g.at)}</time></div>) : <p>No completed games yet. Your activity will appear here.</p>}
      </ResourceGate>
    </section>

  </div>;
}

function LeaderboardView({ appConfig, leaderboard, navigate }) {
  const players = leaderboard.data.players || [];
  const podium = [players[1], players[0], players[2]];
  return <section className="neo-leaderboard leaderboard-arena" hidden={appConfig.screens?.ranks?.sections?.leaderboard === false}>
    <div className="neo-leaderboard__intro"><span>THE PLAYLOOT ARENA</span><h2>Rise to the top</h2><p>See where you stand. Rankings follow your current coin balance.</p></div>
    <ResourceGate resource={leaderboard} label="the leaderboard" minHeight="260px" emptyWhen={(d) => !d.players?.length} emptyState={<p>No players on the board yet.</p>}>
      <div className="neo-podium">{podium.map((player) => player && <button type="button" onClick={() => navigate(`/players/${encodeURIComponent(player.id)}`)} key={player.id} className={`place place--${player.rank}`} aria-label={`View ${player.name}'s profile`}>
        <div className="place__avatar">{player.rank === 1 && <span className="place__crown" aria-hidden="true">♛</span>}<PlayerAvatar player={player} size="podium"/><span className="place__rank">{player.rank}</span></div>
        <b>{player.name}</b><small>@{player.gamerId}</small><em><Coins/> {(player.coins ?? 0).toLocaleString()}</em>
        <div className="place__stand"><strong>{player.rank}</strong></div>
      </button>)}</div>
      <div className="neo-list-heading"><span>PLAYER RANKINGS</span><b>{players.length} players</b></div>
      <div className="neo-board-list">{players.map(player => <button type="button" onClick={() => navigate(`/players/${encodeURIComponent(player.id)}`)} key={player.id} className={`${leaderboard.data.me?.id === player.id ? 'is-me' : ''} ${player.rank <= 3 ? `is-top is-top-${player.rank}` : ''}`} aria-label={`View ${player.name}'s profile`}>
        <strong className="neo-rank-badge">{player.rank <= 3 ? ['','🥇','🥈','🥉'][player.rank] : `#${player.rank}`}</strong><PlayerAvatar player={player} size="row"/><div className="neo-player-copy"><b>{player.name}</b><small>@{player.gamerId} · Level {player.level}</small></div><span className="neo-player-score"><b><Coins/>{(player.coins ?? 0).toLocaleString()}</b><small>{player.tier}</small></span>
      </button>)}</div>
      {leaderboard.data.me && <div className="neo-my-rank"><div><span>Your position</span><strong>Keep climbing the ranks</strong></div><b>#{leaderboard.data.me.rank}</b><strong><Coins size={20}/> {(leaderboard.data.me.coins ?? 0).toLocaleString()}</strong><button type="button" onClick={() => navigate('/all-games')}>Play games →</button></div>}
    </ResourceGate>
  </section>;
}

export default function PlayerHub({ initialTab = 'overview' }) {
  const appConfig = useAppConfig();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const availableTabs = useMemo(() => tabs.filter(([id]) => {
    if (id === 'ranks') return appConfig.screens?.ranks?.enabled !== false;
    if (id === 'rewards') return appConfig.screens?.loot?.enabled !== false;
    if (id === 'missions') return appConfig.screens?.arcade?.sections?.missions !== false;
    return appConfig.screens?.profile?.enabled !== false;
  }), [appConfig]);

  // React Router reuses PlayerHub while navigating between /profile,
  // /leaderboard and /redeem. Keep the visible screen in sync with the route
  // prop instead of retaining the tab from the first mounted URL.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab !== 'notifications' && !availableTabs.some(([id]) => id === tab)) setTab(availableTabs[0]?.[0] || 'overview');
  }, [availableTabs, tab]);

  // Each screen section is its own resource: a failing request can no longer
  // take the other nine down with it (the old Promise.all did exactly that).
  const profile = useResource(() => backend.profile(), [], { initialData: FALLBACKS.profile });
  const wallet = useResource(() => backend.wallet(), [], { initialData: FALLBACKS.wallet });
  const missions = useResource(() => backend.missions(), [], { initialData: FALLBACKS.missions });
  const leaderboard = useResource(() => backend.leaderboard(), [], { initialData: FALLBACKS.leaderboard });
  const rewards = useResource(() => backend.rewards(), [], { initialData: FALLBACKS.rewards });
  const invite = useResource(() => backend.invite(), [], { initialData: FALLBACKS.invite });
  const daily = useResource(() => backend.daily(), [], { initialData: FALLBACKS.daily });
  const notifications = useResource(() => backend.notifications(), [], { initialData: FALLBACKS.notifications });
  const settings = useResource(() => backend.settings(), [], { initialData: FALLBACKS.settings });
  const redeem = useResource(() => backend.redeemOptions(), [], { initialData: FALLBACKS.redeem });
  const reloadNotifications = notifications.reload;
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)reloadNotifications();};
    const timer=setInterval(refresh,30000);
    window.addEventListener('playloot:notifications-changed',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('playloot:notifications-changed',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[reloadNotifications]);
  const reloadProfile = profile.reload;
  const reloadWallet = wallet.reload;

  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')reloadWallet();};
    const timer=setInterval(refresh,15000);
    window.addEventListener('playloot:wallet-changed',refresh);
    window.addEventListener('focus',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('playloot:wallet-changed',refresh);window.removeEventListener('focus',refresh);};
  },[reloadWallet]);

  useEffect(() => {
    const refreshProfile = () => {
      if (document.visibilityState === 'visible') reloadProfile();
    };
    document.addEventListener('visibilitychange', refreshProfile);
    return () => document.removeEventListener('visibilitychange', refreshProfile);
  }, [reloadProfile]);

  const resources = useMemo(
    () => ({ profile, wallet, missions, leaderboard, rewards, invite, daily, notifications, settings, redeem }),
    [profile, wallet, missions, leaderboard, rewards, invite, daily, notifications, settings, redeem],
  );

  // Actions refresh only the sections they actually change, instead of
  // re-fetching all ten.
  async function act(key, fn, affected = ['wallet', 'rewards', 'notifications']) {
    setBusy(key); setActionError('');
    try {
      await fn();
      affected.forEach((name) => resources[name]?.reload());
      return true;
    } catch (err) {
      setActionError(err.message || 'That action could not be completed');
      return false;
    } finally {
      setBusy('');
    }
  }

  const inviteLink = invite.data?.code
    ? new URL('/?ref=' + encodeURIComponent(invite.data.code), window.location.origin).href
    : '';

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true); window.setTimeout(() => setCopied(false), 1500);
    } catch { setActionError('Could not copy the invite link'); }
  }

  function updateSettings(patch) {
    // Optimistic: reflect the toggle immediately, roll back if the save fails.
    const previous = settings.data;
    settings.mutate((prev) => ({ ...prev, ...patch }));
    act('settings', () => backend.saveSettings(patch), ['settings']).then((saved) => {
      if (!saved) settings.mutate(previous);
    });
  }

  function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    act('avatar', async () => {
      const result = await backend.uploadAvatar(file);
      profile.mutate((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
    }, ['profile']);
  }

  const refreshAll = useCallback(() => {
    Object.values(resources).forEach((r) => r.reload());
  }, [resources]);

  async function logout() {
    if (busy === 'logout') return;
    setBusy('logout');
    try { await backend.logout(); }
    catch { /* The logout API also clears the local session when offline. */ }
    finally { navigate('/', {replace: true}); }
  }

  return <main className="hub">
    {['overview','ranks','rewards','missions'].includes(tab)&&<h1 className="hub__sr-only">{tab==='overview'?'Player profile':tab==='ranks'?'Leaderboard':tab==='rewards'?'Loot':'Missions'}</h1>}
    {!['overview','ranks','rewards','missions'].includes(tab) && <header className="hub__header">
      {!['settings', 'notifications'].includes(tab) && <button className="hub__back" onClick={() => navigate(tab === 'missions' ? '/profile' : '/Home')} aria-label="Go back"><ArrowLeft size={21} /></button>}
      <div><span className="hub__eyebrow">{appConfig.branding?.appName || 'PLAYLOOT'}</span><h1>{tab === 'notifications' ? 'Notifications' : tab === 'ranks' ? 'Leaderboard' : tab === 'overview' ? 'Player profile' : tab === 'rewards' ? 'Loot' : tab === 'missions' ? 'Missions' : 'Settings'}</h1></div>
      {!['settings', 'notifications'].includes(tab) && <button className="hub__back" onClick={refreshAll} aria-label="Refresh your account">↻</button>}
      {tab !== 'settings' && <button className="hub__back" onClick={() => navigate('/notifications')} aria-label="Open notifications"><NotificationButtonIcon size={20} /></button>}
    </header>}

    {actionError && <div className="hub__error" role="alert">{actionError}</div>}

    <div className="hub__body">
      {(tab === 'notifications' || tab === 'settings') && <ReminderSettings/>}
      {tab === 'notifications' && <section className="neo-panel">
        <div className="neo-heading"><h2>Your updates</h2><button className="hub__back" onClick={notifications.reload} aria-label="Refresh notifications">↻</button></div>
        <ResourceGate resource={notifications} label="notifications" emptyWhen={d => !d.items?.length} emptyState={<p>No notifications yet. Your reward updates will appear here.</p>}>
          <div className="hub-scroll-list" tabIndex={0} role="region" aria-label="All notifications">{notifications.data.items.map(n => <div className="neo-activity" key={n.id}><span className="neo-game-icon"><Bell/></span><div><b>{n.text}</b>{n.path&&['/Home','/offers','/missions','/events','/leaderboard','/redeem'].includes(n.path)?<a href={n.path}>Open announcement →</a>:<small>Player update</small>}</div><time>{date(n.at)}</time></div>)}</div>
        </ResourceGate>
      </section>}
      {['overview','ranks','rewards'].includes(tab) && <AdPlacement slot={tab === 'overview' ? 'profile' : tab === 'ranks' ? 'ranks' : 'loot'} />} 
      {tab === 'overview' && <ProfileOverview appConfig={appConfig} profile={profile} wallet={wallet} daily={daily} notifications={notifications} busy={busy} uploadAvatar={uploadAvatar} act={act} navigate={navigate} />}

      {tab === 'missions' && <>
        <RewardsBanner variant="missions"/>
        <section className="hub__card" id="daily-missions">
          <div className="hub__section-head"><h2>Daily missions</h2><span>Earn coins</span></div>
          <ResourceGate resource={missions} label="missions" minHeight="100px" emptyWhen={(d) => !d.missions?.length} emptyState={<p>No missions are running today. Check back tomorrow.</p>}>
            <div className="hub__mission-list">
              {missions.data.missions.map(m => <div className="hub__mission" key={m.id}>
                <div>
                  <strong>{m.title}</strong>
                  <small>{m.progress}/{m.target} complete · +{m.reward} coins</small>
                  <div className="hub__track"><span style={{ width: `${100 * (m.progress / m.target)}%` }} /></div>
                </div>
                <button disabled={m.claimed || m.progress < m.target || !!busy} onClick={() => act(m.id, () => backend.claimMission(m.id), ['missions', 'wallet', 'rewards', 'notifications'])}>
                  {m.claimed ? 'Claimed' : busy === m.id ? 'Wait…' : 'Claim'}
                </button>
              </div>)}
            </div>
          </ResourceGate>
        </section>

        <section className="hub__card referral-panel">
          <div className="referral-panel__art" aria-hidden="true">
            <img src="/playloot-art/trophies.png" alt="" />
            <img src="/playloot-art/mystery.png" alt="" />
          </div>
          <div className="hub__section-head"><h2>Invite friends. <span>Earn more rewards.</span></h2></div>
          <p><img className="referral-panel__coin" src="/playloot-art/coin.png" alt="" /> Earn 200 coins after a friend joins and claims their first play reward.</p>
          <ResourceGate resource={invite} label="your invite code" minHeight="70px">
            <div className="hub__invite">
              <input aria-label="Referral link" readOnly value={inviteLink} placeholder="Referral link unavailable" />
              <button onClick={copyInvite} disabled={!inviteLink}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Copied' : 'Copy Link'}</button>
            </div>
            <small>{invite.data.referrals ?? 0} friends invited</small>
          </ResourceGate>
        </section>
      </>}

      {tab === 'ranks' && <LeaderboardView appConfig={appConfig} leaderboard={leaderboard} navigate={navigate} />}

      {tab === 'rewards' && <>
        <CoinConversion />
        <div className="loot-card-pair">
          <section className="hub__card" hidden={appConfig.screens?.loot?.sections?.redeem === false}>
            <div className="hub__section-head">
              <h2>Cashout offers</h2>
              <ResourceGate resource={wallet} label="your balance" minHeight="0">
                <span>{(wallet.data.coins ?? 0).toLocaleString()} coins</span>
              </ResourceGate>
            </div>
            <ResourceGate resource={redeem} label="cashout offers" minHeight="100px" emptyWhen={(d) => !d.options?.length} emptyState={<p>No cashout offers are available right now.</p>}>
              <div className="hub-scroll-list hub-scroll-list--offers" tabIndex={0} role="region" aria-label="Cashout offers">{redeem.data.options.map(o => <div className="hub__row" key={o.id}>
                <Gift size={18} />
                <span>{o.category} {o.amount}<small>{o.coinsRequired.toLocaleString()} coins</small></span>
                <button disabled={(wallet.data.coins ?? 0) < o.coinsRequired || !!busy} onClick={() => act(o.id, () => backend.redeem(o.id), ['wallet', 'rewards', 'notifications'])}>Redeem</button>
              </div>)}</div>
            </ResourceGate>
          </section>

          <section className="hub__card" hidden={appConfig.screens?.loot?.sections?.rewards === false}>
            <h2>Reward history</h2>
            <ResourceGate resource={rewards} label="reward history" minHeight="70px" emptyWhen={(d) => !d.rewards?.length} emptyState={<p>Rewards you earn will show up here.</p>}>
              <div className="hub-scroll-list" tabIndex={0} role="region" aria-label="Reward history">{rewards.data.rewards.map(r => <div className="hub__row" key={r.id}>
                <Coins size={18} /><span>{r.source}</span><strong>+{r.amount} {r.kind}</strong>
              </div>)}</div>
            </ResourceGate>
          </section>
        </div>

        <section className="hub__card" hidden={appConfig.screens?.loot?.sections?.rewards === false}>
          <h2>Recent claims</h2>
          <ResourceGate resource={rewards} label="your claims" minHeight="70px" emptyWhen={(d) => !d.claims?.length} emptyState={<p>No claims yet.</p>}>
            <div className="hub-scroll-list" tabIndex={0} role="region" aria-label="Recent claims">{rewards.data.claims.map(c => <div className="hub__row" key={c.id}>
              <Gift size={18} />
              <span>{c.option?.category} {c.option?.amount}<small>{c.status}</small></span>
              <small>{date(c.at)}</small>
            </div>)}</div>
          </ResourceGate>
        </section>
      </>}

      {tab === 'settings' && <>
        <section className="hub__card">
          <h2>Game settings</h2>
          <ResourceGate resource={settings} label="settings" minHeight="160px">
            <label className="hub__setting">Online status<input type="checkbox" checked={settings.data.online} disabled={busy === 'settings'} onChange={e => updateSettings({ online: e.target.checked })} /></label>
            <label className="hub__setting">Stealth mode<input type="checkbox" checked={settings.data.stealth} disabled={busy === 'settings'} onChange={e => updateSettings({ stealth: e.target.checked })} /></label>
            <label className="hub__setting">Graphics
              <select value={settings.data.graphics} disabled={busy === 'settings'} onChange={e => updateSettings({ graphics: e.target.value })}>
                {['auto', 'low', 'medium', 'high'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="hub__setting">Frame rate
              <select value={settings.data.fps} disabled={busy === 'settings'} onChange={e => updateSettings({ fps: Number(e.target.value) })}>
                {[30, 60, 90, 120].map(x => <option key={x} value={x}>{x} FPS</option>)}
              </select>
            </label>
          </ResourceGate>
        </section>

        <section className="hub__card">
          <h2>Privacy & rewards</h2>
          <ResourceGate resource={settings} label="privacy settings" minHeight="90px">
            <label className="hub__setting">Private profile<input type="checkbox" checked={settings.data.privateProfile} disabled={busy === 'settings'} onChange={e => updateSettings({ privateProfile: e.target.checked })} /></label>
            <label className="hub__setting">Reward alerts<input type="checkbox" checked={settings.data.rewardAlerts} disabled={busy === 'settings'} onChange={e => updateSettings({ rewardAlerts: e.target.checked })} /></label>
          </ResourceGate>
        </section>

        <ResourceGate resource={settings} label="two-step authentication" minHeight="120px">
          <TwoStepSettings settings={settings.data} reload={settings.reload} />
        </ResourceGate>
        <section className="hub__card settings-session">
          <div><h2>Your session</h2><p>Sign out of Playloot on this device.</p></div>
          <button type="button" className="settings-logout" onClick={logout} disabled={busy === 'logout'}><LogOut size={18} aria-hidden="true"/>{busy === 'logout' ? 'Logging out…' : 'Log out'}</button>
        </section>
      </>}
    </div>
  </main>;
}
