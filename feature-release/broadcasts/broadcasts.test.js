import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {broadcastsAdmin,nativePushPlayer,processBroadcasts,validBroadcast} from './broadcasts.js';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,banned INTEGER DEFAULT 0);INSERT INTO users VALUES('a',0),('b',0),('banned',1);
 CREATE TABLE notifications(id TEXT PRIMARY KEY,user_id TEXT,text TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,read_at TEXT);
 CREATE TABLE push_subscriptions(endpoint TEXT PRIMARY KEY,user_id TEXT,subscription TEXT,next_at INTEGER,sequence INTEGER DEFAULT 0);`);
 db.exec(readFileSync(new URL('../../migrations/0014_broadcasts.sql',import.meta.url),'utf8'));
 function prepare(sql,args=[]){return{bind:(...values)=>prepare(sql,values),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})};}
 const env={DB:{prepare,batch:async statements=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e;}}}};
 return{db,env};
}
const message={id:'broadcast-request-001',title:'New games',body:'Play something new',path:'/Home'};
const post=p=>new Request('https://test/api/pms/broadcasts',{method:'POST',body:JSON.stringify(p)});
test('broadcast validation rejects external destinations and oversized messages',()=>{
 assert.equal(validBroadcast(message),true);assert.equal(validBroadcast({...message,path:'https://evil.test'}),false);assert.equal(validBroadcast({...message,body:'a'.repeat(301)}),false);
});
test('broadcast retries create one inbox message per eligible player',async()=>{
 const {db,env}=fixture();
 assert.equal((await broadcastsAdmin(post(message),env)).status,202);
 assert.equal((await broadcastsAdmin(post(message),env)).status,202);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n,2);
 assert.equal(db.prepare('SELECT inbox_count FROM notification_broadcasts').get().inbox_count,2);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id=?').get('banned').n,0);
 assert.equal((await broadcastsAdmin(post({...message,body:'Different'}),env)).status,409);
 db.close();
});
test('missing Firebase setup rejects native registration rather than reporting success',async()=>{
 const{db,env}=fixture();const r=await nativePushPlayer(post({token:'a'.repeat(80)}),env,{user:{id:'a'}});assert.equal(r.status,503);db.close();
});
test('revoked subscriptions are skipped and expired jobs stop retrying',async()=>{
 const {db,env}=fixture();await broadcastsAdmin(post(message),env);
 db.prepare(`INSERT INTO broadcast_deliveries(broadcast_id,channel,target,user_id,next_at) VALUES(?,'web','https://fcm.googleapis.com/removed','a',0)`).run(message.id);
 await processBroadcasts(env);
 assert.equal(db.prepare('SELECT status FROM broadcast_deliveries').get().status,'skipped');
 db.prepare('UPDATE broadcast_deliveries SET status=?,next_at=0').run('pending');
 db.prepare('UPDATE notification_broadcasts SET created_at=0').run();
 await processBroadcasts(env);
 assert.equal(db.prepare('SELECT status FROM broadcast_deliveries').get().status,'failed');db.close();
});
async function subscribe(env,db){
 const encode=b=>Buffer.from(b).toString('base64url');
 const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 env.VAPID_PUBLIC_KEY=encode(await crypto.subtle.exportKey('raw',vapid.publicKey));
 env.VAPID_PRIVATE_KEY=(await crypto.subtle.exportKey('jwk',vapid.privateKey)).d;
 const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const sub={endpoint:'https://fcm.googleapis.com/test-device',keys:{p256dh:encode(await crypto.subtle.exportKey('raw',receiver.publicKey)),auth:encode(crypto.getRandomValues(new Uint8Array(16)))}};
 db.prepare('INSERT INTO push_subscriptions(endpoint,user_id,subscription,next_at) VALUES(?,?,?,0)').run(sub.endpoint,'a',JSON.stringify(sub));
}
test('push acceptance is counted once and retry sends are bounded',async()=>{
 const {env,db}=fixture();await subscribe(env,db);await broadcastsAdmin(post(message),env);
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;return new Response(null,{status:503})};
  for(let i=0;i<3;i++){await processBroadcasts(env);db.exec('UPDATE broadcast_deliveries SET next_at=0');}
  assert.equal(calls,3);assert.equal(db.prepare('SELECT status FROM broadcast_deliveries').get().status,'failed');
  const next={...message,id:'broadcast-request-002'};await broadcastsAdmin(post(next),env);
  globalThis.fetch=async()=>{calls++;return new Response(null,{status:201})};
  await processBroadcasts(env);await processBroadcasts(env);
  assert.equal(calls,4);assert.equal(db.prepare('SELECT status FROM broadcast_deliveries WHERE broadcast_id=?').get(next.id).status,'accepted');
 }finally{globalThis.fetch=original;db.close();}
});
