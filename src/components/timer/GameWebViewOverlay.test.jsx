import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GameWebViewOverlay, {getGameOrientation} from "./GameWebViewOverlay";
import { backend } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  backend: { startPlay: vi.fn(), claimPlay: vi.fn(), eventHeartbeat: vi.fn(), closePlay: vi.fn() },
}));
vi.mock("./useGameTimer", () => ({ useGameTimer: () => 120 }));
vi.mock("./gameWebView", () => ({ GameWebView: {}, launchGameOverlay: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));

describe("game reward claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backend.eventHeartbeat.mockResolvedValue({ ok: true });
  });
  it("starts one play session under React StrictMode", async () => {
    vi.spyOn(window, "open").mockReturnValue({});
    backend.startPlay.mockResolvedValue({ sessionId: "play-1" });
    render(<React.StrictMode><MemoryRouter><GameWebViewOverlay game={{ id: "game-1", title: "Test Game", playUrl: "https://example.test/game" }} onClose={vi.fn()} /></MemoryRouter></React.StrictMode>);

    await waitFor(() => expect(backend.startPlay).toHaveBeenCalledTimes(1));
  });

  it("keeps the game open so a failed claim can be retried", async () => {
    vi.spyOn(window, "open").mockReturnValue({});
    backend.startPlay.mockResolvedValue({ sessionId: "play-1" });
    backend.claimPlay.mockRejectedValue(new Error("Claim failed"));
    const onClose = vi.fn();
    render(<MemoryRouter><GameWebViewOverlay game={{ id: "game-1", title: "Test Game", playUrl: "https://example.test/game" }} onClose={onClose} /></MemoryRouter>);

    await waitFor(() => expect(backend.startPlay).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /claim/i }));
    await waitFor(() => expect(screen.getByText("Claim failed")).toBeTruthy());
    expect(backend.eventHeartbeat).toHaveBeenCalledWith("play-1");
    expect(backend.claimPlay).toHaveBeenCalledWith("play-1");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /claim/i })).toBeTruthy();
  });
});

describe('Android game orientation',()=>{
  it('opens original and provider games in portrait',()=>{
    expect(getGameOrientation({id:'skate-runner',playUrl:'https://playloot.pages.dev/grogames/skate-runner.html'})).toBe('portrait');
    expect(getGameOrientation({id:'subway-surfers',playUrl:'https://www.madkidgames.com/full/subway-surfers'})).toBe('portrait');
  });
  it('overrides landscape metadata with the portrait-only policy',()=>{
    expect(getGameOrientation({orientation:'portrait',playUrl:'https://example.com/game'})).toBe('portrait');
    expect(getGameOrientation({orientation:'landscape',playUrl:'https://example.com/game'})).toBe('portrait');
  });
});
