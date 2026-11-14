// Fixture data shaped exactly like the worker responses, so a mismatch
// between the UI and the backend fails loudly here.
export const FIXTURES = {
  profile: {
    id: "usr_1",
    gamerId: "tester",
    name: "Test Player",
    handle: "tester",
    email: "tester@example.com",
    emailVerified: true,
    avatarUrl: null,
    country: { code: "IN" },
    tier: "PLATINUM",
    level: 12,
    dateJoined: "2026-01-05",
    wallet: { coins: 500, diamonds: 10, cashCents: 0 },
    stats: { gamesPlayed: 3, hoursPlayed: 1, redemptions: 0, lifetimeCoins: 900, spins: 1, rewardsEarned: 400, referrals: 1 },
    badges: [
      { id: "first_game", title: "First steps", earned: true },
      { id: "recruiter", title: "Recruiter", earned: true },
    ],
    recentGames: [{ gameCode: "g1", title: "Racer One", seconds: 300, at: "2026-10-01T10:00:00Z" }],
  },
  wallet: { coins: 1234, diamonds: 56, cashCents: 500, cash: "5.00", updatedAt: "2026-10-01T10:00:00Z" },
  missions: {
    day: "2026-10-01",
    missions: [
      { id: "play_minutes", title: "Play for 2 minutes", progress: 120, target: 120, reward: 60, complete: true, claimed: false },
      { id: "play_sessions", title: "Play 3 games", progress: 1, target: 3, reward: 100, complete: false, claimed: false },
    ],
  },
  leaderboard: {
    players: [
      { rank: 1, id: "u2", name: "Apex", handle: "apex", tier: "PLATINUM", level: 30, coins: 9000, diamonds: 5 },
      { rank: 2, id: "u1", name: "Test Player", handle: "tester", tier: "PLATINUM", level: 12, coins: 1234, diamonds: 56 },
    ],
    me: { rank: 2, id: "u1", name: "Test Player", coins: 1234 },
    totalPlayers: 2,
    resetAt: "2026-10-02T00:00:00.000Z",
  },
  rewards: {
    rewards: [{ id: "r1", source: "Playing Racer One", kind: "Coins", amount: 60, at: "2026-10-01T10:05:00Z" }],
    claims: [{ id: "c1", option: { optionId: "gp-1", category: "Google Play ₹15", amount: "15" }, status: "pending", at: "2026-10-01T11:00:00Z" }],
    totals: { coins: 60, diamonds: 0 },
  },
  invite: { code: "ABCD1234", referrals: 1, bonusCoins: 200 },
  daily: { claimed: false, coins: 50, day: "2026-10-01", resetsAt: "2026-10-02T00:00:00.000Z" },
  notifications: {
    items: [
      { id: "n1", text: "Play reward: +60 coins from Racer One", read: false, at: "2026-10-01T10:05:00Z" },
      { id: "n2", text: "Daily bonus: +50 coins", read: true, at: "2026-10-01T09:00:00Z" },
    ],
    unread: 1,
  },
  settings: {
    online: true, stealth: false, graphics: "auto", fps: 60,
    privateProfile: false, rewardAlerts: true, twoStep: false,
  },
  redeem: {
    catalog: [],
    options: [
      { id: "gp-1", category: "Redeem Coins as Google Play (IN)", amount: "₹15", coinsRequired: 4800 },
      { id: "gp-2", category: "Redeem Coins as Google Play (IN)", amount: "₹30", coinsRequired: 9600 },
    ],
    coins: 1234,
    redemptionsUsedToday: 0,
    redemptionsAllowedPerDay: 5,
    history: [],
  },
};

const ROUTES = {
  "/api/profile": "profile",
  "/api/wallet": "wallet",
  "/api/missions": "missions",
  "/api/leaderboard": "leaderboard",
  "/api/rewards": "rewards",
  "/api/invite": "invite",
  "/api/daily": "daily",
  "/api/notifications": "notifications",
  "/api/settings": "settings",
  "/api/redeem/options": "redeem",
};

/**
 * Installs a fetch stub that routes by pathname, letting a test declare which
 * endpoints fail and how.
 *
 * @param {Object<string, number|Error>} failures pathname -> status or Error
 */
export function mockBackend({ failures = {} } = {}) {
  const calls = [];

  global.fetch = async (input) => {
    const url = String(input);
    const path = Object.keys(ROUTES).find((route) => url.includes(route));
    calls.push(url);

    if (path && failures[path] !== undefined) {
      const failure = failures[path];
      if (failure instanceof Error) throw failure;
      const status = failure;
      return {
        ok: false,
        status,
        text: async () => JSON.stringify({ error: { code: "server_error", message: `failed ${status}` } }),
      };
    }

    const body = path ? FIXTURES[ROUTES[path]] : {};
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };

  return calls;
}

/** Simulates the server being unreachable (worker not running). */
export function offlineBackend() {
  global.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
}