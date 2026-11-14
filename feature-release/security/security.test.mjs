import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root='C:/Users/choud/Desktop/playloot-backend';
const mod=path=>import(pathToFileURL(root+'/src/'+path));
const {claimDailyRoute,claimMissionRoute}=await mod('routes/hub.js');
const {claimPlayRoute,startPlayRoute,spinRoute}=await mod('routes/rewards.js');
const {recordAuthFailure,checkLoginLimit,clearAuthFailures,checkSignupLimit}=await mod('lib/rate-limit.js');
const {paymentPlayer,paymentWebhook}=await mod('routes/payments.js');
const {limitRequest,boundedRequest}=await mod('lib/security.js');
const {redeemRoute,playerSearchRoute}=await mod('routes/account.js');
const {REDEEM_CATALOG,REDEMPTIONS_PER_DAY}=await mod('lib/catalog.js');
function setup(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const f of readdirSync(root+'/migrations').sort().filter(f=>f.endsWith('.sql')))db.exec(readFileSync(root+'/migrations/'+f,'utf8'));
 db.exec("INSERT INTO users(id,email,password_hash,salt,name,handle) VALUES('u','u@test.com','hash','salt','Player','player'); INSERT INTO wallets(user_id,cash_cents,coins) VALUES('u',10000,1000000)");
 let tail=Promise.resolve();
 const prepare=sql=>{let args=[];return{bind(...p){args=p;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};};
 const env={PAYMENTS_ENABLED:'true',PAYMENT_API_URL:'https://adapter.example/payments',PAYMENT_API_TOKEN:'test-token',PAYMENT_WEBHOOK_SECRET:'test-signature-secret',PAYMENT_CHECKOUT_ORIGINS:'https://checkout.example',TWO_STEP_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),DB:{prepare,batch(ss){const next=tail.then(async()=>{db.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}});tail=next.catch(()=>{});return next;}}};
 return{db,env};
}
const session={user:{id:'u'},wallet:{coins:1000000}};
test('same redemption request is charged once across concurrent calls and retries',async()=>{
 const {db,env}=setup(),option=REDEEM_CATALOG[0].options[0],p={optionId:option.id,idempotencyKey:'redemption-request-001'};
 const results=await Promise.all([redeemRoute(session,env,p),redeemRoute(session,env,p)]);
 assert.equal(results[0].redemption.id,results[1].redemption.id);
 const again=await redeemRoute(session,env,p);assert.equal(again.redemption.id,results[0].redemption.id);
 assert.equal(db.prepare('SELECT coins FROM wallets').get().coins,1000000-option.coinsRequired);
});
test('event winners are frozen after end and cannot expand when accounts change',async()=>{
 const {db,env}=setup(),{eventPublic}=await mod('routes/events.js'),now=Math.floor(Date.now()/1000);
 db.exec("INSERT INTO users(id,email,password_hash,salt,name,handle) VALUES('v','v@test.com','hash','salt','Other','other');INSERT INTO wallets(user_id) VALUES('v');INSERT INTO event_settings(id,value) VALUES('time','true') ON CONFLICT(id) DO UPDATE SET value='true';INSERT INTO play_sessions(id,user_id,game_code) VALUES('s1','u','game'),('s2','v','game')");
 db.prepare("INSERT INTO live_events(id,kind,title,game_id,starts_at,ends_at,enabled,reward,winners,created_at) VALUES('e','time','Event','game',?,?,1,100,1,?)").run(now-1000,now-1,now-2000);
 db.exec("INSERT INTO event_time(event_id,session_id,player_id,game_id,seconds) VALUES('e','s1','u','game',200),('e','s2','v','game',100)");
 const request=new Request('https://test/api/events/e');
 assert.equal((await (await eventPublic(request,env,session,'/api/events/e')).json()).players[0].player_id,'u');
 db.exec("UPDATE users SET banned=1 WHERE id='u'");
 const board=await (await eventPublic(request,env,{user:{id:'v'}},'/api/events/e')).json();assert.equal(board.me.rank,2);
 assert.equal((await eventPublic(new Request('https://test/api/events/e/claim',{method:'POST'}),env,{user:{id:'v'}},'/api/events/e/claim')).status,409);
});
test('daily, spin and mission receipts rollback on wallet failure; concurrent claims award once',async()=>{
 for(const kind of ['daily','spin','mission']){
  const {db,env}=setup();
  if(kind==='mission')db.exec("INSERT INTO play_sessions(id,user_id,game_code,claimed,seconds,coins_awarded) VALUES('qualified','u','g',1,180,200)");
  const claim=()=>kind==='daily'?claimDailyRoute(session,env):kind==='spin'?spinRoute(session,env):claimMissionRoute(session,env,{id:'earn_coins'});
  db.exec("CREATE TRIGGER test_wallet_fail BEFORE UPDATE ON wallets BEGIN SELECT RAISE(ABORT,'simulated database failure'); END;");
  await assert.rejects(claim());assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${kind==='daily'?'daily_claims':kind==='spin'?'spins':'mission_claims'}`).get().n,0);
  db.exec('DROP TRIGGER test_wallet_fail');const results=await Promise.all([claim(),claim()]);assert.equal(results.filter(r=>r instanceof Response&&r.status===409).length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reward_ledger').get().n,1);
 }
});
test('wall-clock idle time earns nothing; concurrent game claim and daily cap are atomic',async()=>{
 const {env,db}=setup();env.DAILY_EARN_CAP='15';
 db.exec("INSERT INTO play_sessions(id,user_id,game_code,started_at) VALUES('a','u','game',datetime('now','-1 hour')),('b','u','game',datetime('now','-1 hour'))");
 assert.equal((await claimPlayRoute(session,env,{sessionId:'a'})).status,409);
 db.exec("INSERT INTO game_session_time VALUES('a','u','game',180),('b','u','game',180)");
 const results=await Promise.all([claimPlayRoute(session,env,{sessionId:'a'}),claimPlayRoute(session,env,{sessionId:'a'}),claimPlayRoute(session,env,{sessionId:'b'})]);
 assert.equal(results.filter(r=>!(r instanceof Response)).length,1);
 assert.equal(db.prepare('SELECT SUM(coins_awarded) AS n FROM play_sessions').get().n,10);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reward_ledger').get().n,1);
});
test('empty sessions cannot earn play-count mission; simultaneous starts respect cap',async()=>{
 const {env,db}=setup();const results=await Promise.all(Array.from({length:8},()=>startPlayRoute(session,env,{gameCode:'g'})));
 assert.equal(results.filter(r=>!(r instanceof Response)).length,3);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM play_sessions').get().n,3);
 assert.equal((await claimMissionRoute(session,env,{id:'play_sessions'})).status,409);
});
test('redemption limit is not bypassed by concurrent calls',async()=>{
 const {env,db}=setup();const option=REDEEM_CATALOG[0].options[0];
 await Promise.all(Array.from({length:REDEMPTIONS_PER_DAY+4},()=>redeemRoute(session,env,{optionId:option.id})));
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM redemptions').get().n,REDEMPTIONS_PER_DAY);
 assert.equal(db.prepare('SELECT coins FROM wallets').get().coins,1000000-option.coinsRequired*REDEMPTIONS_PER_DAY);
});
test('login/account signup windows actually throttle; successful login cannot erase IP failures',async()=>{
 const {env}=setup(),req=new Request('https://test',{headers:{'cf-connecting-ip':'203.0.113.7'}});
 for(let i=0;i<8;i++)await recordAuthFailure(env,req,'test@example.com');
 assert.equal((await checkLoginLimit(env,req,'test@example.com')).status,429);
 for(let i=0;i<22;i++)await recordAuthFailure(env,req,'other@example.com');
 await clearAuthFailures(env,req,'test@example.com');assert.equal((await checkLoginLimit(env,req,'test@example.com')).status,429);
 for(let i=0;i<5;i++)assert.equal(await checkSignupLimit(env,req),null);
 assert.equal((await checkSignupLimit(env,req)).status,429);
 assert.equal(await limitRequest(env,'test',1),null);assert.equal((await limitRequest(env,'test',1)).status,429);
});
async function pay(env,key,reference,direction='deposit'){
 const old=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({reference}),{status:200});
 try{return await paymentPlayer(new Request('https://test/api/payments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({direction,methodId:'currency',amountMinor:100,idempotencyKey:key,destination:'account'})}),env,session,'/api/payments');}finally{globalThis.fetch=old;}
}
async function callback(env,row,status='succeeded',reference=row.provider_reference){
 const p={eventId:crypto.randomUUID(),paymentId:row.id,reference,direction:row.direction,methodId:row.method_id,amountMinor:row.amount_minor,currency:row.currency,status},raw=JSON.stringify(p),ts=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw))).toString('hex');
 return paymentWebhook(new Request('https://test/api/payments/webhook',{method:'POST',headers:{'x-payment-timestamp':ts,'x-payment-signature':signature},body:raw}),env);
}
test('one provider reference cannot settle two different deposits',async()=>{
 const {env,db}=setup();await pay(env,'payment-request-0001','ref-1');await pay(env,'payment-request-0002','ref-2');
 const [a,b]=db.prepare('SELECT * FROM payment_requests ORDER BY rowid').all();assert.equal((await callback(env,a)).status,200);
 assert.equal((await callback(env,b,'succeeded','ref-1')).status,409);assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,10100);
 assert.throws(()=>db.prepare('UPDATE payment_requests SET provider_reference=? WHERE id=?').run('different',a.id));
});
test('conflicting concurrent callbacks settle once; failed payout releases its reservation once',async()=>{
 const {env,db}=setup();await pay(env,'payment-request-0001','ref-1','withdraw');const row=db.prepare('SELECT * FROM payment_requests').get();
 const result=await Promise.all([callback(env,row,'failed'),callback(env,row,'succeeded')]);assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);
 const settled=db.prepare('SELECT status FROM payment_requests').get().status;
 const balance=settled==='failed'?10000:9900;
 assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,balance);assert.equal(db.prepare('SELECT status FROM payment_withdrawals').get().status,settled==='failed'?'released':'paid');
 await callback(env,row,settled);assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,balance);
 assert.throws(()=>db.exec('DELETE FROM payment_webhook_events'));
});
test('request size and JSON shape are bounded; wildcard search remains literal',async()=>{
 assert.equal((await boundedRequest(new Request('https://test/api/test',{method:'POST',body:'x'.repeat(140000)}))).error.status,413);
 assert.equal((await boundedRequest(new Request('https://test/api/test',{method:'POST',headers:{'content-type':'application/json'},body:'null'}))).error.status,400);
 const {env,db}=setup();db.exec("INSERT INTO users(id,email,password_hash,salt,name,handle) VALUES('v','v@test.com','hash','salt','A_%','literal');INSERT INTO wallets(user_id) VALUES('v')");
 const result=await playerSearchRoute(session,env,'_%');assert.equal(result.players.length,1);assert.equal(result.players[0].id,'v');
});
