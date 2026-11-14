import { json, fail, sha256, constantTimeEqual, randomId } from "../lib/util.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";

const MAX_CONFIG_BYTES = 64 * 1024;
function safeProviderUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!/^(localhost|.*\.localhost|.*\.local|.*\.internal|\[.*\]|\d+(?:\.\d+){0,3})$/i.test(u.hostname)?u:null;}catch{return null;}}

export async function isPmsAdmin(request, env) {
  const supplied = request.headers.get("x-admin-key") || "";
  const expected = String(env.PMS_ADMIN_KEY || "");
  if (!supplied || !expected) return false;
  return constantTimeEqual(await sha256(supplied), await sha256(expected));
}

async function readPublishedConfig(env) {
  const row = await env.DB.prepare("SELECT config_json AS configJson, updated_at AS updatedAt FROM app_config WHERE id = 'published'").first();
  if (!row) return { config: {}, updatedAt: null };
  try { return { config: JSON.parse(row.configJson), updatedAt: row.updatedAt }; }
  catch { return { config: {}, updatedAt: row.updatedAt }; }
}

export async function publicConfigRoute(env) {
  return readPublishedConfig(env);
}

export async function pmsConfigRoute(env) {
  return readPublishedConfig(env);
}

export async function savePmsConfigRoute(env, payload) {
  const config = payload?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) return fail("A config object is required", 400, "bad_config");
  const encoded = JSON.stringify(config);
  if (new TextEncoder().encode(encoded).byteLength > MAX_CONFIG_BYTES) return fail("Configuration is too large", 413, "config_too_large");
  await env.DB.prepare(
    "INSERT INTO app_config (id, config_json, updated_at) VALUES ('published', ?1, datetime('now')) ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at",
  ).bind(encoded).run();
  return readPublishedConfig(env);
}

export async function listProvidersRoute(env) {
  const rows = await env.DB.prepare(
    "SELECT id, name, endpoint, enabled, adapter, auth_header AS authHeader, data_path AS dataPath, api_key_encrypted IS NOT NULL AS hasApiKey, updated_at AS updatedAt FROM game_providers ORDER BY created_at",
  ).all();
  return { providers: rows.results.map((row) => ({ ...row, enabled: !!row.enabled, hasApiKey: !!row.hasApiKey })) };
}

export async function saveProviderRoute(env, payload) {
  const id = String(payload?.id || randomId("provider")).trim();
  const name = String(payload?.name || "").trim();
  const endpoint = String(payload?.endpoint || "").trim();
  if (!name || !safeProviderUrl(endpoint)) return fail("Provider name and a public HTTPS endpoint are required", 400, "bad_provider");
  const existing = await env.DB.prepare("SELECT api_key_encrypted AS apiKey FROM game_providers WHERE id = ?1").bind(id).first();
  const encrypted = payload?.apiKey ? await encryptSecret(env, String(payload.apiKey)) : existing?.apiKey || null;
  await env.DB.prepare(
    `INSERT INTO game_providers (id, name, endpoint, enabled, adapter, auth_header, api_key_encrypted, data_path, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, endpoint=excluded.endpoint, enabled=excluded.enabled,
       adapter=excluded.adapter, auth_header=excluded.auth_header, api_key_encrypted=excluded.api_key_encrypted,
       data_path=excluded.data_path, updated_at=excluded.updated_at`,
  ).bind(id, name, endpoint, payload?.enabled === false ? 0 : 1, String(payload?.adapter || "playloot"), String(payload?.authHeader || "x-api-key"), encrypted, String(payload?.dataPath || "")).run();
  return listProvidersRoute(env);
}

export async function deleteProviderRoute(env, id) {
  await env.DB.prepare("DELETE FROM game_providers WHERE id = ?1").bind(id).run();
  return listProvidersRoute(env);
}

const MAX_SVG_BYTES = 100 * 1024;
const UNSAFE_SVG = /<(?:script|foreignObject|iframe|object|embed|audio|video)\b|\bon\w+\s*=|javascript:|data:text\/html|<!DOCTYPE|<!ENTITY/i;

export async function uploadPmsIconRoute(request, env, payload) {
  const svg = String(payload?.svg || "").trim();
  if (!svg || new TextEncoder().encode(svg).byteLength > MAX_SVG_BYTES) {
    return fail("SVG icon must be under 100 KB", 413, "invalid_svg");
  }
  if (!/^<svg[\s>]/i.test(svg) || UNSAFE_SVG.test(svg)) {
    return fail("SVG contains unsupported or unsafe content", 400, "invalid_svg");
  }
  const key = `pms/icons/${randomId("icon")}.svg`;
  await env.MEDIA.put(key, svg, {
    httpMetadata: { contentType: "image/svg+xml; charset=utf-8" },
    customMetadata: { originalName: String(payload?.name || "icon.svg").slice(0, 100) },
  });
  return { key, url: `${new URL(request.url).origin}/api/pms-assets/${key}` };
}

export async function pmsAssetRoute(env, key) {
  if (!key.startsWith("pms/icons/") || !key.endsWith(".svg")) return fail("Not found", 404, "not_found");
  const object = await env.MEDIA.get(key);
  if (!object) return fail("Not found", 404, "not_found");
  return new Response(object.body, { headers: {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=31536000, immutable",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
  }});
}

function atPath(value, path) {
  const keys = String(path || "").split(".").filter(Boolean);
  if (!keys.length) return undefined;
  return keys.reduce((current, key) => current?.[key], value);
}

function normaliseGame(raw, providerId, index) {
  const categoryValue = raw?.category;
  const category = typeof categoryValue === "object" ? categoryValue : { name: categoryValue || raw?.genre || "Arcade" };
  return {
    ...raw,
    code: raw?.code || raw?.id || `${providerId}-${index}`,
    name: raw?.name || raw?.title || "Untitled game",
    url: raw?.url || raw?.playUrl || raw?.embed || "",
    category,
    images: raw?.images || { square: raw?.thumbnail || raw?.image || raw?.cover || "" },
    providerId,
  };
}

export async function gamesCatalogRoute(env) {
  const rows = await env.DB.prepare("SELECT * FROM game_providers WHERE enabled = 1 ORDER BY created_at").all();
  const providerResults = await Promise.all(rows.results.map(async (provider) => {
    const headers = { accept: "application/json" };
    if (provider.api_key_encrypted) headers[provider.auth_header || "x-api-key"] = await decryptSecret(env, provider.api_key_encrypted);
    try {
    if(!safeProviderUrl(provider.endpoint))throw new Error('Invalid provider URL');
    const response = await fetch(provider.endpoint, { headers, redirect:'error',signal:AbortSignal.timeout(10000), cf: { cacheTtl: 300, cacheEverything: true } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const list = atPath(data, provider.data_path) || data?.data || data?.games || data;
      if (!Array.isArray(list)) throw new Error("Provider response is not a list");
      return { id: provider.id, ok: true, games: list.map((game, index) => normaliseGame(game, provider.id, index)).filter((game) => game.url) };
    } catch (error) {
      console.error("game provider failed", provider.id);
      return { id: provider.id, ok: false, games: [] };
    }
  }));
  return { games: providerResults.flatMap((result) => result.games), providers: providerResults.map(({ id, ok }) => ({ id, ok })) };
}
