import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const SRC = readFileSync(resolve("src/components/StitchFrame.jsx"), "utf8");

// Pull the real template literal out of the component so this test exercises
// the shipped code rather than a copy of it.
function extractLoader() {
  const prefix = "const LIVE_DATA_LOADER = `";
  const start = SRC.indexOf(prefix);
  if (start === -1) throw new Error("LIVE_DATA_LOADER not found");
  const from = start + prefix.length;
  const close = SRC.indexOf("`;", from);
  if (close === -1) throw new Error("LIVE_DATA_LOADER closing backtick not found");
  return SRC.slice(from, close);
}

function buildRuntime({ screen, token = "test-token", backend = "http://backend.test" }) {
  // The component stores this as a JS template literal, so the file on disk
  // holds the escaped source (\\d). Undo that, then strip the script wrapper.
  return extractLoader()
    .replace(/\\\\/g, "\\")
    .replace(/`/g, "")
    .replace(/<\/?script>/g, "")
    .replace(/__SESSION_TOKEN__/, JSON.stringify(token))
    .replace(/__SCREEN_NAME__/, JSON.stringify(screen))
    .replace(/__BACKEND_URL__/, JSON.stringify(backend));
}

const WALLET = { coins: 24500, diamonds: 350, cashCents: 12850, cash: "128.50" };
const PROFILE = {
  name: "Oliver Bennett",
  handle: "oliverb",
  email: "demo@playloot.gg",
  tier: "PLATINUM",
  level: 42,
  avatarUrl: null,
  stats: { gamesPlayed: 7, hoursPlayed: 1, redemptions: 0, spins: 1 },
};
const BOARD = { players: [], me: { rank: 3 }, totalPlayers: 1 };

/** Loads a Stitch design into a fresh DOM and runs the real loader in it. */
function renderScreen(designId, { screen, wallet, profile, leaderboard, mutate } = {}) {
  const html = readFileSync(resolve(`.stitch/designs/${designId}.html`), "utf8");
  let body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
  if (mutate) body = mutate(body);

  const dom = new JSDOM(`<!DOCTYPE html><body>${body}</body>`, { runScripts: "dangerously" });
  const { window } = dom;
  const routes = { "/api/wallet": wallet, "/api/profile": profile, "/api/leaderboard": leaderboard };

  window.fetch = async (url) => {
    const path = Object.keys(routes).find((r) => String(url).includes(r));
    const payload = path ? routes[path] : null;
    return { ok: Boolean(payload), json: async () => payload };
  };

  const script = window.document.createElement("script");
  script.textContent = buildRuntime({ screen });
  window.document.body.appendChild(script);

  return new Promise((resolve_) => setTimeout(() => resolve_(window.document), 120));
}

const CASHOUT = "12cecfe6a7d14e00a14eebaa383633c9";
const PROFILE_DESIGN = "d53eeb83d1044d75a188012dd6a3b3ce";

describe("StitchFrame live-data loader", () => {
  it("replaces the design's placeholder cash/coin figures", async () => {
    const doc = await renderScreen(CASHOUT, { screen: "cashout", wallet: WALLET });
    const text = doc.body.textContent;

    // The design ships $1,280.00 as a baked-in placeholder.
    expect(text).not.toContain("$1,280.00");
    expect(text).toContain("$128.50");
    expect(text).toContain("24,500");
  });

  it("neutralises the fabricated USD payout row", async () => {
    const doc = await renderScreen(CASHOUT, { screen: "cashout", wallet: WALLET });
    const text = doc.body.textContent;

    // "USDT" legitimately appears as a payment method; only the invented
    // dollar amount should be gone.
    expect(text).not.toContain("$1,280.00 USD");
    expect(text).toContain("Disbursement Amount");
    expect(text).toContain("USDT / SOL");
  });

  it("abbreviates only the coin pill, leaving gems exact", async () => {
    const doc = await renderScreen(CASHOUT, { screen: "cashout", wallet: WALLET });
    const text = doc.body.textContent;

    expect(text).toContain("24.5K"); // coin pill, abbreviated
    expect(text).toContain("350"); // gem chip, exact
    // The gem chip must not be given the coin total.
    const gemIcon = [...doc.querySelectorAll("span.material-symbols-outlined")].find(
      (i) => i.textContent.trim() === "diamond",
    );
    expect(gemIcon.nextElementSibling.textContent).toBe("350");
  });

  it("still matches when the design's placeholder numbers change", async () => {
    const doc = await renderScreen(CASHOUT, {
      screen: "cashout",
      wallet: WALLET,
      mutate: (body) =>
        body
          .replace(/>\$1,280\.00</g, ">$9,999.99<")
          .replace(/>24,500</g, ">77,777<")
          .replace(/>350</g, ">888<"),
    });

    const text = doc.body.textContent;
    expect(text).not.toContain("$9,999.99");
    expect(text).toContain("$128.50");
    expect(text).toContain("24,500");
    expect(text).toContain("350");
  });

  it("patches profile identity and stats from real endpoints", async () => {
    const doc = await renderScreen(PROFILE_DESIGN, {
      screen: "profile",
      wallet: WALLET,
      profile: PROFILE,
      leaderboard: BOARD,
    });
    const text = doc.body.textContent;

    expect(text).not.toContain("Vortex_Gamer99");
    expect(text).toContain("Oliver Bennett");
    expect(text).toContain("LVL 42");
    expect(text).toContain("Platinum VIP");
    // Real stats replace the design's sample figures.
    expect(text).not.toContain("1,248");
    expect(text).toContain("7");
    expect(text).toContain("#3");
    // Unsupported sample stats are blanked rather than presented as fact.
    expect(text).not.toContain("68.4%");
    expect(text).toContain("Gold Cups Won");
    expect(text).toContain("Career Win Rate");
  });

  it("swaps the avatar for the real one from the profile endpoint", async () => {
    const doc = await renderScreen(PROFILE_DESIGN, {
      screen: "profile",
      wallet: WALLET,
      profile: { ...PROFILE, avatarUrl: "https://cdn.test/avatar.png" },
      leaderboard: BOARD,
    });

    const avatar = doc.querySelector('img[data-alt*="avatar portrait" i]');
    expect(avatar).toBeTruthy();
    expect(avatar.getAttribute("src")).toBe("https://cdn.test/avatar.png");
  });

  it("leaves the design untouched when there is no session token", async () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>${
      readFileSync(resolve(`.stitch/designs/${CASHOUT}.html`), "utf8").match(
        /<body[^>]*>([\s\S]*)<\/body>/i,
      )[1]
    }</body>`, { runScripts: "dangerously" });

    const script = dom.window.document.createElement("script");
    script.textContent = buildRuntime({ screen: "cashout", token: "" });
    dom.window.document.body.appendChild(script);

    await new Promise((r) => setTimeout(r, 60));
    expect(dom.window.document.querySelector(".font-display-mobile").textContent).toBe("$1,280.00");
  });
});