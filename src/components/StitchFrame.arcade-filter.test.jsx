import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const source = readFileSync(resolve("src/components/StitchFrame.jsx"), "utf8");
const design = readFileSync(resolve(".stitch/designs/eb7ea18c382b4a80ab35bb97e09fecdd.html"), "utf8");

function loader() {
  const marker = "const GAME_GRID_LOADER = `";
  const start = source.indexOf(marker) + marker.length;
  return source.slice(start, source.indexOf("`;", start))
    .replace(/\\\\/g, "\\")
    .replace(/<\/?script>/g, "")
    .replace("__GAMES_API_URL__", "http://games.test/games").replace('__APP_CONFIG__', '{}');
}

describe("arcade category filters", () => {
  it("renders cached cards immediately when the arcade frame is revisited", () => {
    const body = design.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    const dom = new JSDOM(`<!DOCTYPE html><body>${body}</body>`, { runScripts: "dangerously" });
    const { window } = dom;
    window.__playlootGameCatalog = {
      peek: () => [{ code: "cached", name: "Already Loaded", category: { name: "Action" } }],
      get: () => { throw new Error("Cached catalog should not be fetched again"); },
    };
    window.fetch = () => { throw new Error("Cached catalog should not be fetched again"); };
    const script = window.document.createElement("script");
    script.textContent = loader();
    window.document.body.appendChild(script);
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    expect(window.document.querySelector('[data-game-id="cached"]')).toBeTruthy();
    dom.window.close();
  });

  it("shows games from the selected live category and restores all games", async () => {
    const body = design.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    const dom = new JSDOM(`<!DOCTYPE html><body>${body}</body>`, { runScripts: "dangerously" });
    const { window } = dom;
    window.fetch = async () => ({ ok: true, json: async () => ({ data: [
      { code: "a", name: "Rocket Run", category: { name: "Action" } },
      { code: "b", name: "Brain Maze", category: { name: "Puzzle" } },
      { code: "c", name: "Turbo Dash", category: { name: "Action" } },
    ] }) });
    const script = window.document.createElement("script");
    script.textContent = loader();
    window.document.body.appendChild(script);
    await new Promise((resolve_) => setTimeout(resolve_, 30));

    const cards = () => [...window.document.querySelectorAll("[data-game-card]")].map((card) => card.getAttribute("data-game-title"));
    const category = (name) => [...window.document.querySelectorAll("[data-arcade-category]")].find((button) => button.textContent.includes(name));
    expect(cards()).toEqual(["Rocket Run", "Brain Maze", "Turbo Dash"]);
    expect(category("Action")).toBeTruthy();
    category("Action").click();
    expect(cards()).toEqual(["Rocket Run", "Turbo Dash"]);
    expect(category("Action").getAttribute("aria-pressed")).toBe("true");
    category("Hot & Trending").click();
    expect(cards()).toEqual(["Rocket Run", "Brain Maze", "Turbo Dash"]);
    dom.window.close();
  });
});
