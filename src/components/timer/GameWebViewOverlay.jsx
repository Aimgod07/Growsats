import {useWebInactivity} from './useWebInactivity';
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ExternalLink, Menu } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { backend, getStoredUser } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { GameWebView as NativeGameWebView } from "./gameWebView";
import { useGameTimer } from "./useGameTimer";
import GameTimerBadge, { CLAIM_THRESHOLD_SECONDS } from "./GameTimerBadge";
import { LoadingScreen } from '../AppLoader';
import './game-viewport.css';

const CLOSE_BAR_HEIGHT = 60;
const GAME_MENU_DURATION = 5000;

function protectGameInput(frame) {
  const doc = frame?.contentDocument;
  if (!doc?.head || doc.getElementById('playloot-game-input')) return;
  const style = doc.createElement('style');
  style.id = 'playloot-game-input';
  style.textContent = `
    html, body { overscroll-behavior: none; touch-action: pan-x pan-y; }
    * { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }
    input, textarea, [contenteditable]:not([contenteditable="false"]) { -webkit-user-select: text !important; user-select: text !important; }
  `;
  doc.head.append(style);
  const preventBrowserAction = event => {
    if (!event.target?.closest?.('input, textarea, [contenteditable]:not([contenteditable="false"])')) event.preventDefault();
  };
  for (const type of ['selectstart', 'contextmenu', 'dragstart', 'dblclick']) {
    doc.addEventListener(type, preventBrowserAction, true);
  }
}

function computeOverlayRect() {
  // The native view is attached to android.R.id.content, whose coordinates
  // already exclude the Android system bars. Adding their insets here leaves
  // a visible gap between our close bar and the game surface.
  const top = CLOSE_BAR_HEIGHT;
  return {
    x: 0,
    y: top,
    width: window.innerWidth,
    height: Math.max(0, window.innerHeight - top),
  };
}

export function getGameOrientation() {
  // Apply one orientation policy to every provider and owned game.
  return 'portrait';
}

function waitForViewport(orientation) {
  return new Promise((resolve) => {
    const started=Date.now();
    const check=()=>{
      const matches=orientation==='landscape'
        ? window.innerWidth>window.innerHeight
        : window.innerHeight>=window.innerWidth;
      if(matches||Date.now()-started>2500){resolve();return;}
      window.setTimeout(check,75);
    };
    check();
  });
}

const styles = {
  overlayBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: `${CLOSE_BAR_HEIGHT}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    backgroundColor: "#10101c",
    borderBottom: "1px solid #2c2c46",
    zIndex: 9999,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  overlayTitle: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginRight: "10px",
  },
  overlayBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  overlayOpenBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    color: "#4cd7f6",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  overlayCloseBtn: {
    background: "#1c1c30",
    border: "1px solid #2c2c46",
    color: "#d4ff3e",
    fontSize: "13px",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "6px 12px",
    cursor: "pointer",
  },
  overlayStatus: {
    position: "fixed",
    top: `${CLOSE_BAR_HEIGHT}px`,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9494b0",
    fontSize: "13px",
    backgroundColor: "rgba(8,8,16,0.72)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 9998,
    textAlign: "center",
    padding: "0 24px",
  },
  statusCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    maxWidth: "320px",
    padding: "20px 18px",
    borderRadius: "16px",
    backgroundColor: "#16182a",
    border: "1px solid #2c2c46",
    boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
  },
  statusTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 800,
  },
  statusText: {
    margin: 0,
    color: "#9494b0",
    fontSize: "12.5px",
    lineHeight: 1.5,
  },
  statusBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#4cd7f6",
    color: "#003640",
    fontSize: "12.5px",
    fontWeight: 800,
    cursor: "pointer",
    textDecoration: "none",
  },
};

export default function GameWebViewOverlay({ game: requestedGame, onClose: requestedClose }) {
  const { id, title, playUrl, embedded, orientation, eventId } = requestedGame || {};
  const game = useMemo(() => playUrl ? { id, title, playUrl, embedded, orientation, eventId } : null,
    [id, title, playUrl, embedded, orientation, eventId]);
  // Parent screens refresh wallet/catalog data while playing. A fresh callback
  // must never become a request to destroy and relaunch the native game.
  const closeRef = useRef(requestedClose);
  useEffect(() => { closeRef.current = requestedClose; }, [requestedClose]);
  const onClose = useCallback(() => closeRef.current(), []);
  const cancelLaunchRef = useRef(() => {});
  const actionsRef = useRef({});
  const [nativeMounted, setNativeMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!game) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [game]);
  const [sessionError, setSessionError] = useState(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [loadedGameUrl, setLoadedGameUrl] = useState(null);
  const [slowGame, setSlowGame] = useState(false);
  const [tabBlocked, setTabBlocked] = useState(false);
  const [claimState, setClaimState] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [nativeElapsedSeconds, setNativeElapsedSeconds] = useState(0);
  const playSessionRef = useRef(null);
  const startRequestRef = useRef({ key: null, promise: null });
  const listenersRef = useRef([]);
  const gameFrameRef = useRef(null);
  const lastEventTick = useRef(-1);
  const navigate = useNavigate();
  const launchUrl = game ? new URL(game.playUrl, window.location.href) : null;
  const isOwned = Boolean(launchUrl && launchUrl.pathname.startsWith('/grogames/') &&
    (launchUrl.origin === window.location.origin || launchUrl.origin === 'https://playloot.pages.dev'));
  const isNative = Capacitor.isNativePlatform() && (!game?.embedded || isOwned);
  if (isOwned && isNative && launchUrl.hostname === 'localhost') {
    // The separate Android WebView cannot resolve Capacitor's local asset server.
    launchUrl.protocol = 'https:';
    launchUrl.host = 'playloot.pages.dev';
  }
  if (isOwned && launchUrl) {
    launchUrl.searchParams.set('gameId',game.id);
    launchUrl.searchParams.set('playerId',getStoredUser()?.id || '');
    launchUrl.searchParams.set('parentOrigin',window.location.origin);
  }
  const playableUrl = launchUrl?.href;
  const isEmbeddedWeb = Boolean(game?.embedded && !isNative);
  const isStrikepoint = isOwned && launchUrl?.pathname.startsWith('/grogames/strikepoint/');
  useEffect(() => {
    if (!menuOpen || !isEmbeddedWeb) return;
    const timer = setTimeout(() => setMenuOpen(false), GAME_MENU_DURATION);
    return () => clearTimeout(timer);
  }, [menuOpen, isEmbeddedWeb, playableUrl]);
  useEffect(() => {
    setMenuOpen(false);
    setLoadedGameUrl(null);
    setSlowGame(false);
    if (!playableUrl) return;
    const timer = setTimeout(() => setSlowGame(true), 25000);
    return () => clearTimeout(timer);
  }, [playableUrl]);

  const webElapsedSeconds = useGameTimer(activeSessionId);
  const elapsedSeconds = isNative ? nativeElapsedSeconds : webElapsedSeconds;

  // Keep the server's trusted session clock in sync for native, embedded and
  // external web games. The claim endpoint intentionally uses this clock
  // instead of accepting elapsed time supplied by the client.
  useEffect(() => {
    if (!activeSessionId) return;
    const tick=Math.floor(elapsedSeconds/15);
    if(lastEventTick.current===tick)return;
    lastEventTick.current=tick;
    backend.eventHeartbeat(activeSessionId).catch(()=>{});
  }, [activeSessionId,elapsedSeconds]);
  useEffect(()=>{lastEventTick.current=-1},[activeSessionId]);
  useEffect(()=>{
    if(!game?.embedded||!activeSessionId)return;
    let origin;try{origin=new URL(game.playUrl,window.location.href).origin}catch{return}
    const listener=async(event)=>{
      if(event.source!==gameFrameRef.current?.contentWindow||event.origin!==origin)return;
      if(event.data?.type==='playloot:activity'||event.data?.type==='pocket-arcade:start'||event.data?.type==='pocket-arcade:resume')backend.eventHeartbeat(activeSessionId).catch(()=>{});
      if(event.data?.type==='playloot:idle')onClose();
      if(event.data?.type==='playloot:score'||event.data?.type==='pocket-arcade:end'){
        try{await backend.submitEventScore(activeSessionId,event.data.score,event.data.runId);setClaimState({status:'submitted',message:'Score recorded automatically.'})}
        catch(e){setClaimState({status:'error',message:e.message})}
      }
    };
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[game,activeSessionId,onClose]);

  useEffect(()=>{
    if(!claimState || typeof claimState !== 'object')return;
    const timeout=setTimeout(()=>setClaimState(null),5000);
    return()=>clearTimeout(timeout);
  },[claimState]);

  useEffect(() => {
    if (!game) {
      playSessionRef.current = null;
      setActiveSessionId(null);
      startRequestRef.current = { key: null, promise: null };
      setNativeElapsedSeconds(0);
      return;
    }
    let cancelled = false;
    setSessionError(null);
    setNativeElapsedSeconds(0);
    const gameKey = `${game.id}:${game.playUrl}:${game.eventId || ""}`;
    if (startRequestRef.current.key !== gameKey) {
      playSessionRef.current = null;
      setActiveSessionId(null);
      startRequestRef.current = {
        key: gameKey,
        promise: backend.startPlay(game.id, game.title, isOwned ? 'grogames' : undefined, game.eventId),
      };
    }
    startRequestRef.current.promise
      .then((res) => {
        if (!cancelled && startRequestRef.current.key === gameKey && res?.sessionId) {
          playSessionRef.current = res.sessionId;
          setActiveSessionId(res.sessionId);
        }
      })
      .catch((error) => {
        if (!cancelled && startRequestRef.current.key === gameKey) {
          setClaimState({ status: "error", message: error.message || "Couldn't start this game session." });
          setSessionError(error.message || "Couldn't connect the reward timer.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [game, isOwned, sessionAttempt]);

  const openInNewTab = useCallback(() => {
    const opened = window.open(game.playUrl, "_blank", "noopener,noreferrer");
    if (!opened) setTabBlocked(true);
    else setTabBlocked(false);
  }, [game]);

  // Web: launch straight into a new tab as soon as a game is selected.
  useEffect(() => {
    if (!game || !activeSessionId || isNative || game.embedded) return;
    const opened = window.open(game.playUrl, "_blank", "noopener,noreferrer");
    setTabBlocked(!opened);
  }, [game, isNative, activeSessionId]);

  const teardownNative = useCallback(async () => {
    cancelLaunchRef.current();
    try {
      await NativeGameWebView.removeAllListeners();
    } catch (err) {
      console.error("Failed to remove GameWebView listeners:", err);
    }
    listenersRef.current = [];
    try {
      await NativeGameWebView.unmount();
    } catch (err) {
      console.error("Failed to unmount GameWebView:", err);
    }
    try {
      await NativeGameWebView.lockOrientation({ orientation: "portrait" });
    } catch {
      // non-fatal, plugin may not support this on the current platform
    }
  }, []);

  const handleClose = useCallback(async () => {
    const sessionId = playSessionRef.current;
    if (sessionId) {
      void backend.eventHeartbeat(sessionId).catch(() => {}).then(() => backend.closePlay(sessionId)).catch(() => {});
    } else {
      // Closing while start is in flight must not leave an orphan session.
      void startRequestRef.current.promise?.then(result => result?.sessionId && backend.closePlay(result.sessionId)).catch(() => {});
    }
    if (isNative) await teardownNative();
    onClose();
  }, [isNative, teardownNative, onClose]);

  const handleClaim = useCallback(async () => {
    setClaimState("claiming");

    const playSessionId = playSessionRef.current;

    if (!playSessionId) {
      setClaimState({ status: "error", message: "Game session is still connecting. Try claiming again." });
      return;
    }
    try {
      // Flush the latest server-side play time before claiming. Without this,
      // a tap between scheduled heartbeats can be rejected as "too soon" even
      // though the visible timer has already unlocked the button.
      await backend.eventHeartbeat(playSessionId).catch(() => {});
      const result = await backend.claimPlay(playSessionId);
      if (isNative) await teardownNative();
      setClaimState({
        status: "done",
        message: `+${result.coinsAwarded} coins added to your wallet`,
      });
      setTimeout(() => {
        onClose();
        navigate("/Home");
      }, 1600);
    } catch (err) {
      setClaimState({ status: "error", message: err.message || "Couldn't claim rewards. Try again." });
    }
  }, [isNative, teardownNative, onClose, navigate]);

  useEffect(() => { actionsRef.current = { close: handleClose, claim: handleClaim }; }, [handleClose, handleClaim]);
  useEffect(() => {
    if (!isNative || !nativeMounted) return;
    const coins = Math.floor(Math.max(0, Math.min(elapsedSeconds, 7200) - CLAIM_THRESHOLD_SECONDS) / 60) * 10;
    void NativeGameWebView.updateControls({
      canClaim: elapsedSeconds >= CLAIM_THRESHOLD_SECONDS,
      disabled: claimState === 'claiming' || claimState?.status === 'done',
      claimLabel: claimState === 'claiming' ? 'Claiming…' : `Claim ${coins} coins`,
    }).catch(() => {});
  }, [isNative, nativeMounted, elapsedSeconds, claimState]);
  useEffect(() => {
    if (!isNative || !nativeMounted || !claimState?.message) return;
    void NativeGameWebView.updateControls({ message: claimState.message }).catch(() => {});
  }, [isNative, nativeMounted, claimState]);

  useEffect(() => {
    if (!game || !isNative || !activeSessionId) return;
    let cancelled = false;
    let mounted = false;
    let timerStarted = false;
    const handles = [];
    const cancel = () => { cancelled = true; };
    cancelLaunchRef.current = cancel;
    const listen = async (event, callback) => {
      const handle = await NativeGameWebView.addListener(event, callback);
      if (cancelled) await handle.remove();
      else handles.push(handle);
    };
    setStatus("loading");
    setNativeMounted(false);

    (async () => {
      try {
        await listen("game:ready", () => {
          if (cancelled) return;
          setStatus(null);
          if (!timerStarted) {
            timerStarted = true;
            void NativeGameWebView.showTimer({ direction: 'up' }).catch(() => {});
          }
        });
        if (cancelled) return;
        await listen('game:close', () => { if (!cancelled) void actionsRef.current.close(); });
        if (cancelled) return;
        await listen('game:claim', () => { if (!cancelled) void actionsRef.current.claim(); });
        if (cancelled) return;
        await listen("game:error", () => {
          if (!cancelled) setStatus("error");
        });
        if (cancelled) return;
        await listen("timer:tick", ({ elapsedSeconds: seconds }) => {
          if (!cancelled) setNativeElapsedSeconds(Math.max(0, Number(seconds) || 0));
        });
        if (cancelled) return;
        await listen("game:idle", () => {
          if (cancelled) return;
          void actionsRef.current.close();
        });
        if (cancelled) return;

        const orientation=getGameOrientation(game);
        await NativeGameWebView.lockOrientation({ orientation });
        if (cancelled) return;
        await waitForViewport(orientation);
        if (cancelled) return;
        const rect = computeOverlayRect();
        await listen('game:score', async ({score,runId}) => {
          if(cancelled || !isOwned || !playSessionRef.current)return;
          try { const result=await backend.submitEventScore(playSessionRef.current,score,runId);setClaimState({status:'submitted',message:`Score ${score} saved for ${result.gameId}.`}); }
          catch(e){setClaimState({status:'error',message:e.message});}
        });
        if (cancelled) return;
        mounted = true;
        await NativeGameWebView.mount({ url: playableUrl, title: game.title, ...rect });
        if (!cancelled) setNativeMounted(true);
      } catch (err) {
        console.error("Failed to launch native game overlay:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      for (const handle of handles) void handle.remove().catch(() => {});
      if (mounted) void NativeGameWebView.unmount().catch(() => {});
    };
  }, [game, isNative, isOwned, playableUrl, onClose, teardownNative, activeSessionId]);

  useEffect(() => {
    if (!game || !isNative) return;

    const handleResize = async () => {
      try {
        await waitForViewport(getGameOrientation(game));
        await NativeGameWebView.resize(computeOverlayRect());
      } catch (err) {
        console.error("Failed to resize GameWebView overlay:", err);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [game, isNative]);

  const idleRemaining=useWebInactivity({enabled:!!game&&!isNative&&!!activeSessionId&&(game.embedded?loadedGameUrl===playableUrl:!tabBlocked),sessionId:activeSessionId,frameRef:gameFrameRef,origin:launchUrl?.origin,onClose:handleClose});

  if (!game) return null;

  return (
    <>
      {idleRemaining!==null&&<div role="status" className="game-idle-countdown">Tap to continue - {idleRemaining}s</div>}
      {!sessionError && ((game.embedded && !isNative && (loadedGameUrl !== playableUrl || !activeSessionId)) || (isNative && !nativeMounted && status === 'loading')) &&
        <LoadingScreen title={slowGame ? 'Taking a little longer' : `Opening ${game.title}`} detail={slowGame ? 'The game is still loading. You can close it and try again.' : 'Preparing your game and connecting your session…'}>
          <div className="app-loader__actions" style={{marginTop:24}}><button onClick={handleClose}>Close game</button></div>
        </LoadingScreen>}
      {isEmbeddedWeb && !menuOpen && <button type="button" className="game-overlay-menu" aria-label="Open game menu" aria-expanded={false} onClick={() => setMenuOpen(true)}><Menu size={20} aria-hidden="true" /></button>}
      <div className={isNative ? undefined : "game-overlay-toolbar"} style={{ ...styles.overlayBar, display: (isNative && nativeMounted) || (isEmbeddedWeb && !menuOpen) ? 'none' : 'flex' }}>
        <span style={styles.overlayTitle}>{game.title}</span>
        <div className={isNative ? undefined : "game-overlay-actions"} style={styles.overlayBarRight}>
          <GameTimerBadge
            elapsedSeconds={elapsedSeconds}
            onClaim={handleClaim}
            disabled={claimState === "claiming" || claimState?.status === "done"}
            claimThreshold={CLAIM_THRESHOLD_SECONDS}
          />
          {!isNative && (
            <button
              type="button"
              style={{ ...styles.overlayOpenBtn, background: "none", border: "none", cursor: "pointer" }}
              onClick={openInNewTab}
              aria-label="Open game in a new tab"
              title="Open game in a new tab"
            >
              <ExternalLink size={15} aria-hidden="true" />
              <span>Open game</span>
            </button>
          )}
          <button type="button" style={styles.overlayCloseBtn} onClick={handleClose}>
            ✕ Close
          </button>
        </div>
      </div>

      {sessionError && <div style={{...styles.overlayStatus,zIndex:10001}}>
        <div style={styles.statusCard} role="alert">
          <p style={styles.statusText}>{sessionError}</p>
          <button style={styles.statusBtn} onClick={() => {
            startRequestRef.current = { key: null, promise: null };
            setSessionAttempt(value => value + 1);
          }}>Reconnect reward timer</button>
          <button style={styles.overlayCloseBtn} onClick={handleClose}>Close</button>
        </div>
      </div>}

      {claimState && typeof claimState === 'object' && <div role="status" style={{ ...styles.overlayStatus, bottom: 'auto', minHeight: 62, zIndex: 10000 }}>{claimState.message}</div>}

      {isEmbeddedWeb ? <iframe ref={gameFrameRef} src={playableUrl} title={game.title} onLoad={event => { protectGameInput(event.currentTarget); setLoadedGameUrl(playableUrl); }} allow={isStrikepoint ? "fullscreen; gamepad; accelerometer 'self'; gyroscope 'self'" : "fullscreen; gamepad"} allowFullScreen sandbox="allow-scripts allow-same-origin allow-pointer-lock" style={{position:'fixed',inset:0,width:'100%',height:'100dvh',border:0,zIndex:9998,background:'#10101c'}}/> : isNative ? (
        <>
          {status === "loading" && (
            <div style={styles.overlayStatus}>Loading {game.title}…</div>
          )}
          {status === "error" && (
            <div style={styles.overlayStatus}>
              Couldn't load this game. Try again or tap Close.
            </div>
          )}
        </>
      ) : (
        <div style={styles.overlayStatus}>
          <div style={styles.statusCard}>
            <p style={styles.statusTitle}>{game.title}</p>
            <p style={styles.statusText}>
              {tabBlocked
                ? "Your browser blocked the pop-up. Tap below to launch the game in a new tab."
                : "Playing in a new tab. Keep this tab open to track your play time and claim coins."}
            </p>
            {tabBlocked && (
              <button type="button" style={styles.statusBtn} onClick={openInNewTab}>
                <ExternalLink size={15} aria-hidden="true" />
                <span>Open game</span>
              </button>
            )}
            <button
              type="button"
              style={{ ...styles.overlayCloseBtn, backgroundColor: "transparent" }}
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
