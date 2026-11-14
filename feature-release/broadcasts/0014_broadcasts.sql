CREATE TABLE IF NOT EXISTS notification_broadcasts (
 id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, path TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'preparing', created_at INTEGER NOT NULL, inbox_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS native_push_devices (
 token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS native_push_user ON native_push_devices(user_id);
CREATE TABLE IF NOT EXISTS broadcast_deliveries (
 broadcast_id TEXT NOT NULL REFERENCES notification_broadcasts(id) ON DELETE CASCADE,
 channel TEXT NOT NULL CHECK(channel IN ('web','android')), target TEXT NOT NULL, user_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL,
 lease TEXT, last_error TEXT, PRIMARY KEY(broadcast_id,channel,target)
);
CREATE INDEX IF NOT EXISTS broadcast_due ON broadcast_deliveries(status,next_at);
ALTER TABLE notifications ADD COLUMN path TEXT;
