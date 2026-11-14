const fs = require('node:fs');
const root = 'C:/Users/choud/Desktop/playloot-backend';
function edit(file, before, after) {
  const path = root + '/' + file;
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error('Expected source missing: ' + file);
  fs.writeFileSync(path, source.replace(before, after));
}
fs.writeFileSync(root + '/migrations/0013_play_close.sql', `ALTER TABLE play_sessions ADD COLUMN closed_at TEXT;
CREATE INDEX IF NOT EXISTS play_active ON play_sessions(user_id,claimed,closed_at,last_seen_at);
`);
edit('src/routes/rewards.js', '  // Without a cap a client can open unlimited sessions by spamming this route.', `  // Retire abandoned sessions (app killed, disconnected, or an older client).
  // This does not credit coins or erase earned time; claims use the saved clock.
  await env.DB.prepare("UPDATE play_sessions SET closed_at=datetime('now') WHERE user_id=?1 AND claimed=0 AND closed_at IS NULL AND last_seen_at < datetime('now','-3 minutes')")
    .bind(session.user.id).run();
  // Without a cap a client can open unlimited sessions by spamming this route.`);
edit('src/routes/rewards.js', 'WHERE user_id = ?1 AND claimed = 0\n', 'WHERE user_id = ?1 AND claimed = 0 AND closed_at IS NULL\n');
edit('src/routes/rewards.js', 'WHERE user_id=?2 AND claimed=0 AND started_at>', 'WHERE user_id=?2 AND claimed=0 AND closed_at IS NULL AND started_at>');
edit('src/routes/rewards.js', 'export async function claimPlayRoute', `export async function closePlayRoute(session, env, payload) {
  if (typeof payload?.sessionId !== 'string' || !payload.sessionId) return fail('sessionId is required',400,'bad_request');
  await env.DB.prepare("UPDATE play_sessions SET closed_at=COALESCE(closed_at,datetime('now')) WHERE id=?1 AND user_id=?2")
    .bind(payload.sessionId,session.user.id).run();
  return {ok:true,closed:true};
}

export async function claimPlayRoute`);
edit('src/index.js', 'startPlayRoute, claimPlayRoute,', 'startPlayRoute, closePlayRoute, claimPlayRoute,');
edit('src/index.js', '    if (path === "/api/games/play/claim"', `    if (path === "/api/games/play/close" && method === "POST") {
      return withBody(request, (payload) => closePlayRoute(session, env, payload));
    }

    if (path === "/api/games/play/claim"`);
edit('src/routes/events.js', "&& play.claimed)return", "&& (play.claimed || play.closed_at))return");
edit('src/routes/events.js', "  if(play.claimed)return", "  if(play.claimed || play.closed_at)return");
edit('src/routes/events.js', '    await env.DB.batch(statements);return json({ok:true});', `    statements.push(env.DB.prepare("UPDATE play_sessions SET last_seen_at=datetime('now') WHERE id=? AND user_id=? AND closed_at IS NULL AND claimed=0").bind(play.id,uid));
    await env.DB.batch(statements);return json({ok:true});`);
