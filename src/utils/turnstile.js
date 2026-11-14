import { backend } from "./api";

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
export const TURNSTILE_SCRIPT_ID = "playloot-turnstile-script";
export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

/**
 * Loads the Turnstile bundle once per page and resolves with `window.turnstile`.
 * Repeat calls share one in-flight promise so multiple widgets never race to
 * inject the script tag.
 */
export function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("Turnstile needs a browser"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script =
        document.getElementById(TURNSTILE_SCRIPT_ID) || document.createElement("script");
      script.addEventListener("load", () => resolve(window.turnstile), { once: true });
      script.addEventListener("error", () => {
        scriptPromise = null;
        reject(new Error("Could not load the security check"));
      }, { once: true });
      if (!script.parentNode) {
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });
  }
  return scriptPromise;
}

/** Test seam — drops the cached script promise so each test starts clean. */
export function resetTurnstileScriptCache() {
  scriptPromise = null;
}

/**
 * Works out which widget to render.
 *
 * `VITE_TURNSTILE_SITE_KEY` pins a specific widget (handy for local testing);
 * otherwise the backend is asked, which keeps the client from drifting out of
 * sync with the secret the Worker actually verifies against.
 */
export async function resolveTurnstile() {
  // The backend is the source of truth: it is the side that actually verifies
  // the token, so asking it first stops the client drifting from the secret the
  // Worker checks against. The pinned key is only a fallback for when that
  // request cannot be made.
  let config = null;
  try {
    config = await backend.config();
  } catch {
    // Backend unreachable or predates /api/config.
  }

  const siteKey = config?.turnstile?.siteKey || TURNSTILE_SITE_KEY || "";
  // Fail closed: if the backend did not say otherwise, expect a token.
  const required = config?.turnstile?.required !== false;

  return { siteKey, required: required && Boolean(siteKey) };
}