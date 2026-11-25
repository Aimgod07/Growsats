import DesktopExtras from './components/DesktopExtras';
import SiteFooter from './components/SiteFooter';
import './styles/responsive-app.css';
import './styles/playloot-palette.css';
import './styles/typography.css';
import {ReminderLifecycle} from './components/ReminderSettings';
import NotificationWelcome from './components/NotificationWelcome';
import AppLoader, { LoadingScreen } from './components/AppLoader';
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import {LiveFeaturesProvider} from './components/LiveFeatures';
import { backend, isSignedIn } from "./utils/api";
import AppBottomNav from "./components/AppBottomNav";
import { AppConfigProvider } from "./config/appConfig";
import {WalletProvider} from './components/WalletState';

const AllGames=lazy(()=>import('./pages/AllGames'));
const StitchFrame=lazy(()=>import('./components/StitchFrame'));
const PlayerHub=lazy(()=>import('./pages/PlayerHub'));
const PublicPlayerProfile=lazy(()=>import('./pages/PublicPlayerProfile'));
const Events=lazy(()=>import('./pages/Events'));
const Offers=lazy(()=>import('./pages/Offers'));
const Transactions=lazy(()=>import('./pages/Transactions'));
const ComingSoon=lazy(()=>import('./pages/ComingSoon'));

const pagesWithoutDesktopExtras = new Set(['/home', '/profile', '/profile/settings', '/notifications', '/leaderboard', '/redeem', '/transactions']);

function RequireAuth({ children }) {
  const location = useLocation();
  const [verified, setVerified] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isSignedIn()) return;
    let active = true;
    backend.me().then(() => { if (active) setVerified(true); }).catch((error) => { if (active) setVerified(error.status === 401 ? false : 'offline'); });
    return () => { active = false; };
  }, [retry]);
  if (!isSignedIn() || verified === false) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (verified === null) return <LoadingScreen title="Loading your account" detail="Checking your session…" />;
  if (verified === 'offline') return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0e1017', color: '#fff', textAlign: 'center' }}><div><p>Couldn’t connect to Playloot.</p><button onClick={() => { setVerified(null); setRetry(value => value + 1); }}>Try again</button></div></div>;
  const pagePath = location.pathname.replace(/\/+$/, '').toLowerCase();
  const hideDesktopExtras = pagesWithoutDesktopExtras.has(pagePath) || pagePath === '/events' || pagePath.startsWith('/events/') || pagePath === '/missions' || (pagePath === '/offers' && new URLSearchParams(location.search).get('reward') === 'diamonds');
  return <div className="app-workspace" data-page={pagePath}>{!hideDesktopExtras && <DesktopExtras/>}{children}{pagePath !== '/home' && <SiteFooter/>}<AppBottomNav /></div>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppConfigProvider>
      <LiveFeaturesProvider>
      <Router>
        <AppLoader />
        <WalletProvider>
        <ReminderLifecycle/>
        <NotificationWelcome/>
        <Suspense fallback={<LoadingScreen title="Opening your page" detail="Just a moment…"/>}>
        <Routes>
          <Route path="/coming-soon/:feature" element={<RequireAuth><ComingSoon/></RequireAuth>}/>
          <Route path="/transactions" element={<RequireAuth><Transactions/></RequireAuth>}/>
          <Route path="/notifications" element={<RequireAuth><PlayerHub initialTab="notifications"/></RequireAuth>}/>
          <Route path="/offers" element={<RequireAuth><Offers/></RequireAuth>}/>
          <Route path="/events" element={<RequireAuth><Events/></RequireAuth>}/>
          <Route path="/events/:eventId" element={<RequireAuth><Events/></RequireAuth>}/>
          <Route path="/" element={<Login />} />
          <Route
            path="/Home"
            element={
              <RequireAuth>
                <StitchFrame screen="arcade" />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <PlayerHub />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/settings"
            element={
              <RequireAuth>
                <PlayerHub initialTab="settings" />
              </RequireAuth>
            }
          />
          <Route
            path="/missions"
            element={
              <RequireAuth>
                <PlayerHub initialTab="missions" />
              </RequireAuth>
            }
          />
          <Route
            path="/redeem"
            element={
              <RequireAuth>
                <PlayerHub initialTab="rewards" />
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <RequireAuth>
                <PlayerHub initialTab="ranks" />
              </RequireAuth>
            }
          />
          <Route
            path="/players/:playerId"
            element={
              <RequireAuth>
                <PublicPlayerProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/tournaments"
            element={
              <RequireAuth>
                <ComingSoon feature="tournaments" />
              </RequireAuth>
            }
          />
          <Route
            path="/avatar"
            element={
              <RequireAuth>
                <StitchFrame screen="avatarSelector" />
              </RequireAuth>
            }
          />
          <Route
            path="/avatar/loadout"
            element={
              <RequireAuth>
                <StitchFrame screen="avatarLoadout" />
              </RequireAuth>
            }
          />
          <Route
            path="/all-games"
            element={
              <RequireAuth>
                <AllGames />
              </RequireAuth>
            }
          />
          <Route path="/hub" element={<RequireAuth><PlayerHub /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </WalletProvider>
      </Router>
      </LiveFeaturesProvider>
      </AppConfigProvider>
    </ErrorBoundary>
  );
}
