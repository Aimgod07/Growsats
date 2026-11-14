import {readFileSync,writeFileSync} from 'node:fs';
const base=new URL('./0009_account_architecture.sql',import.meta.url);
let sql=readFileSync(base,'utf8');
const valid=['coins','diamonds','cash_cents','loot'].map(c=>`typeof(NEW.${c})!='integer' OR NEW.${c}<0 OR NEW.${c}>9007199254740991`).join(' OR ');
for(const op of ['INSERT','UPDATE']) sql+=`\nCREATE TRIGGER wallet_validate_${op.toLowerCase()} BEFORE ${op} ON wallets WHEN ${valid} BEGIN SELECT RAISE(ABORT,'Invalid wallet balance'); END;\n`;
for(const asset of ['coins','diamonds','cash_cents','loot']){
 sql+=`CREATE TRIGGER wallet_log_${asset} AFTER UPDATE OF ${asset} ON wallets WHEN NEW.${asset}!=OLD.${asset} BEGIN
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event) VALUES(NEW.user_id,'${asset}',NEW.${asset}-OLD.${asset},OLD.${asset},NEW.${asset},'balance_change'); END;\n`;
 sql+=`CREATE TRIGGER wallet_open_${asset} AFTER INSERT ON wallets BEGIN INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event) VALUES(NEW.user_id,'${asset}',NEW.${asset},0,NEW.${asset},'wallet_opening'); END;\n`;
}
for(const [table,key] of [['users','id'],['play_sessions','user_id'],['game_session_time','player_id'],['spins','user_id'],['redemptions','user_id'],['reward_ledger','user_id'],['user_settings','user_id']]){
 for(const op of ['INSERT','UPDATE']) sql+=`CREATE TRIGGER activity_${table}_${op.toLowerCase()} AFTER ${op} ON ${table} BEGIN
 INSERT OR REPLACE INTO user_activity SELECT * FROM activity_snapshot WHERE user_id=NEW.${key}; END;\n`;
}
sql+=`INSERT OR IGNORE INTO referral_bonus_claims SELECT DISTINCT p.user_id,'legacy_'||p.user_id FROM play_sessions p JOIN users u ON u.id=p.user_id WHERE p.claimed=1 AND u.referred_by IS NOT NULL;\n`;
sql+=`CREATE TRIGGER activity_referrer AFTER INSERT ON users WHEN NEW.referred_by IS NOT NULL BEGIN INSERT OR REPLACE INTO user_activity SELECT * FROM activity_snapshot WHERE user_id=NEW.referred_by; END;\n`;
writeFileSync(new URL('./0009_generated.sql',import.meta.url),sql);
