import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ComingSoon from "./ComingSoon";

function renderComingSoon(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coming-soon/:feature" element={<ComingSoon />} />
        <Route path="/Home" element={<p>Arcade home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ComingSoon", () => {
  it.each([
    ["quick-match", "Quick Match"],
    ["boss-raids", "Boss Raids"],
    ["tournaments", "Tournaments"],
  ])("renders the %s feature page", (slug, title) => {
    renderComingSoon(`/coming-soon/${slug}`);

    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to arcade/i }).getAttribute("href")).toBe("/Home");
  });

  it("redirects unknown feature names to the arcade", () => {
    renderComingSoon("/coming-soon/unknown");
    expect(screen.getByText("Arcade home")).toBeTruthy();
  });
});
