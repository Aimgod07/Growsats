import { useMemo } from "react";

export const CLAIM_THRESHOLD_SECONDS = 120;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const styles = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "8px",
    backgroundColor: "#1c1c30",
    border: "1px solid #2c2c46",
    color: "#d4ff3e",
    fontSize: "12.5px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#d4ff3e",
    boxShadow: "0 0 6px rgba(212,255,62,0.8)",
    flexShrink: 0,
  },
  claimBtn: {
    background: "#d4ff3e",
    border: "none",
    color: "#10101c",
    fontSize: "12.5px",
    fontWeight: 800,
    borderRadius: "8px",
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    animation: "gameTimerClaimPulse 1.4s ease-in-out infinite",
  },
};

const claimCSS = `
  @keyframes gameTimerClaimPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(212,255,62,0.5); }
    50% { box-shadow: 0 0 0 6px rgba(212,255,62,0); }
  }
`;

// Shows the running elapsed time. Once elapsedSeconds crosses
// claimThreshold (default 120s / 2 minutes), a pulsing "Claim" button
// appears next to it. Tapping it fires onClaim.
export default function GameTimerBadge({
  elapsedSeconds,
  onClaim,
  claimThreshold = CLAIM_THRESHOLD_SECONDS,
}) {
  const canClaim = elapsedSeconds >= claimThreshold;
  const display = useMemo(() => formatTime(elapsedSeconds), [elapsedSeconds]);

  return (
    <div style={styles.wrap}>
      <style>{claimCSS}</style>
      <span style={styles.badge}>
        <span style={styles.dot} aria-hidden="true" />
        {display}
      </span>
      {canClaim && (
        <button type="button" style={styles.claimBtn} onClick={onClaim}>
          🎁 Claim
        </button>
      )}
    </div>
  );
}