// Seeds a hardcoded demo account into the Playloot D1 database.
//
//   node scripts/seed-demo-user.mjs                 # print the SQL
//   node scripts/seed-demo-user.mjs --email you@x.com --password "Secret123"
//
// Password hashing must match worker/index.js: PBKDF2-SHA256, 100k
// iterations, 256-bit, hex-encoded, with a per-user 16-byte hex salt.
import { randomBytes } from "node:crypto";

const encoder = new TextEncoder();
const hex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const email = arg("email", "demo@playloot.gg").trim().toLowerCase();
const password = arg("password", "Playloot@123");
const name = arg("name", "Demo Player");
const coins = Number(arg("coins", "24500"));
const diamonds = Number(arg("diamonds", "350"));
const cash = Number(arg("cash", "12850"));

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = await passwordHash(password, salt);
const id = crypto.randomUUID();
const gamerId = `PL-${randomBytes(5).toString("hex").toUpperCase()}`;
const inviteCode = randomBytes(5).toString("hex").toUpperCase();
const settings = JSON.stringify({
  online: true,
  stealth: false,
  graphics: "auto",
  fps: 60,
  privateProfile: 0,
  rewardAlerts: 1,
  twoStep: 0,
});

const sql = `DELETE FROM users WHERE email='${email}';
INSERT INTO users (id,email,password_salt,password_hash,name,gamer_id,invite_code,invited_by,joined_at,settings_json,coins,diamonds,cash,level,tier)
VALUES ('${id}','${email}','${salt}','${hash}','${name}','${gamerId}','${inviteCode}',NULL,datetime('now'),'${settings}',${coins},${diamonds},${cash},18,'PLATINUM');`;

console.log("--- credentials ---");
console.log(`email    : ${email}`);
console.log(`password : ${password}`);
console.log(`gamer id : ${gamerId}`);
console.log(`invite   : ${inviteCode}`);
console.log(`balance  : ${coins} coins / ${diamonds} gems / Rs.${(cash / 100).toFixed(2)}`);
console.log("\n--- run this to seed (remote) ---");
console.log(`npx wrangler d1 execute playloot-prod-db --remote --command "${sql.replace(/"/g, '\\"')}"`);

if (process.argv.includes("--write")) {
  const { execFileSync } = await import("node:child_process");
  execFileSync("npx", ["wrangler", "d1", "execute", "playloot-prod-db", "--remote", "--command", sql], {
    stdio: "inherit",
    shell: true,
  });
}