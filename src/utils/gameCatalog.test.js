import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearGameCatalog, getGameCatalog, peekGameCatalog } from "./gameCatalog";

beforeEach(() => clearGameCatalog());

describe("shared game catalog", () => {
  it('replaces cached games with an empty list when providers are disabled', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ok:true,json:async()=>({games:[{code:'a'}]})})
      .mockResolvedValueOnce({ok:true,json:async()=>({games:[]})});
    await getGameCatalog('https://games.test/games');
    expect(await getGameCatalog('https://games.test/games',true)).toEqual([]);
    expect(peekGameCatalog('https://games.test/games')).toEqual([]);
  });
  it("reuses one request for concurrent views and on later navigation", async () => {
    const games = [{ code: "a", name: "Arcade A", images: {square:"https://provider.test/square.jpg",thumb:"https://provider.test/thumb.jpg",cover:"https://provider.test/cover.jpg"},thumbnail:"https://provider.test/thumbnail.jpg" }];
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: games }) }));
    const [first, second] = await Promise.all([
      getGameCatalog("https://games.test/games"),
      getGameCatalog("https://games.test/games"),
    ]);
    expect(first[0]).toMatchObject(games[0]);
    expect(first).toEqual(games);
    expect(second).toBe(first);
    expect(peekGameCatalog("https://games.test/games")).toBe(first);
    await getGameCatalog("https://games.test/games");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes only when requested and preserves visible games if refresh fails", async () => {
    const url = "https://games.test/games";
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ code: "a" }] }) })
      .mockRejectedValueOnce(new Error("offline"));
    const cached = await getGameCatalog(url);
    await expect(getGameCatalog(url, true)).rejects.toThrow("offline");
    expect(peekGameCatalog(url)).toBe(cached);
  });
});
