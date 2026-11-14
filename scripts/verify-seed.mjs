// Verifies a seeded user can actually authenticate, independent of Turnstile.
//   node scripts/verify-seed.mjs
import { webcrypto } from "node:crypto";

const encoder = new TextEncoder();
const hex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

async function passwordHash(password, salt) {
  const key = await webcrypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

const stored = {
  salt: "e6c56b36a5fb85c0f1e30a99174bb402",
  hash: "319dc1225ca1168d5b0b67ce1e113f8d575b0c408563f018979dd9b623db5d3a",
};

const computed = await passwordHash("Playloot@123", stored.salt);
const ok = computed === stored.hash;
console.log("password 'Playloot@123' matches seeded hash:", ok);
if (!ok) {
  console.log("  stored  :", stored.hash);
  console.log("  computed:", computed);
}
