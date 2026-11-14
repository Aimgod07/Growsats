import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { getLoadingSnapshot, subscribeLoading, clearLoadingErrors } from '../utils/loading';
import './app-loader.css';

export function LoadingScreen({ title = 'Getting your arcade ready', detail = 'Loading games and your latest updates…', children, busy = true }) {
  return <div className="app-loader" role="status" aria-live="polite" aria-busy={busy}>
    <div className="app-loader__content">
      <div className="app-loader__orbit" aria-hidden="true"><span>ϟ</span></div>
      <small>PLAYLOOT</small><h1>{title}</h1><p>{detail}</p>
      {busy && <div className="app-loader__track" aria-hidden="true"><i /></div>}
      {children}
    </div>
  </div>;
}

function RouteLoader() {
  const { pending, errors, version } = useSyncExternalStore(subscribeLoading, getLoadingSnapshot);
  const [done, setDone] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => { clearLoadingErrors(); const timer = setTimeout(() => setSlow(true), 25000); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (done || pending || errors.length) return;
    // Allow dependent requests and iframe startup to register before revealing.
    const timer = setTimeout(() => setDone(true), 350);
    return () => clearTimeout(timer);
  }, [pending, errors.length, version, done]);
  if (done) return null;
  const failed = !pending && errors.length > 0;
  return <LoadingScreen busy={!failed && !slow} title={failed ? 'Couldn’t load everything' : slow ? 'Taking a little longer' : undefined}
    detail={failed ? 'Check your connection and try again, or continue with the available content.' : slow ? 'Some content is still loading. You can retry or continue.' : undefined}>
    {(failed || slow) && <div className="app-loader__actions">
      <button onClick={() => window.location.reload()}>Try again</button>
      <button onClick={() => setDone(true)}>Continue</button>
    </div>}
  </LoadingScreen>;
}

export default function AppLoader() {
  const location = useLocation();
  return <RouteLoader key={location.key + location.pathname} />;
}
