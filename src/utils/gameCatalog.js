import { extractGameList, fetchJson } from "./api";


const MAX_AGE_MS = 30 * 1000;
const entries = new Map();

export function clearGameCatalog() {
  entries.clear();
}

export function peekGameCatalog(url) {
  const entry = entries.get(url);
  return entry?.games || null;
}

export function getGameCatalog(url, forceRefresh = false) {
  const entry = entries.get(url);
  if (entry?.promise) return entry.promise;
  if (!forceRefresh && entry?.games && Date.now() - entry.updatedAt < MAX_AGE_MS) {
    return Promise.resolve(entry.games);
  }

  const promise = fetchJson(url).then((data) => {
    const list = extractGameList(data);
    if (!Array.isArray(list)) throw new Error("Invalid game catalog");
    const games = list;
    entries.set(url, { games, updatedAt: Date.now(), promise: null });
    return games;
  }).catch((error) => {
    entries.set(url, { games: entry?.games || null, updatedAt: entry?.updatedAt || 0, promise: null });
    throw error;
  });
  entries.set(url, { games: entry?.games || null, updatedAt: entry?.updatedAt || 0, promise });
  return promise;
}

// srcDoc frames share the same origin but have separate JavaScript contexts.
// Expose only this small catalog API so their cards reuse the parent's data.
if (typeof window !== "undefined") {
  window.__playlootGameCatalog = { get: getGameCatalog, peek: peekGameCatalog };
}
