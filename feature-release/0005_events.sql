CREATE TABLE IF NOT EXISTS live_events (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, game_id TEXT NOT NULL,
 starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
 reward INTEGER NOT NULL DEFAULT 0, winners INTEGER NOT NULL DEFAULT 1,
 description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#4cd7f6',
 text_color TEXT NOT NULL DEFAULT '#071016', button_title TEXT NOT NULL DEFAULT 'View event',
 icon TEXT NOT NULL DEFAULT '🏆', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS event_settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO event_settings VALUES ('score','true'),('time','true'),('ads','true');
CREATE TABLE IF NOT EXISTS event_scores (
 session_id TEXT PRIMARY KEY REFERENCES play_sessions(id), player_id TEXT NOT NULL,
 game_id TEXT NOT NULL, score INTEGER NOT NULL, submitted_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS event_clock (
 player_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, last_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS event_time (
 event_id TEXT NOT NULL REFERENCES live_events(id), session_id TEXT NOT NULL,
 player_id TEXT NOT NULL, game_id TEXT NOT NULL, seconds INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(event_id, session_id)
);
CREATE TABLE IF NOT EXISTS event_claims (
 event_id TEXT NOT NULL REFERENCES live_events(id), player_id TEXT NOT NULL,
 reward_id TEXT NOT NULL UNIQUE, amount INTEGER NOT NULL, PRIMARY KEY(event_id, player_id)
);
CREATE TABLE IF NOT EXISTS game_session_time (
 session_id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT NOT NULL,
 seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS game_time_players ON game_session_time(game_id,player_id);
CREATE TABLE IF NOT EXISTS ad_placements (
 id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, title TEXT NOT NULL,
 src TEXT NOT NULL, width INTEGER NOT NULL DEFAULT 300, height INTEGER NOT NULL DEFAULT 250,
 radius INTEGER NOT NULL DEFAULT 14, background TEXT NOT NULL DEFAULT '#151925'
);
INSERT OR IGNORE INTO ad_placements(id,title,src) VALUES
 ('arcade','Advertisement','https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250'),
 ('ranks','Advertisement','https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250'),
 ('loot','Advertisement','https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250'),
 ('profile','Advertisement','https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250'),
 ('events','Advertisement','https://groadz.com/advertisement-api/api/ads/render?domain=grosats.com&width=300&height=250');
CREATE INDEX IF NOT EXISTS event_time_players ON event_time(event_id,player_id);
CREATE INDEX IF NOT EXISTS event_score_games ON event_scores(game_id,submitted_at,status);
