const encoder = new TextEncoder();

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function fail(message, status = 400, code = "bad_request") {
  return json({ error: { code, message } }, status);
}

export function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${toHex(bytes)}`;
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

export async function pbkdf2(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/**
 * Normalises a timestamp to ISO-8601 UTC.
 *
 * D1 stores timestamps as SQLite `datetime('now')` output, which is
 * "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker. `new Date()` parses that
 * string as *local* time, which shifts every date by a day for anyone west of
 * UTC. Every timestamp crossing the API boundary must go through here.
 */
export function iso(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "number") return new Date(value * 1000).toISOString();

  const text = String(value).trim();
  // SQLite datetime('now') / datetime(...) — UTC but carrying no zone marker.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) {
    return new Date(`${text.replace(" ", "T")}Z`).toISOString();
  }
  // Already ISO, or a date-only day stamp.
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Strict JSON body reader. Returns `{ data, error }` so callers can reject a
 * malformed body with a useful status instead of treating it as empty input.
 */
export async function readJsonStrict(request) {
  const contentType = String(request.headers.get("content-type") || "");
  if (contentType && !contentType.split(";")[0].trim().endsWith("json")) {
    return { data: null, error: fail("Expected a JSON body", 415, "unsupported_media_type") };
  }
  try {
    const data=await request.json();
    if(!data||typeof data!=='object'||Array.isArray(data))return {data:null,error:fail('Expected a JSON object',400,'invalid_json')};
    return { data, error: null };
  } catch {
    return { data: null, error: fail("Malformed JSON body", 400, "invalid_json") };
  }
}
