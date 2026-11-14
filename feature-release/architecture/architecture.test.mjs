import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const backend='C:/Users/choud/Desktop/playloot-backend';
async function staged(name){const source=readFileSync(new URL(name,import.meta.url),'utf8').replace(/from (['"])(\.\.\/lib\/[^'"]+)\1/g,(_,q,p)=>`from '${pathToFileURL(backend+'/src/routes/'+p).href}'`);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const {operationsAdmin,deviceRoute,recordLogin}=await staged('operations.js');
const {payReferralBonus}=await staged('hub.js');
const {default:worker}=await import(pathToFileURL(backend+'/src/index.js'));
function setup(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(backend+'/migrations').sort().filter(f=>f.endsWith('.sql')&&!f.startsWith('0009')))db.exec(readFileSync(backend+'/migrations/'+file,'utf8'));
 db.exec(`INSERT INTO users(id,email,password_hash,salt,name,handle,invite_code) VALUES('old','old@test.com','hash','salt','Old','old','OLD');INSERT INTO wallets(user_id,coins) VALUES('old',330);`);
 db.exec(readFileSync(new URL('./0009_generated.sql',import.meta.url),'utf8'));
 function prepare(sql){let params=[];return{bind(...v){params=v;return this;},async first(){return db.prepare(sql).get(...params)||null;},async all(){return{results:db.prepare(sql).all(...params)};},async run(){const r=db.prepare(sql).run(...params);return{meta:{changes:Number(r.changes)}};}};}
 const env={DB:{prepare,async batch(stmts){db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const add=(id,ref=null)=>{db.prepare('INSERT INTO users(id,email,password_hash,salt,name,handle,invite_code,referred_by) VALUES(?,?,?,?,?,?,?,?)').run(id,id+'@test.com','hash','salt',id,id,id,ref);db.prepare('INSERT INTO wallets(user_id) VALUES(?)').run(id);};
 return{db,env,add};
}
const request=(dataset,body)=>new Request('https://test/api/pms/operations?dataset='+dataset,{method:body?'POST':'GET',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.1'},...(body?{body:JSON.stringify(body)}:{})});
test('migration preserves balances, captures all assets and rejects tampering and negative balances',()=>{
 const {db,add}=setup();assert.equal(db.prepare('SELECT coins FROM wallets').get().coins,330);add('new');
 db.exec("UPDATE wallets SET coins=coins+1,diamonds=5,cash_cents=100,loot=2 WHERE user_id='new'");
 for(const [asset,amount] of [['coins',1],['diamonds',5],['cash_cents',100],['loot',2]])assert.equal(db.prepare('SELECT SUM(amount) AS n FROM transaction_log WHERE user_id=? AND asset=?').get('new',asset).n,amount);
 assert.throws(()=>db.exec("UPDATE wallets SET coins=-1 WHERE user_id='new'"));assert.throws(()=>db.exec("UPDATE wallets SET coins=1.5 WHERE user_id='new'"));
 assert.throws(()=>db.exec('DELETE FROM transaction_log'));assert.throws(()=>db.exec('UPDATE transaction_log SET amount=0'));
});
test('verified deposit credits once, refuses reference reuse and logs one rupee',async()=>{
 const {env,db}=setup();const p={userId:'old',asset:'cash_cents',amount:100,provider:'bank',reference:'receipt-1',evidence:'Verified bank receipt'};
 assert.equal((await operationsAdmin(request('deposits',p),env)).status,201);
 assert.equal((await (await operationsAdmin(request('deposits',p),env)).json()).duplicate,true);
 assert.equal((await operationsAdmin(request('deposits',{...p,amount:200}),env)).status,409);
 assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,100);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM transaction_log WHERE event='balance_change'").get().n,1);
 assert.equal((await operationsAdmin(request('deposits',{...p,reference:'bad',amount:0.5}),env)).status,400);
});
test('play stats use max tracked time, settings and withdrawal mirror stay in sync',()=>{
 const {db}=setup();db.exec("INSERT INTO play_sessions(id,user_id,game_code,seconds) VALUES('p','old','neon-racer',10);INSERT INTO game_session_time VALUES('p','old','neon-racer',25)");
 const row=db.prepare('SELECT * FROM user_activity WHERE user_id=?').get('old');assert.equal(row.play_seconds,25);assert.equal(row.games_played,1);assert.ok(JSON.parse(row.achievements).includes('first_game'));
 db.exec("INSERT INTO user_settings(user_id,stealth) VALUES('old',1)");assert.equal(JSON.parse(db.prepare('SELECT settings FROM user_activity').get().settings).stealth,1);
 db.exec("INSERT INTO redemptions(id,user_id,option_id,label,coins_spent,amount,currency) VALUES('r','old','r','Test',10,'1','INR');UPDATE redemptions SET status='paid' WHERE id='r'");assert.equal(db.prepare('SELECT status FROM withdrawals').get().status,'paid');
});
test('referral reward is once-only and attributed to the invitee',async()=>{
 const {env,db,add}=setup();add('friend','old');assert.equal(await payReferralBonus(env,'friend','p'),true);assert.equal(await payReferralBonus(env,'friend','p'),false);
 assert.equal(db.prepare("SELECT coins FROM wallets WHERE user_id='old'").get().coins,530);
 assert.equal(db.prepare('SELECT referred_user_id FROM referral_earnings').get().referred_user_id,'friend');
});
test('shared installations flag both accounts without exposing credentials in any PMS dataset',async()=>{
 const {env,db,add}=setup();add('friend');
 for(const id of ['old','friend']){const r=request('devices',{installationId:'abcdef1234567890',model:'Phone',os:'Android'});await deviceRoute(r,env,{user:{id}});}
 assert.deepEqual(db.prepare('SELECT trust_score FROM user_devices').all().map(r=>r.trust_score),[60,60]);
 await recordLogin(env,request('players'),'old',true);assert.equal(db.prepare("SELECT signup_ip FROM user_authentication WHERE user_id='old'").get().signup_ip,'203.0.113.1');
 for(const name of ['players','wallets','transactions','withdrawals','deposits','referrals','referralEarnings','rewards','devices','security']){
  const res=await operationsAdmin(request(name),env);assert.equal(res.status,200,name);const text=await res.text();assert.ok(!/password_hash|two_step_secret|token_hash/.test(text));
 }
});
test('signup and login use migrated credentials and admin data is protected',async()=>{
 const {env,db}=setup();
 const body={name:'Test Player',email:'new@example.test',password:'Test-Only-Password-123'};
 const authRequest=path=>new Request('http://localhost/api/auth/'+path,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.2'},body:JSON.stringify(body)});
 const registered=await worker.fetch(authRequest('register'),env);assert.equal(registered.status,201,await registered.clone().text());
 const result=await registered.json();const login=await worker.fetch(authRequest('login'),env);assert.equal(login.status,200);
 assert.equal(db.prepare('SELECT login_count FROM user_authentication WHERE user_id=?').get(result.user.id).login_count,2);
 const locked=await worker.fetch(new Request('https://test/api/pms/operations?dataset=players'),env);assert.equal(locked.status,401);
 db.prepare('UPDATE users SET banned=1 WHERE id=?').run(result.user.id);
 const banned=await worker.fetch(new Request('https://test/api/auth/me',{headers:{authorization:'Bearer '+result.token}}),env);assert.equal(banned.status,401);
});
