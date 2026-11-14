# Events and owned HTML games

Existing Android game overlays report cumulative time using their native timer. Repeated sessions add to a player's per-game total within each time event. The server bounds heartbeat credit to 45 seconds per update and allows one active clock per player. Time outside event dates is excluded. Browser games opened on third-party tabs cannot report verified activity; integrate owned games using the iframe bridge.

To launch an owned game, pass `{ id: 'exact-game-id', title: 'My game', playUrl: 'https://your-game.example/index.html', embedded: true }` to `GameWebViewOverlay`. The game ID must match the PMS event. This uses an iframe on both web and Android without rebuilding a native bridge. The game server must allow framing by the app.

Include `/playloot-game-sdk.js` (copy from the app's public directory to your game) and initialize:

```js
PlaylootGame.init('https://playloot.pages.dev');
// Use the actual app origin for Android builds (normally https://localhost).
// On game completion, send the final score once:
PlaylootGame.submitScore(1250);
```

No player ID or authentication token is sent to the game. The parent validates the frame and origin and associates the request with the authenticated play session. One final score is accepted per session. Scores are pending until approved in PMS before event end. A game-specific server validator should replace manual approval when you supply the games: client JavaScript cannot prove an honest score. Heartbeats similarly establish bounded activity rather than cheat-proof gameplay.

Create events in PMS with future dates, the exact game ID, coin prize per winner and number of winners. Time uses cumulative seconds; score uses the best approved score. Ties use player ID ascending. Winners are capped at 1,000; result views return the first 1,000 players. Ended results cannot be edited via score review. Rules and rewards lock once an event starts. Disable started events instead of removing their reward history. Disabling pauses new credit and claims; existing results remain stored.

Each prize claim uses an atomic database batch and a unique event/player record. Ads are placed on Arcade, Ranks, Loot, Profile and Events, with source, width, height, radius, background, title and enabled controls. The source URL dimensions may also need changing for providers that render fixed-size creatives.
