import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GameTimerBadge from "./GameTimerBadge";

describe("game timer reward preview", () => {
  it("unlocks at two minutes and counts completed reward minutes afterward", () => {
    const onClaim = vi.fn();
    const view = render(<GameTimerBadge elapsedSeconds={119} onClaim={onClaim} />);
    expect(screen.queryByRole("button", { name: /claim/i })).toBeNull();
    view.rerender(<GameTimerBadge elapsedSeconds={120} onClaim={onClaim} />);
    expect(screen.getByRole("button", { name: /claim \(0 coins\)/i })).toBeTruthy();
    view.rerender(<GameTimerBadge elapsedSeconds={180} onClaim={onClaim} />);
    expect(screen.getByRole("button", { name: /claim 10 coins/i })).toBeTruthy();
  });
});
