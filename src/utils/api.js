const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://67c7374cbb0988d092ea.appwrite.global";

export const API_ENDPOINTS = {
  games: `${API_BASE_URL}/games`,
};

export function mapApiGame(raw) {
  return {
    id: raw.code,
    title: raw.name,
    description: raw.description,
    category: raw.category?.name,
    thumbnail: raw.images?.square || raw.images?.thumb || raw.images?.cover,
    playUrl: raw.url,
  };
}

export function mockDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function extractGameList(data) {
  return Array.isArray(data) ? data : data.data || data.games || [];
}
