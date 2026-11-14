import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";
import { backend } from "../utils/api";

function stubTurnstile() {
  const widget = {
    render: vi.fn(() => "widget-1"),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  window.turnstile = widget;
  return widget;
}

function jsonResponse(payload, ok = true, status = 200) {
  return { ok, status, text: async () => JSON.stringify(payload) };
}

function setConfig({ siteKey = "0xtest", required = true } = {}) {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes("/api/config")) {
      return jsonResponse({ turnstile: { siteKey, required } });
    }
    return jsonResponse({ error: { code: "invalid_credentials", message: "Incorrect email or password" } }, false, 401);
  });
}

function fill({ email = "player@example.test", password = "Password123" } = {}) {
  fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: password } });
}

function solveChallenge(widget) {
  const options = widget.render.mock.calls[0][1];
  act(() => options.callback("a-valid-token"));
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    delete window.turnstile;
    localStorage.clear();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    setConfig();
  });

  it("keeps submit disabled until the captcha is solved", async () => {
    const widget = stubTurnstile();
    renderLogin();

    fill();
    const submit = await screen.findByRole("button", { name: /Enter the arcade/i });
    await waitFor(() => expect(widget.render).toHaveBeenCalled());
    expect(submit.disabled).toBe(true);

    solveChallenge(widget);
    await waitFor(() => expect(screen.getByRole("button", { name: /Enter the arcade/i }).disabled).toBe(false));
  });

  it("explains what is missing instead of silently doing nothing", async () => {
    stubTurnstile();
    renderLogin();
    fill();

    await waitFor(() => expect(screen.getByRole("button", { name: /Enter the arcade/i })).toBeTruthy());
    fireEvent.submit(screen.getByRole("button", { name: /Enter the arcade/i }).closest("form"));

    expect((await screen.findByRole("alert")).textContent).toMatch(/security check/i);
  });

  it("resets the widget after a failed sign-in so the token can be reused safely", async () => {
    const widget = stubTurnstile();
    renderLogin();
    fill();

    await waitFor(() => expect(widget.render).toHaveBeenCalled());
    solveChallenge(widget);
    await waitFor(() => expect(screen.getByRole("button", { name: /Enter the arcade/i }).disabled).toBe(false));

    fireEvent.click(screen.getByRole("button", { name: /Enter the arcade/i }));

    await waitFor(() => expect(widget.reset).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("lets the player through when the backend has no captcha configured", async () => {
    setConfig({ siteKey: "", required: false });
    renderLogin();
    fill();

    await waitFor(() => expect(screen.getByRole("button", { name: /Enter the arcade/i }).disabled).toBe(false));
    expect(screen.queryByTestId("turnstile-widget")).toBeNull();
  });

  it("re-renders the widget for each mode so a login token is not reused to register", async () => {
    const widget = stubTurnstile();
    renderLogin();
    fill();

    await waitFor(() => expect(widget.render).toHaveBeenCalledTimes(1));
    const loginAction = widget.render.mock.calls[0][1].action;
    expect(loginAction).toBe("login");

    fireEvent.click(screen.getByRole("button", { name: /New player/i }));

    await waitFor(() => expect(widget.render).toHaveBeenCalledTimes(2));
    expect(widget.render.mock.calls[1][1].action).toBe("register");
  });

  it("redirects an authenticated player straight to the arcade", async () => {
    localStorage.setItem("playloot.session.token", "valid-session");
    vi.spyOn(backend, "me").mockResolvedValueOnce({ user: { id: "player-1" } });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Home" element={<p>Arcade screen</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Arcade screen")).toBeTruthy();
    expect(screen.queryByText("Welcome back, player")).toBeNull();
  });
});
