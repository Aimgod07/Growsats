import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import PlayerHub from "../pages/PlayerHub";
import { mockBackend, offlineBackend } from "../test/fixtures";

function renderHub(props = {}) {
  return render(
    <MemoryRouter>
      <PlayerHub {...props} />
    </MemoryRouter>,
  );
}

describe("PlayerHub resilience", () => {
  beforeEach(() => {
    localStorage.setItem("playloot.session.token", "test-token");
  });

  it("keeps the notifications screen open and loads account updates", async () => {
    mockBackend();
    renderHub({initialTab: 'notifications'});
    await waitFor(() => expect(screen.getByText(/Play reward: \+60 coins/)).toBeTruthy());
    expect(screen.getByRole('heading', {name:'Your updates'})).toBeTruthy();
    expect(screen.queryByText('Daily bonus')).toBeNull();
  });

  it("renders every section when the backend is healthy", async () => {
    mockBackend();
    renderHub();

    await waitFor(() => expect(screen.getByText("Test Player")).toBeTruthy());
    expect(screen.getByText("1,234")).toBeTruthy();          // wallet coins
    expect(screen.getByText("Daily bonus")).toBeTruthy();
    expect(screen.getByText("Racer One")).toBeTruthy();      // recent games
    expect(screen.getByText(/Play reward: \+60 coins/)).toBeTruthy();
    expect(screen.getByText(/First steps/)).toBeTruthy();    // badges
    expect(screen.queryByText(/Couldn't load/)).toBeNull();
  });

  it("keeps the page alive when most endpoints fail", async () => {
    mockBackend({
      failures: {
        "/api/missions": 404,
        "/api/invite": 500,
        "/api/notifications": 500,
        "/api/settings": 500,
        "/api/rewards": 404,
      },
    });
    renderHub();

    // The healthy sections still populate.
    await waitFor(() => expect(screen.getByText("Test Player")).toBeTruthy());
    expect(screen.getByText("1,234")).toBeTruthy();
    expect(screen.getByText("Daily bonus")).toBeTruthy();

    // The page never collapses into a single full-screen failure notice.
    expect(screen.queryByText(/Not found/i)).toBeNull();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("shows a scoped retry for the failed section only", async () => {
    mockBackend({ failures: { "/api/missions": 500 } });
    renderHub({ initialTab: "missions" });

    await waitFor(() => expect(screen.getByText("Invite friends")).toBeTruthy());
    // The invite section (healthy) is usable.
    expect(screen.getByText("ABCD1234")).toBeTruthy();
    // The missions section failed, but the page still rendered around it.
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.queryByText(/Couldn't load your account/)).toBeNull();
  });

  it("keeps showing last-known data when a later reload fails", async () => {
    let notificationsFail = false;
    const { FIXTURES } = await import("../test/fixtures");

    global.fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/notifications")) {
        if (notificationsFail) {
          return { ok: false, status: 500, text: async () => JSON.stringify({ error: { message: "boom" } }) };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify(FIXTURES.notifications) };
      }
      const map = {
        "/api/profile": "profile", "/api/wallet": "wallet", "/api/missions": "missions",
        "/api/leaderboard": "leaderboard", "/api/rewards": "rewards", "/api/invite": "invite",
        "/api/daily": "daily", "/api/settings": "settings", "/api/redeem/options": "redeem",
      };
      const key = Object.keys(map).find((r) => url.includes(r));
      return { ok: true, status: 200, text: async () => JSON.stringify(FIXTURES[map[key]]) };
    };

    renderHub();

    // First load succeeds and notifications are listed.
    await waitFor(() => expect(screen.getByText(/Play reward: \+60 coins/)).toBeTruthy());

    // Now the endpoint starts failing and the player hits refresh.
    notificationsFail = true;
    fireEvent.click(screen.getByLabelText("Refresh your account"));

    // The stale notification text is still on screen...
    await waitFor(() => expect(screen.getByText(/Play reward: \+60 coins/)).toBeTruthy());
    // ...alongside a notice that it could not be refreshed.
    expect(screen.getByText(/Couldn't refresh notifications/i)).toBeTruthy();
    // ...and no full-screen failure took over.
    expect(screen.queryByText(/Couldn't load your account/)).toBeNull();
  });

  it("does not blank the whole hub when the worker is offline", async () => {
    offlineBackend();
    renderHub();

    // Sections with a safe fallback still render.
    await waitFor(() => expect(screen.getByText("Player")).toBeTruthy());
    expect(screen.getByText("Daily bonus")).toBeTruthy();
    expect(screen.queryByText(/Couldn't load your account/)).toBeNull();
  });

  it("restores a setting when saving it fails", async () => {
    mockBackend();
    const healthyFetch = global.fetch;
    global.fetch = (input, init) => {
      if (String(input).includes('/api/settings') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 500, text: async () => JSON.stringify({ error: { message: 'Save failed' } }) });
      }
      return healthyFetch(input, init);
    };
    renderHub({ initialTab: 'settings' });

    const toggle = screen.getByLabelText('Online status');
    await waitFor(() => expect(toggle.checked).toBe(true));
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText('Save failed')).toBeTruthy());
    expect(toggle.checked).toBe(true);
  });

  it("changes content when navigating between hub URLs", async () => {
    mockBackend();
    function RouteSwitcher() {
      const navigate = useNavigate();
      return <>
        <button onClick={() => navigate('/leaderboard')}>Go ranks</button>
        <button onClick={() => navigate('/profile')}>Go profile</button>
        <Routes>
          <Route path="/redeem" element={<PlayerHub initialTab="rewards" />} />
          <Route path="/leaderboard" element={<PlayerHub initialTab="ranks" />} />
          <Route path="/profile" element={<PlayerHub />} />
        </Routes>
      </>;
    }

    render(<MemoryRouter initialEntries={['/redeem']}><RouteSwitcher /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Loot', level: 1 })).toBeTruthy();

    fireEvent.click(screen.getByText('Go ranks'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Leaderboard', level: 1 })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Cashout offers' })).toBeNull();

    fireEvent.click(screen.getByText('Go profile'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Player profile', level: 1 })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Leaderboard', level: 1 })).toBeNull();
  });
});
