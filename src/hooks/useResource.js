import { useCallback, useEffect, useRef, useState } from "react";

// Backs off linearly: attempt 1 waits ~900ms, attempt 2 ~1800ms, ...
const RETRY_BASE_MS = 900;

// Only transient failures are worth retrying. Retrying a 401/403/404 just
// burns battery and delays the real (redirect / retry) handling.
export function isRetryable(error) {
  if (!error) return false;
  const status = Number(error.status);
  if (status >= 400 && status < 500) return false;
  if (status === 408 || status === 429) return true;
  return true;
}

function initialState(initialData) {
  return {
    data: initialData,
    error: null,
    loading: initialData === undefined,
    refreshing: false,
    attempts: 0,
  };
}

/**
 * One independently-failing async dependency.
 *
 * The point of this hook is that a failed reload never destroys good data:
 * `data` keeps its last successful value and only `error` is set, so the
 * screen can keep rendering real content behind a "couldn't refresh" banner
 * instead of collapsing to a blank error page.
 *
 * @param {Function} loader  async () => data
 * @param {Array}    deps    re-fetch when these change (same style as useCallback)
 * @param {Object}   options { initialData, retries, enabled }
 */
export function useResource(loader, deps = [], options = {}) {
  const { initialData, retries = 2, enabled = true } = options;

  const [state, setState] = useState(() => initialState(initialData));
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const aliveRef = useRef(true);
  const runIdRef = useRef(0);
  const attemptRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const run = useCallback(
    async (isRetry = false) => {
      if (!enabled) return;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      if (!isRetry) attemptRef.current = 0;

      setState((prev) => ({
        ...prev,
        loading: prev.data === undefined,
        refreshing: prev.data !== undefined,
        error: null,
      }));

      try {
        const data = await loaderRef.current();
        if (!aliveRef.current || runIdRef.current !== runId) return;
        attemptRef.current = 0;
        setState({ data, error: null, loading: false, refreshing: false, attempts: 0 });
      } catch (error) {
        if (!aliveRef.current || runIdRef.current !== runId) return;

        const attempt = attemptRef.current + 1;
        attemptRef.current = attempt;

        if (isRetryable(error) && attempt <= retries) {
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => run(true), RETRY_BASE_MS * attempt);
        }

        // `...prev` deliberately keeps prev.data: a failed refresh must not
        // wipe out what the user is already looking at.
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
          refreshing: false,
          attempts: attempt,
        }));
      }
    },
    [enabled, retries],
  );

  useEffect(() => {
    if (enabled) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  const reload = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    attemptRef.current = 0;
    run();
  }, [run]);

  const mutate = useCallback(
    (updater) => {
      setState((prev) => ({
        ...prev,
        data: typeof updater === "function" ? updater(prev.data) : updater,
      }));
    },
    [],
  );

  return { ...state, reload, mutate };
}

