import {useEffect,useState} from 'react';
import {Coins, Gem, Plus, Bell, UserRound} from 'lucide-react';
import {useWallet} from './WalletState';
import {backend} from '../utils/api';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppConfig } from "../config/appConfig";

const ROUTES = { arcade: "/Home", ranks: "/leaderboard", events: "/events", loot: "/redeem", profile: "/profile" };

export default function AppBottomNav() {
  const config = useAppConfig();
  const wallet=useWallet();
  const [profile,setProfile]=useState(null);
  useEffect(()=>{let active=true;backend.profile().then(p=>{if(active)setProfile(p)}).catch(()=>{});return()=>{active=false}},[]);
  const navigate = useNavigate();
  const location = useLocation();
  if (config.navigation?.enabled === false) return null;
  const configuredItems = config.navigation?.items || [];
  const itemsWithEvents = configuredItems.some(item => item.id === 'events')
    ? configuredItems
    : [...configuredItems.slice(0, 2), { id: 'events', label: 'Events', icon: 'emoji_events', enabled: true }, ...configuredItems.slice(2)];
  const items = itemsWithEvents.filter((item) => {
    const screen = item.id === "arcade" ? "arcade" : item.id === "ranks" ? "ranks" : item.id === "events" ? "events" : item.id === "loot" ? "loot" : "profile";
    return item.enabled !== false && config.screens?.[screen]?.enabled !== false && ROUTES[item.id];
  });
  if (!items.length) return null;
  return <><header className="website-header"><Link className="website-brand" to="/Home"><span aria-hidden="true">ϟ</span>{config.branding?.appName || "PLAYLOOT"}</Link><nav aria-label="Website navigation">{items.map(item=><Link key={item.id} to={ROUTES[item.id]} aria-current={location.pathname===ROUTES[item.id]?"page":undefined}>{item.label}</Link>)}</nav><div className="website-account"><Link className="website-balance" to="/missions" aria-label="Earn coins"><Coins size={18}/><b>{wallet.error?'—':Number(wallet.data.coins||0).toLocaleString()}</b><Plus size={17}/></Link><Link className="website-balance website-balance--gems" to="/offers?reward=diamonds" aria-label="Find diamond offers"><Gem size={18}/><b>{wallet.error?'—':Number(wallet.data.diamonds||0).toLocaleString()}</b><Plus size={17}/></Link><Link className="website-icon" to="/notifications" aria-label="Notifications"><Bell size={22}/></Link><Link className="website-icon website-avatar" to="/profile" aria-label="Your profile">{profile?.avatarUrl?<img src={profile.avatarUrl} alt="" onError={e=>{e.currentTarget.style.display='none'}}/>:<UserRound size={22}/>}</Link></div><Link className="website-offers" to="/offers">Explore offers <span aria-hidden="true">↗</span></Link></header><nav className="pms-bottom-nav" aria-label="Main navigation" style={{
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
        || (item.id === "events" && (location.pathname.startsWith("/events") || location.pathname === '/tournaments'))
        || (item.id === "profile" && (location.pathname === "/missions" || location.pathname.startsWith("/profile/")));
      return <button key={item.id} type="button" aria-current={active ? "page" : undefined} onClick={() => navigate(ROUTES[item.id])} style={{
        border: 0, borderRadius: 12, background: active ? item.activeBackgroundColor || "rgba(76,215,246,.12)" : item.backgroundColor || "transparent",
        color: active ? item.activeTextColor || config.branding?.accent || "#4cd7f6" : item.textColor || "#aeb6c7", display: "grid", placeItems: "center", gap: 2,
        font: "700 11px Inter, sans-serif", cursor: "pointer", minWidth: 0, overflow: "hidden", padding: "5px 2px",
      }}>{item.iconUrl ? <img src={item.iconUrl} alt="" aria-hidden="true" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <span className="material-symbols-outlined" aria-hidden="true" style={{
        display: "block", width: 25, height: 25, overflow: "hidden", whiteSpace: "nowrap", flexShrink: 0,
        fontFamily: "'Material Symbols Outlined'", fontSize: 23, fontWeight: "normal", lineHeight: "25px",
        fontStyle: "normal", letterSpacing: "normal", textTransform: "none", fontFeatureSettings: "'liga'",
      }}>{item.icon}</span>}<span style={{ display: "block", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span></button>;
    })}
  </nav></>;
}
