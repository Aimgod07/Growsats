import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { loadTurnstile, resolveTurnstile } from "../utils/turnstile";
import "../styles/turnstile.css";

/**
 * Cloudflare Turnstile widget.
 *
 * Site key resolution and enforcement live in `utils/turnstile`, so this
 * component only has to own the widget lifecycle: mount, hand the token up,
 * and reset when the caller needs a fresh challenge. Tokens are single-use, so
 * `reset()` must be called after any failed submit.
 */
const Turnstile = forwardRef(function Turnstile(
  {
    onToken,
    onError,
    onRequiredChange,
    action,
    theme = "dark",
    siteKey: siteKeyProp,
    className = "",
  },
  ref,
) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  // Callers usually pass plain state setters, but inline arrows must not tear
  // the widget down and re-mint a challenge on every parent render.
  const handlers = useRef({ onToken, onError, onRequiredChange });
  const [state, setState] = useState("loading"); // loading | ready | off | failed

  useEffect(() => {
    handlers.current = { onToken, onError, onRequiredChange };
  });

  const reset = useCallback(() => {
    if (window.turnstile && widgetRef.current !== null) window.turnstile.reset(widgetRef.current);
  }, []);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const resolved = await resolveTurnstile();
      const key = siteKeyProp || resolved.siteKey;

      // Any remount (e.g. the action changed) invalidates the previous token.
      handlers.current.onToken?.("");
      handlers.current.onRequiredChange?.(resolved.required && Boolean(key));

      // Backend has no captcha configured (or is unreachable and no key is
      // pinned) — hide the widget instead of deadlocking the form.
      if (!key || !resolved.required) {
        if (!cancelled) setState("off");
        return;
      }

      try {
        const turnstile = await loadTurnstile();
        if (cancelled) return;
        setState("ready");

        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: key,
          theme,
          ...(action ? { action } : {}),
          callback: (token) => {
            handlers.current.onRequiredChange?.(true);
            handlers.current.onToken?.(token);
          },
          "expired-callback": () => handlers.current.onToken?.(""),
          "error-callback": () => {
            // No token means no sign-in. Never relax this: the requirement is
            // the security gate, so a failed challenge must keep the form shut.
            handlers.current.onToken?.("");
            setState("error");
            handlers.current.onError?.("Security check failed. Please try again.");
          },
        });
      } catch (err) {
        if (cancelled) return;
        setState("failed");
        handlers.current.onError?.(err.message || "Security check could not load. Please try again.");
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (window.turnstile && widgetRef.current !== null) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKeyProp, action, theme]);

  if (state === "off") return null;

  return (
    <div className={`turnstile ${className}`.trim()} data-state={state}>
      <div ref={containerRef} className="turnstile__widget" data-testid="turnstile-widget" />
      {state === "loading" && (
        <p className="turnstile__status">
          <ShieldCheck size={14} aria-hidden="true" /> Loading security check…
        </p>
      )}
      {state === "error" && (
        <p className="turnstile__status turnstile__status--error" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> Security check failed. Sign-in stays locked
          until it passes — <button type="button" className="turnstile__retry" onClick={reset}>retry</button>.
        </p>
      )}
      {state === "failed" && (
        <p className="turnstile__status turnstile__status--error" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> Security check could not load. Sign-in stays
          locked — <button type="button" className="turnstile__retry" onClick={reset}>retry</button>.
        </p>
      )}
    </div>
  );
});

export default Turnstile;