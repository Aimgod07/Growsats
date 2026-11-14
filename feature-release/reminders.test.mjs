import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {DEFAULT_REMINDERS,validConfig,validSubscription,sendReminders,remindersPlayer,remindersAdmin} from 'file:///C:/Users/choud/Desktop/playloot-backend/src/routes/reminders.js';
async function setup(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,banned INTEGER DEFAULT 0); INSERT INTO users VALUES (\'u\',0)');db.exec(fs.readFileSync(new URL('./0008_reminders.sql',import.meta.url),'utf8'));
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const env={VAPID_PUBLIC_KEY:Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url'),VAPID_PRIVATE_KEY:(await crypto.subtle.exportKey('jwk',pair.privateKey)).d,DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];const q={bind(...a){args=a;return q},async first(){return stmt.get(...args)},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:stmt.run(...args).changes}}}};return q},async batch(q){db.exec('BEGIN');try{const r=[];for(const s of q)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
 const subscriber=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:Buffer.from(await crypto.subtle.exportKey('raw',subscriber.publicKey)).toString('base64url'),auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url')}};
 return {db,env,subscription};
}
const req=(method,body)=>new Request('https://test/api/reminders',{method,body:JSON.stringify(body)});
test('validates interval, messages, destination and subscription host',()=>{
 assert.ok(validConfig(DEFAULT_REMINDERS));assert.ok(!validConfig({...DEFAULT_REMINDERS,intervalHours:0}));assert.ok(!validConfig({...DEFAULT_REMINDERS,messages:[{...DEFAULT_REMINDERS.messages[0],path:'https://evil.test'}]}));assert.ok(!validSubscription({endpoint:'http://localhost/x'}));
});
test('opt-in waits two hours; sends once; pause stops sending; expired endpoints removed',async()=>{
 const {db,env,subscription}=await setup();const session={user:{id:'u'}};
 assert.equal((await remindersPlayer(req('POST',subscription),env,session)).status,200);
 const first=db.prepare('SELECT * FROM push_subscriptions').get();assert.ok(first.next_at>=Date.now()/1000+7199);
 const original=globalThis.fetch;let sends=0;globalThis.fetch=async()=>{sends++;return new Response('',{status:201})};
 try{
  await sendReminders(env);assert.equal(sends,0);
  db.exec('UPDATE push_subscriptions SET next_at=0');await sendReminders(env);await sendReminders(env);assert.equal(sends,1);assert.equal(db.prepare('SELECT sequence FROM push_subscriptions').get().sequence,1);
  await remindersAdmin(req('PUT',{...DEFAULT_REMINDERS,enabled:false}),env);db.exec('UPDATE push_subscriptions SET next_at=0');await sendReminders(env);assert.equal(sends,1);
  await remindersAdmin(req('PUT',DEFAULT_REMINDERS),env);db.exec('UPDATE push_subscriptions SET next_at=0');globalThis.fetch=async()=>new Response('',{status:410});await sendReminders(env);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,0);
 }finally{globalThis.fetch=original;db.close()}
});
