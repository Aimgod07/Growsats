import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { GameWebView as NativeGameWebView, launchGameOverlay } from "./gameWebView";
import { useGameTimer } from "./Usegametimer";
import GameTimerBadge, { CLAIM_THRESHOLD_SECONDS } from "./GameTimerBadge";

const CLOSE_BAR_HEIGHT = 60; 
function computeOverlayRect(safeArea) {
  const top = CLOSE_BAR_HEIGHT + (safeArea?.top || 0);
  const bottom = safeArea?.bottom || 0;
  return {
    x: 0,
    y: top,
    width: window.innerWidth,
    height: Math.max(0, window.innerHeight - top - bottom),
  };
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
    backgroundColor: "#10101c",
    zIndex: 9998,
    textAlign: "center",
    padding: "0 24px",
  },
  iframeWrap: {
    position: "fixed",
    top: `${CLOSE_BAR_HEIGHT}px`,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9997,
    backgroundColor: "#10101c",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },
};

export default function GameWebViewOverlay({ game, onClose }) {
  const [status, setStatus] = useState("loading");
  const listenersRef = useRef([]);
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  const elapsedSeconds = useGameTimer(game?.id ?? null);

  const teardownNative = useCallback(async () => {
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
    if (isNative) await teardownNative();
    onClose();
  }, [isNative, teardownNative, onClose]);


  const handleClaim = useCallback(async () => {
    if (isNative) await teardownNative();
    onClose();
    navigate("/Home");
  }, [isNative, teardownNative, onClose, navigate]);

  useEffect(() => {
    if (!game || !isNative) return;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        const readyHandle = await NativeGameWebView.addListener("game:ready", () => {
          if (!cancelled) setStatus(null);
        });
        const errorHandle = await NativeGameWebView.addListener("game:error", () => {
          if (!cancelled) setStatus("error");
        });
        listenersRef.current = [readyHandle, errorHandle];

        const safeArea = await NativeGameWebView.getSafeArea();
        const rect = computeOverlayRect(safeArea);
        await launchGameOverlay(game.playUrl, rect);
      } catch (err) {
        console.error("Failed to launch native game overlay:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [game, isNative]);


  useEffect(() => {
    if (!game || isNative) return;
    setStatus("loading");
  }, [game, isNative]);

  useEffect(() => {
    if (!game || !isNative) return;

    const handleResize = async () => {
      try {
        const safeArea = await NativeGameWebView.getSafeArea();
        await NativeGameWebView.resize(computeOverlayRect(safeArea));
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


  useEffect(() => {
    return () => {
      if (isNative && game) {
        NativeGameWebView.removeAllListeners().catch(() => {});
        NativeGameWebView.unmount().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!game) return null;

  return (
    <>
      <div style={styles.overlayBar}>
        <span style={styles.overlayTitle}>{game.title}</span>
        <div style={styles.overlayBarRight}>
          <GameTimerBadge
            elapsedSeconds={elapsedSeconds}
            onClaim={handleClaim}
            claimThreshold={CLAIM_THRESHOLD_SECONDS}
          />
          <button type="button" style={styles.overlayCloseBtn} onClick={handleClose}>
            ✕ Close
          </button>
        </div>
      </div>

      {isNative ? (
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
        <div style={styles.iframeWrap}>
          {status === "error" ? (
            <div style={styles.overlayStatus}>
              Couldn't load this game here — try{" "}
              <a
                href={game.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#d4ff3e" }}
              >
                opening it in a new tab
              </a>
              .
            </div>
          ) : (
            <iframe
              key={game.id}
              src={game.playUrl}
              title={game.title}
              style={styles.iframe}
              allow="autoplay; allowfullscreen; gamepad; accelerometer; gyroscope; encrypted-media"
              allowFullScreen
              onLoad={() => setStatus(null)}
              onError={() => setStatus("error")}
            />
          )}
        </div>
      )}
    </>
  );
}