import { Plus, ArrowUpRight, Gamepad2, Trophy, CalendarDays, Medal, Wallet, UserRound } from 'lucide-react';

import { Coins } from './PlaylootIcons';
import { NotificationButtonIcon } from './PlaylootIcons';
import DiamondIcon from './DiamondIcon';
import {useWallet} from './WalletState';

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppConfig } from "../config/appConfig";

const ROUTES = { arcade: "/Home", ranks: "/leaderboard", events: "/events", tournaments: "/tournaments", loot: "/redeem", profile: "/profile" };
const MOBILE_ICONS = { arcade: Gamepad2, ranks: Trophy, events: CalendarDays, tournaments: Medal, loot: Wallet, profile: UserRound };

export default function AppBottomNav() {
  const config = useAppConfig();
  const wallet=useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  if (config.navigation?.enabled === false) return null;
  const configuredItems = config.navigation?.items || [];
  const itemsWithEvents = configuredItems.some(item => item.id === 'events')
    ? configuredItems
    : [...configuredItems.slice(0, 2), { id: 'events', label: 'Events', icon: 'emoji_events', enabled: true }, ...configuredItems.slice(2)];
  const itemsWithTournaments = itemsWithEvents.some(item => item.id === 'tournaments')
    ? itemsWithEvents
    : itemsWithEvents.flatMap(item => item.id === 'events'
      ? [item, { id: 'tournaments', label: 'Tournaments', icon: 'military_tech' }]
      : [item]);
  const items = itemsWithTournaments.filter((item) => {
    return item.enabled !== false && config.screens?.[item.id]?.enabled !== false && ROUTES[item.id];
  });
  if (!items.length) return null;
  return <><header className="website-header"><Link className="website-brand" to="/Home"><span aria-hidden="true">ϟ</span>{config.branding?.appName || "PLAYLOOT"}</Link><nav aria-label="Website navigation">{items.map(item=><Link key={item.id} to={ROUTES[item.id]} aria-current={location.pathname===ROUTES[item.id]?"page":undefined}>{item.label}</Link>)}</nav><div className="website-account"><Link className="website-balance" to="/missions" aria-label="Earn coins"><Coins size={18}/><b>{wallet.error?'—':Number(wallet.data.coins||0).toLocaleString()}</b><Plus size={17}/></Link><Link className="website-balance website-balance--gems" to="/offers?reward=diamonds" aria-label="Find diamond offers"><DiamondIcon size={20}/><b>{wallet.error?'—':Number(wallet.data.diamonds||0).toLocaleString()}</b><Plus size={17}/></Link><Link className="website-icon" to="/notifications" aria-label="Notifications"><NotificationButtonIcon size={22}/></Link></div><Link className="website-offers polished-action polished-action--primary" to="/offers">Browse offers <ArrowUpRight size={16} aria-hidden="true"/></Link></header><nav className="pms-bottom-nav" aria-label="Main navigation" style={{
    position: "fixed", zIndex: 9000, left: "50%", bottom: 0, transform: "translateX(-50%)",
    width: "min(100%, 440px)", minHeight: 70, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, items.length)},1fr)`,
    padding: "8px 10px max(8px, env(safe-area-inset-bottom))", boxSizing: "border-box",
    background: "rgba(14,16,23,.97)", borderTop: "1px solid #252b3b", backdropFilter: "blur(14px)", overflow: "hidden",
  }}>
    {items.map((item) => {
      const active = location.pathname === ROUTES[item.id]
        || (item.id === 'loot' && ['/offers','/transactions'].includes(location.pathname))
          || (item.id === "arcade" && (location.pathname === "/all-games" || location.pathname.startsWith("/coming-soon/")))
        || (item.id === "ranks" && location.pathname.startsWith("/players/"))
        || (item.id === "events" && location.pathname.startsWith("/events/"))
        || (item.id === "profile" && (location.pathname === "/missions" || location.pathname.startsWith("/profile/")));
      const Icon = MOBILE_ICONS[item.id];
      return <button key={item.id} type="button" aria-label={item.label} aria-current={active ? "page" : undefined} onClick={() => navigate(ROUTES[item.id])} style={{
        border: 0, borderRadius: 12, background: active ? "#3a285c" : item.backgroundColor || "transparent",
        color: active ? "#d1b4ff" : item.textColor || "#eee6ff", display: "grid", placeItems: "center", gap: 2,
        font: "700 11px Inter, sans-serif", cursor: "pointer", minWidth: 0, overflow: "hidden", padding: "5px 2px",
      }}><span className="mobile-nav-art" aria-hidden="true"><Icon className="mobile-nav-icon" size={27} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></span><span className="mobile-nav-label">{item.label}</span></button>;
    })}
  </nav></>;
}
