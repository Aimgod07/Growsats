import DesktopExtras from './components/DesktopExtras';
import './styles/responsive-app.css';
import {ReminderLifecycle} from './components/ReminderSettings';
import NotificationWelcome from './components/NotificationWelcome';
import AppLoader, { LoadingScreen } from './components/AppLoader';
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import AllGames from "./pages/AllGames";
import Login from "./pages/Login";
import StitchFrame from "./components/StitchFrame";
import PlayerHub from "./pages/PlayerHub";
import PublicPlayerProfile from "./pages/PublicPlayerProfile";
import Events from './pages/Events';
import Offers from './pages/Offers';
import Transactions from './pages/Transactions';
import ComingSoon from './pages/ComingSoon';
import {LiveFeaturesProvider} from './components/LiveFeatures';
import { backend, isSignedIn } from "./utils/api";
import AppBottomNav from "./components/AppBottomNav";
import { AppConfigProvider } from "./config/appConfig";
import {WalletProvider} from './components/WalletState';

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
  return <div className="app-workspace">{location.pathname !== "/Home" && <DesktopExtras/>}{children}<AppBottomNav /></div>;
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
                <Events />
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
        </WalletProvider>
      </Router>
      </LiveFeaturesProvider>
      </AppConfigProvider>
    </ErrorBoundary>
  );
}
