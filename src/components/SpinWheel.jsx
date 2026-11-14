import { useEffect, useMemo, useRef, useState } from "react";
import { backend } from "../utils/api";
import "../styles/spin-polish.css";

const SEGMENTS = [
  { id: "coins-50", kind: "coins", label: "50", sub: "Coins", color: "#1d1f2a", text: "#4cd7f6" },
  { id: "coins-100", kind: "coins", label: "100", sub: "Coins", color: "#6001d1", text: "#ffffff" },
  { id: "coins-250", kind: "coins", label: "250", sub: "Coins", color: "#1d1f2a", text: "#ffb95f" },
  { id: "gems-5", kind: "diamonds", label: "5", sub: "Gems", color: "#e79400", text: "#2a1700" },
  { id: "coins-500", kind: "coins", label: "500", sub: "Coins", color: "#1d1f2a", text: "#d2bbff" },
  { id: "gems-10", kind: "diamonds", label: "10", sub: "Gems", color: "#06b6d4", text: "#003640" },
  { id: "gems-25", kind: "diamonds", label: "25", sub: "Gems", color: "#1d1f2a", text: "#4cd7f6" },
  { id: "jackpot", kind: "coins", label: "2500", sub: "Jackpot", color: "#ffb95f", text: "#2a1700" },
];

export default function SpinWheel({ onClose }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [spinsLeft, setSpinsLeft] = useState(null);
  const [spinError, setSpinError] = useState(null);
  const spinRef = useRef(0);
  const timerRef = useRef(null);
  const dialogRef = useRef(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('button')?.focus();
    backend
      .spinStatus()
      .then((status) => setSpinsLeft(status.alreadySpunToday ? 0 : 1))
      .catch(() => {
        setSpinsLeft(0);
        setSpinError("Couldn't check your spin. Close and try again.");
      });
    return () => { window.clearTimeout(timerRef.current); previous?.focus(); };
  }, []);

  function handleDialogKey(event) {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const gradient = useMemo(() => {
    const step = 360 / SEGMENTS.length;
    const parts = SEGMENTS.map(
      (s, i) => `${s.color} ${i * step}deg ${(i + 1) * step}deg`
    );
    return `conic-gradient(from ${-step / 2}deg, ${parts.join(", ")})`;
  }, []);

  const handleSpin = async () => {
    if (spinning || !spinsLeft) return;
    setSpinning(true);
    setResult(null);
    setSpinError(null);

    let prize;
    try {
      const response = await backend.spin();
      prize = SEGMENTS.find((segment) => segment.id === response.prize.id) || SEGMENTS[0];
    } catch (err) {
      setSpinning(false);
      if (err.status === 409) setSpinsLeft(0);
      setSpinError(err.message || "Couldn't complete the spin. Try again tomorrow.");
      return;
    }

    const idx = Math.max(0, SEGMENTS.indexOf(prize));
    const step = 360 / SEGMENTS.length;
    // Pointer sits at top (0deg); land segment centre under it.
    const target = 360 * 6 + (360 - idx * step - step / 2);
    const next = spinRef.current - (spinRef.current % 360) + target;
    spinRef.current = next;
    setRotation(next);
    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      setSpinsLeft(0);
    }, reducedMotion ? 100 : 4200);
  };

  return (
    <div className="spin-dialog" ref={dialogRef} onKeyDown={handleDialogKey} style={styles.backdrop} role="dialog" aria-modal="true" aria-label="Lucky Spin Vault">
      <style>{`@keyframes spinPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      <div className="spin-dialog__card" style={styles.card}>
        <button type="button" onClick={onClose} aria-label="Close spin wheel" style={styles.close}>
          ✕
        </button>
        <p style={styles.kicker}>Lucky Spin Vault</p>
        <h2 style={styles.title}>
          {spinsLeft === null ? "Checking your spin" : spinsLeft ? "1 Free Daily Spin" : "See you tomorrow"}
        </h2>

        <div className="spin-dialog__wheel-wrap" style={styles.wheelWrap}>
          <div style={styles.pointer} aria-hidden="true" />
          <div
            className="spin-dialog__wheel" style={{
              ...styles.wheel,
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning && !reducedMotion
                ? "transform 4.2s cubic-bezier(0.12, 0.8, 0.08, 1)"
                : "none",
            }}
          >
            {SEGMENTS.map((s, i) => (
              <span
                key={s.label + i}
                style={{
                  ...styles.segLabel,
                  transform: `rotate(${i * 45}deg) translateY(var(--spin-label-radius, -104px))`,
                  color: s.text,
                }}
              >
                <strong style={styles.segMain}>{s.label}</strong>
                <small style={styles.segSub}>{s.sub}</small>
              </span>
            ))}
            <span style={styles.hubDot} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || !spinsLeft}
            style={{
              ...styles.hub,
              opacity: spinning || !spinsLeft ? 0.55 : 1,
              cursor: spinning || !spinsLeft ? "default" : "pointer",
            }}
          >
            {spinning ? "..." : "SPIN"}
          </button>
        </div>

        {result ? (
          <div role="status" style={{ ...styles.result, animation: "spinPop 240ms ease-out" }}>
            <p style={styles.resultText}>
              You won <strong>{result.label} {result.sub}</strong> 🎉
            </p>
            <button type="button" onClick={onClose} style={styles.claim}>
              Claim & Close
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || !spinsLeft}
            style={{
              ...styles.spinCta,
              opacity: spinning || !spinsLeft ? 0.5 : 1,
            }}
          >
            {spinning ? "Spinning…" : spinsLeft ? "Tap to Spin" : "No spins left today"}
          </button>
        )}

        {spinError && <p style={styles.errorText}>{spinError}</p>}
      </div>
    </div>
  );
}

const styles = {
  errorText: {
    margin: "12px 0 0",
    fontSize: "12px",
    lineHeight: 1.45,
    textAlign: "center",
    color: "#ff9b8f",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    backgroundColor: "rgba(5, 6, 12, 0.78)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    position: "relative",
    width: "min(92vw, 340px)",
    borderRadius: "20px",
    padding: "22px 20px 20px",
    background: "linear-gradient(160deg, #25204c, #121429)",
    border: "1px solid rgba(76, 215, 246, 0.25)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    textAlign: "center",
  },
  close: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "30px",
    height: "30px",
    borderRadius: "10px",
    border: "1px solid #2c2c46",
    background: "#1c1c30",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },
  kicker: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#4cd7f6",
  },
  title: {
    margin: "6px 0 14px",
    fontSize: "17px",
    fontWeight: 800,
    color: "#fff",
  },
  wheelWrap: {
    position: "relative",
    width: "280px",
    height: "280px",
    margin: "0 auto",
  },
  pointer: {
    position: "absolute",
    top: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "12px solid transparent",
    borderRight: "12px solid transparent",
    borderTop: "20px solid #ffb95f",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
    zIndex: 2,
  },
  wheel: {
    position: "relative",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    border: "6px solid #ffb95f",
    boxShadow: "0 0 0 4px #121429, 0 0 32px rgba(255,185,95,0.35)",
    overflow: "hidden",
  },
  segLabel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "60px",
    marginLeft: "-30px",
    marginTop: "-18px",
    height: "36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 800,
    lineHeight: 1.1,
    pointerEvents: "none",
  },
  segMain: { fontSize: "12px", fontWeight: 800 },
  segSub: { fontSize: "9px", fontWeight: 700, opacity: 0.85 },
  hubDot: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "10px",
    height: "10px",
    marginLeft: "-5px",
    marginTop: "-5px",
    borderRadius: "50%",
    background: "#121429",
  },
  hub: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "74px",
    height: "74px",
    borderRadius: "50%",
    border: "3px solid #fff",
    background: "linear-gradient(160deg, #d2bbff, #6001d1)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 900,
    letterSpacing: "0.06em",
    boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
  },
  spinCta: {
    marginTop: "16px",
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "#35cbe2",
    color: "#10101c",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  result: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(53,203,226,0.1)",
    border: "1px solid rgba(53,203,226,0.3)",
  },
  resultText: { margin: "0 0 10px", color: "#fff", fontSize: "14px" },
  claim: {
    width: "100%",
    padding: "11px",
    borderRadius: "10px",
    border: "none",
    background: "#35cbe2",
    color: "#10101c",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
};
