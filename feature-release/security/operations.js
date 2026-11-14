import {json,fail,sha256,randomId,readJsonStrict} from '../lib/util.js';

const clean=(v,n=160)=>typeof v==='string'?v.trim().slice(0,n):'';
export const clientIp=request=>request.headers.get('cf-connecting-ip') || null;
export async function recordLogin(env,request,userId,signup=false){
 const ip=clientIp(request);
 await env.DB.batch([
  env.DB.prepare(`UPDATE user_authentication SET signup_ip=CASE WHEN ?1=1 THEN ?2 ELSE signup_ip END,last_login_ip=?2,last_login_at=datetime('now'),login_count=login_count+1 WHERE user_id=?3`).bind(signup?1:0,ip,userId),
  env.DB.prepare('INSERT INTO security_events(user_id,event,ip) VALUES(?,?,?)').bind(userId,signup?'signup':'login',ip),
 ]);
}

export async function deviceRoute(request,env,session){
 if(request.method!=='POST')return fail('Method not allowed',405);
 const {data:p,error}=await readJsonStrict(request);if(error)return error;
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(p?.installationId||''))return fail('Invalid installation ID');
 // App-scoped random installation ID, hashed on the server. Not a hardware identifier.
 const id=await sha256('playloot-device-v1:'+p.installationId);
 const recent=await env.DB.prepare("SELECT 1 FROM user_devices WHERE user_id=? AND fingerprint_id=? AND last_seen>datetime('now','-10 minutes')").bind(session.user.id,id).first();
 if(recent)return json({ok:true});
 const ip=clientIp(request);
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO device_fingerprints(id,model,operating_system,platform,browser,user_agent,screen,timezone,language,first_ip,last_ip)
  VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET model=excluded.model,operating_system=excluded.operating_system,platform=excluded.platform,browser=excluded.browser,user_agent=excluded.user_agent,screen=excluded.screen,timezone=excluded.timezone,language=excluded.language,last_ip=excluded.last_ip,last_seen=datetime('now')`)
   .bind(id,clean(p.model),clean(p.os),clean(p.platform),clean(p.browser),clean(request.headers.get('user-agent'),512),clean(p.screen,40),clean(p.timezone,80),clean(p.language,40),ip,ip),
  env.DB.prepare(`INSERT INTO user_devices(user_id,fingerprint_id,last_ip) VALUES(?,?,?) ON CONFLICT(user_id,fingerprint_id) DO UPDATE SET last_ip=excluded.last_ip,last_seen=datetime('now')`).bind(session.user.id,id,ip),
  env.DB.prepare(`UPDATE user_devices SET trust_score=CASE WHEN (SELECT COUNT(*) FROM user_devices d WHERE d.fingerprint_id=user_devices.fingerprint_id)>1 THEN 60 ELSE 100 END,
   risk_reasons=CASE WHEN (SELECT COUNT(*) FROM user_devices d WHERE d.fingerprint_id=user_devices.fingerprint_id)>1 THEN '["shared_installation"]' ELSE '[]' END WHERE fingerprint_id=?`).bind(id),
  env.DB.prepare('INSERT INTO security_events(user_id,event,ip,fingerprint_id) VALUES(?,?,?,?)').bind(session.user.id,'device_seen',ip,id),
 ]);
 return json({ok:true});
}

// Every dataset is explicitly allowlisted; no credentials, tokens or 2FA secrets leave this endpoint.
const datasets={
 players:`SELECT u.id,u.name,u.email,u.handle,u.banned,u.created_at,a.signup_ip,a.last_login_ip,a.last_login_at,a.login_count,x.level,x.medal,x.games_played,x.play_seconds,x.rewards_count,x.achievements,x.settings FROM users u JOIN user_authentication a ON a.user_id=u.id LEFT JOIN user_activity x ON x.user_id=u.id`,
 wallets:`SELECT w.*,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='coins' AND t.event='balance_change' AND amount>0),0) AS coins_received_since_migration,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='diamonds' AND t.event='balance_change' AND amount>0),0) AS diamonds_received_since_migration,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='cash_cents' AND t.event='balance_change' AND amount>0),0) AS cash_received_since_migration,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='loot' AND t.event='balance_change' AND amount>0),0) AS loot_received_since_migration,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='coins'),0)-w.coins AS coin_difference,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='diamonds'),0)-w.diamonds AS diamond_difference,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='cash_cents'),0)-w.cash_cents AS cash_difference,
 IFNULL((SELECT SUM(amount) FROM transaction_log t WHERE t.user_id=w.user_id AND t.asset='loot'),0)-w.loot AS loot_difference FROM wallets w`,
 transactions:'SELECT * FROM transaction_log',withdrawals:'SELECT * FROM withdrawals',deposits:'SELECT * FROM deposits',
 referrals:`SELECT r.*,IFNULL((SELECT SUM(e.amount) FROM referral_earnings e WHERE e.referred_user_id=r.user_id AND e.referrer_id=r.referrer_id AND e.asset='coins'),0) AS earned_for_referrer_coins FROM referrals r`,
 referralEarnings:'SELECT * FROM referral_earnings',rewards:'SELECT * FROM reward_ledger',
 devices:`SELECT d.user_id,d.trust_score,d.risk_reasons,d.last_ip,d.first_seen,d.last_seen,f.id AS fingerprint_id,f.model,f.operating_system,f.platform,f.browser,f.user_agent,f.screen,f.timezone,f.language,
 (SELECT COUNT(*) FROM user_devices d2 WHERE d2.fingerprint_id=d.fingerprint_id) AS linked_accounts FROM user_devices d JOIN device_fingerprints f ON f.id=d.fingerprint_id`,
 security:'SELECT * FROM security_events',
};
export async function operationsAdmin(request,env){
 const url=new URL(request.url), dataset=url.searchParams.get('dataset')||'players';
 if(request.method==='POST' && dataset==='deposits'){
  const {data:p,error}=await readJsonStrict(request);if(error)return error;
  if(!p || !['coins','diamonds','cash_cents','loot'].includes(p.asset) || !Number.isSafeInteger(p.amount) || p.amount<1 || p.amount>1e9 || !clean(p.userId) || !clean(p.provider) || !clean(p.reference) || clean(p.evidence,500).length<10)return fail('Provide a user, asset, positive integer amount, provider, unique reference and verification evidence');
  const wallet=await env.DB.prepare('SELECT currency FROM wallets WHERE user_id=?').bind(p.userId).first();if(!wallet)return fail('Wallet not found',404);
  const existing=await env.DB.prepare('SELECT * FROM deposits WHERE provider=? AND external_reference=?').bind(clean(p.provider),clean(p.reference)).first();
  if(existing)return existing.user_id===p.userId && existing.asset===p.asset && existing.amount===p.amount?json({id:existing.id,duplicate:true}):fail('This reference already belongs to another deposit',409);
  const id=randomId('dep');
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO deposits(id,user_id,asset,amount,currency,provider,external_reference,evidence) VALUES(?,?,?,?,?,?,?,?)').bind(id,p.userId,p.asset,p.amount,wallet.currency,clean(p.provider),clean(p.reference),clean(p.evidence,500)),
   env.DB.prepare("INSERT INTO security_events(user_id,event,ip,details) VALUES(?,'admin_deposit',?,?)").bind(p.userId,clientIp(request),JSON.stringify({depositId:id,actor:'pms-admin'})),
  ]);}catch(e){if(String(e).includes('UNIQUE'))return fail('Deposit reference already recorded; refresh to verify',409);throw e;}
  return json({id},201);
 }
 if(request.method!=='GET')return fail('Method not allowed',405);
 if(!datasets[dataset])return fail('Unknown dataset');
 const offset=Math.max(0,Math.min(1e7,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
 const user=clean(url.searchParams.get('userId')), term=clean(url.searchParams.get('q'),80);
 const key=dataset==='players'?'id':'user_id';
 const filter=dataset==='players'?`(?1='' OR id=?1) AND (?2='' OR instr(lower(name||' '||email||' '||handle),lower(?2))>0)`:
 ['referralEarnings'].includes(dataset)?`(?1='' OR referrer_id=?1 OR referred_user_id=?1)`:
 dataset==='referrals'?`(?1='' OR user_id=?1 OR referrer_id=?1)`:`(?1='' OR ${key}=?1)`;
 const order=['transactions','security'].includes(dataset)?'id DESC':dataset==='players'?'created_at DESC,id':dataset==='devices'?'last_seen DESC,user_id':dataset==='wallets'?'user_id':dataset==='referralEarnings'?'created_at DESC,ledger_id':dataset==='referrals'?'created_at DESC,user_id':'created_at DESC,id';
 const query=env.DB.prepare(`SELECT * FROM (${datasets[dataset]}) WHERE ${filter} ORDER BY ${order} LIMIT 51 OFFSET ?${dataset==='players'?3:2}`);
 const result=await (dataset==='players'?query.bind(user,term,offset):query.bind(user,offset)).all();
 return json({rows:result.results.slice(0,50),hasMore:result.results.length>50,offset});
}
