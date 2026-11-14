import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import Turnstile from "./Turnstile";
import { resetTurnstileScriptCache, TURNSTILE_SCRIPT_ID } from "../utils/turnstile";

function stubTurnstile() {
  const renderSpy = vi.fn(() => "widget-1");
  const resetSpy = vi.fn();
  const removeSpy = vi.fn();
  window.turnstile = { render: renderSpy, reset: resetSpy, remove: removeSpy };
  return { renderSpy, resetSpy, removeSpy };
}

function stubConfig(config) {
  global.fetch = vi.fn(async () => ({
    status: 200,
    ok: true,
    text: async () => JSON.stringify(config),
  }));
}

const SITE_KEY = "0x4AAAAAAFXmATbXG4Sg1k1s";

describe("Turnstile", () => {
  beforeEach(() => {
    delete window.turnstile;
    document.getElementById(TURNSTILE_SCRIPT_ID)?.remove();
    resetTurnstileScriptCache();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
  });

  it("renders with the site key the backend advertises", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    stubTurnstile();

    render(<Turnstile />);

    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());
    expect(window.turnstile.render).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sitekey: SITE_KEY }),
    );
  });

  it("hands the token up once the challenge is solved", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    stubTurnstile();
    const onToken = vi.fn();

    render(<Turnstile onToken={onToken} />);

    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());
    const options = window.turnstile.render.mock.calls[0][1];
    act(() => options.callback("token-abc"));
    expect(onToken).toHaveBeenCalledWith("token-abc");
  });

  it("clears the token on expiry and on error", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    stubTurnstile();
    const onToken = vi.fn();
    const onError = vi.fn();

    render(<Turnstile onToken={onToken} onError={onError} />);

    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());
    const options = window.turnstile.render.mock.calls[0][1];

    act(() => options.callback("token-abc"));
    onToken.mockClear();
    act(() => options["expired-callback"]());
    expect(onToken).toHaveBeenCalledWith("");

    act(() => options["error-callback"]());
    expect(onToken).toHaveBeenCalledWith("");
    expect(onError).toHaveBeenCalledWith("Security check failed. Please try again.");
  });

  it("keeps sign-in locked when the challenge fails", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    stubTurnstile();
    const onRequiredChange = vi.fn();
    const onError = vi.fn();
    const onToken = vi.fn();

    render(<Turnstile onRequiredChange={onRequiredChange} onError={onError} onToken={onToken} />);
    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());

    const options = window.turnstile.render.mock.calls[0][1];
    onRequiredChange.mockClear();
    act(() => options["error-callback"]());

    // No token is handed up, and the requirement is NOT relaxed: a blocked or
    // failing widget must never become a way to sign in.
    expect(onToken).toHaveBeenCalledWith("");
    expect(onRequiredChange).not.toHaveBeenCalledWith(false);
    // ...but the player can retry the challenge.
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("re-arms the requirement once a challenge succeeds", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    stubTurnstile();
    const onRequiredChange = vi.fn();

    render(<Turnstile onRequiredChange={onRequiredChange} />);
    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());

    const options = window.turnstile.render.mock.calls[0][1];
    act(() => options["error-callback"]());
    onRequiredChange.mockClear();
    act(() => options.callback("token-abc"));

    expect(onRequiredChange).toHaveBeenCalledWith(true);
  });

  it("stays hidden and unblocks the form when the backend has no captcha", async () => {
    stubConfig({ turnstile: { siteKey: "", required: false } });
    const onRequiredChange = vi.fn();

    render(<Turnstile onRequiredChange={onRequiredChange} />);

    await waitFor(() => expect(onRequiredChange).toHaveBeenCalledWith(false));
    expect(screen.queryByTestId("turnstile-widget")).toBeNull();
    expect(window.turnstile).toBeUndefined();
  });

  it("reports a load failure instead of hanging on a blank widget", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    const onError = vi.fn();

    render(<Turnstile onError={onError} />);

    // jsdom never fetches the Cloudflare bundle, so fail the request by hand.
    let script = null;
    await waitFor(() => {
      script = document.getElementById(TURNSTILE_SCRIPT_ID);
      expect(script).not.toBeNull();
    });
    act(() => script.dispatchEvent(new Event("error")));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole("alert").textContent).toMatch(/could not load/i);
  });

  it("removes the widget on unmount", async () => {
    stubConfig({ turnstile: { siteKey: SITE_KEY, required: true } });
    const { removeSpy } = stubTurnstile();

    const view = render(<Turnstile />);
    await waitFor(() => expect(screen.getByTestId("turnstile-widget")).toBeTruthy());

    view.unmount();
    expect(removeSpy).toHaveBeenCalledWith("widget-1");
  });
});