CREATE TABLE payment_providers (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO payment_providers(id,title,enabled) VALUES('default','Primary payment provider',1);
CREATE TABLE payment_provider_methods (
 provider_id TEXT NOT NULL REFERENCES payment_providers(id), method_id TEXT NOT NULL REFERENCES payment_methods(id),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 deposit_enabled INTEGER NOT NULL DEFAULT 1 CHECK(deposit_enabled IN (0,1)),
 withdraw_enabled INTEGER NOT NULL DEFAULT 1 CHECK(withdraw_enabled IN (0,1)),
 PRIMARY KEY(provider_id,method_id)
);
INSERT INTO payment_provider_methods SELECT 'default',id,enabled,deposit_enabled,withdraw_enabled FROM payment_methods;
ALTER TABLE payment_requests ADD COLUMN provider_id TEXT NOT NULL DEFAULT 'default';
DROP INDEX payment_provider_reference;
CREATE UNIQUE INDEX payment_provider_reference ON payment_requests(provider_id,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE TRIGGER payment_provider_identity BEFORE UPDATE OF provider_id ON payment_requests WHEN NEW.provider_id!=OLD.provider_id BEGIN SELECT RAISE(ABORT,'Payment provider is immutable'); END;
CREATE TRIGGER payment_provider_available BEFORE INSERT ON payment_requests WHEN NOT EXISTS (
 SELECT 1 FROM payment_providers p JOIN payment_provider_methods pm ON pm.provider_id=p.id JOIN payment_methods m ON m.id=pm.method_id
 WHERE p.id=NEW.provider_id AND pm.method_id=NEW.method_id AND p.enabled=1 AND pm.enabled=1 AND m.enabled=1
 AND (CASE NEW.direction WHEN 'deposit' THEN pm.deposit_enabled*m.deposit_enabled ELSE pm.withdraw_enabled*m.withdraw_enabled END)=1
) BEGIN SELECT RAISE(ABORT,'Payment provider or method disabled'); END;
