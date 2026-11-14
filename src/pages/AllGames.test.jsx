import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AllGames from "./AllGames";
import { clearGameCatalog } from "../utils/gameCatalog";
const config = vi.hoisted(()=>({screens:{arcade:{grid:{limit:1}},allGames:{grid:{limit:0}}}}));
vi.mock('../config/appConfig',()=>({useAppConfig:()=>config}));

const GAMES = [
  { code: "g1", name: "Neon Drift", description: "Race", category: { name: "Racing" }, screen_orientation: "landscape", images: { square: "https://img/1.jpg" }, url: "https://play/1" },
  { code: "g2", name: "Puzzle Box", description: "Puzzle", category: { name: "Puzzle" }, screen_orientation: "portrait", images: { square: "https://img/2.jpg" }, url: "https://play/2" },
];

function mockGames({ fail = false } = {}) {
  global.fetch = vi.fn(async () => {
    if (fail) throw new TypeError("Failed to fetch");
    return { ok: true, status: 200, json: async () => GAMES.map(g=>({id:g.code,title:g.name,category:g.category.name,path:"/grogames/"+g.code+"/index.html",cover:g.images.square})) };
  });
}

function renderGames(initialEntry = "/all-games") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AllGames />
    </MemoryRouter>,
  );
}

describe("AllGames resilience", () => {
  beforeEach(() => {clearGameCatalog();config.screens.allGames.grid={limit:0};config.screens.arcade.grid.categories=[];config.screens.arcade.categories={selected:[]};});
  it('shows the entire GroGames catalog despite provider limits and filters',async()=>{
    config.screens.allGames.grid.limit=18;
    config.screens.arcade.grid.categories=['Racing'];
    config.screens.arcade.categories.selected=['Racing'];
    const originals=Array.from({length:100},(_,i)=>({id:'gro-'+i,title:'Original '+i,category:'Puzzle',path:'/grogames/gro-'+i+'/index.html'}));
    global.fetch=vi.fn(async()=>({ok:true,json:async()=>originals}));
    renderGames('/all-games?source=grogames');
    await screen.findByText('Original 99');
    expect(screen.getAllByText(/^Original \d+$/)).toHaveLength(100);
    fireEvent.change(screen.getByPlaceholderText('Search GroGames'),{target:{value:'Original 99'}});
    expect(screen.queryByText('Original 0')).toBeNull();
    expect(screen.getByText('Original 99')).toBeTruthy();
  });
  it('uses the GroGames limit independently of Gamezop',async()=>{
    config.screens.allGames.grid={gamezopLimit:50,groGamesLimit:1};
    global.fetch=vi.fn(async()=>({ok:true,json:async()=>[{id:'a',title:'Original A',path:'/grogames/a/'},{id:'b',title:'Original B',path:'/grogames/b/'}]}));
    renderGames('/all-games?source=grogames');await screen.findByText('Original A');expect(screen.queryByText('Original B')).toBeNull();
  });
  it('uses the GroGames limit on the default catalog route',async()=>{
    config.screens.allGames.grid={limit:1,gamezopLimit:0,groGamesLimit:1};mockGames();renderGames();await screen.findByText('Neon Drift');expect(screen.queryByText('Puzzle Box')).toBeNull();
  });
  it('uses the All Games limit independently of the Arcade limit',async()=>{
    config.screens.allGames.grid.limit=1;mockGames();renderGames();
    await screen.findByText('Neon Drift');expect(screen.getByText('Puzzle Box')).toBeTruthy();
  });
  it("lists games when the catalog is reachable", async () => {
    mockGames();
    renderGames();
    await waitFor(() => expect(screen.getByText("Neon Drift")).toBeTruthy());
    expect(screen.getByText("Puzzle Box")).toBeTruthy();
  });

  it("reuses the page for GroGames without mixing in Gamezop titles", async () => {
    global.fetch = vi.fn(async (url) => {
      expect(String(url)).toContain('/grogames/manifest.json');
      return { ok: true, status: 200, json: async () => ([{id:'gro-1',title:'Orbit Bloom',category:'Puzzle',orientation:'portrait',path:'/grogames/orbit-bloom/index.html',cover:'/grogames/covers/orbit-bloom.webp'}]) };
    });
    renderGames('/all-games?source=grogames');
    await screen.findByText('Orbit Bloom');
    expect(screen.getByRole('heading',{name:'GroGames'})).toBeTruthy();
    expect(screen.queryByText('Neon Drift')).toBeNull();
  });

  it("shows a retry state when the very first load fails", async () => {
    mockGames({ fail: true });
    renderGames();
    await waitFor(() => expect(screen.getByText(/Couldn't load games right now/)).toBeTruthy());
  });

  it("keeps the catalog visible when a refresh fails", async () => {
    let shouldFail = false;
    global.fetch = vi.fn(async () => {
      if (shouldFail) throw new TypeError("Failed to fetch");
      return { ok: true, status: 200, json: async () => GAMES.map(g=>({id:g.code,title:g.name,category:g.category.name,path:"/grogames/"+g.code+"/index.html",cover:g.images.square})) };
    });

    renderGames();
    await waitFor(() => expect(screen.getByText("Neon Drift")).toBeTruthy());

    // A later refresh fails: the previously loaded games must stay on screen.
    shouldFail = true;
    fireEvent.click(screen.getByLabelText("Refresh games"));

    await waitFor(() => expect(screen.getByText(/Showing the games we already have/)).toBeTruthy());
    expect(screen.getByText("Neon Drift")).toBeTruthy();
    expect(screen.getByText("Puzzle Box")).toBeTruthy();
  });
});
