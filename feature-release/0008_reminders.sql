CREATE TABLE IF NOT EXISTS reminder_config (id INTEGER PRIMARY KEY CHECK(id=1), config TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, subscription TEXT NOT NULL, next_at INTEGER NOT NULL, sequence INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS push_due ON push_subscriptions(next_at);
