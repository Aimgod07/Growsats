import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';
import {eventAdmin,eventPublic} from 'file:///C:/Users/choud/Desktop/playloot-backend/src/routes/events.js';
import {startPlayRoute} from 'file:///C:/Users/choud/Desktop/playloot-backend/src/routes/rewards.js';
import {deliverScore} from '../src/utils/scoreDelivery.js';

const migrations='C:/Users/choud/Desktop/playloot-backend/migrations/';
const request=(path,body,method=body===undefined?'GET':'POST')=>new Request('https://test.local'+path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})});
function setup(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of fs.readdirSync(migrations).filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync(migrations+file,'utf8'));
 for(const id of ['p','other']){
   db.prepare('INSERT INTO users(id,email,password_hash,salt,name,handle) VALUES(?,?,?,?,?,?)').run(id,id+'@test.local','hash','salt',id,id);
   db.prepare('INSERT INTO wallets(user_id,diamonds) VALUES(?,30)').run(id);
 }
 const env={DB:{prepare(sql){const statement=db.prepare(sql);let args=[];const q={bind(...v){args=v;return q},async first(){return statement.get(...args)||null},async all(){return{results:statement.all(...args)}},async run(){return{meta:{changes:Number(statement.run(...args).changes)}}}};return q},async batch(queries){db.exec('BEGIN');try{const results=[];for(const q of queries)results.push(await q.run());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}}};
 const session={user:{id:'p'}},now=Math.floor(Date.now()/1000);
 const play=(id='s',seconds=60)=>{db.prepare("INSERT INTO play_sessions(id,user_id,game_code,started_at) VALUES(?,'p','courtside',datetime(?,'unixepoch'))").run(id,now-seconds);db.prepare("INSERT INTO grogame_sessions(session_id,user_id,game_id) VALUES(?,'p','courtside')").run(id);};
 const event=(id='e',kind='score',fee=20)=>db.prepare("INSERT INTO live_events(id,kind,title,game_id,starts_at,ends_at,created_at,entry_diamonds) VALUES(?,?,'Test','courtside',?,?,?,?)").run(id,kind,now-120,now+600,now,fee);
 const submit=(body,user=session)=>eventPublic(request('/api/game-events/score',body),env,user,'/api/game-events/score');
 return{db,env,session,now,play,event,submit};
}
test('scores autoapprove, retries are idempotent, every replay is retained, identity and duration are server assigned',async t=>{
 const {db,play,submit,now}=setup(t);play();
 const body={sessionId:'s',score:90,runId:'run1',playerId:'forged',gameId:'forged',duration_seconds:99999};
 const first=await(await submit(body)).json();assert.equal(first.status,'approved');assert.equal(first.player_id,'p');assert.equal(first.game_id,'courtside');assert.equal(first.duration_seconds,60);assert.equal(first.submitted_at,now);
 assert.equal((await(await submit({...body,score:999})).json()).score,90);
 assert.equal((await submit({...body,runId:'run2',score:70})).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM game_score_records').get().n,2);
 assert.equal(db.prepare('SELECT score FROM grogame_sessions').get().score,90);
 assert.throws(()=>db.exec('UPDATE game_score_records SET score=1'),/read-only/);
 assert.throws(()=>db.exec('DELETE FROM game_score_records'),/read-only/);
});
test('closed, foreign, invalid scores and disabled collection cannot add records; PMS cannot review or edit',async t=>{
 const {db,env,play,submit}=setup(t);play();
 for(const score of [-1,1.2,'90',1000000001])assert.equal((await submit({sessionId:'s',score,runId:'r'})).status,400);
 assert.equal((await submit({sessionId:'s',score:90,runId:'r'},{user:{id:'other'}})).status,409);
 db.exec("UPDATE event_settings SET value='false' WHERE id='score_automation'");
 assert.equal((await submit({sessionId:'s',score:90,runId:'r'})).status,409);
 db.exec("UPDATE event_settings SET value='true' WHERE id='score_automation';UPDATE play_sessions SET closed_at=datetime('now')");
 assert.equal((await submit({sessionId:'s',score:90,runId:'r'})).status,409);
 assert.equal((await eventAdmin(request('/api/pms/live/scores',{status:'approved'},'PUT'),env,'/api/pms/live/scores')).status,405);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM game_score_records').get().n,0);
});
test('event diamonds debit once, insufficient balance rolls back, paid game cannot start without entry',async t=>{
 const {db,env,session,event}=setup(t);event();event('expensive','time',40);
 assert.equal((await startPlayRoute(session,env,{gameCode:'courtside',eventId:'e'})).status,403);
 const join=id=>eventPublic(request('/api/events/'+id+'/join',{}),env,session,'/api/events/'+id+'/join');
 assert.equal((await join('expensive')).status,409);assert.equal(db.prepare('SELECT COUNT(*) n FROM event_entries').get().n,0);
 assert.equal((await join('e')).status,200);assert.equal((await join('e')).status,200);
 assert.equal(db.prepare("SELECT diamonds FROM wallets WHERE user_id='p'").get().diamonds,10);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM event_entries').get().n,1);
 const result=await startPlayRoute(session,env,{gameCode:'courtside',eventId:'e',provider:'grogames'});assert.ok(result.sessionId);
 assert.equal((await startPlayRoute(session,env,{gameCode:'featherfall',eventId:'e'})).status,409);
});
test('paid score board excludes unpaid and pre-entry sessions; PMS exposes all filtered read-only records',async t=>{
 const {db,env,session,play,event,submit,now}=setup(t);event();play();
 await submit({sessionId:'s',score:90,runId:'r'});
 const board=()=>eventPublic(request('/api/events/e'),env,session,'/api/events/e').then(r=>r.json());
 assert.equal((await board()).players.length,0);
 await eventPublic(request('/api/events/e/join',{}),env,session,'/api/events/e/join');
 assert.equal((await board()).players.length,0,'old runs must not become eligible after joining');
 play('joined',0);await submit({sessionId:'joined',score:50,runId:'r'});
 assert.equal((await board()).players[0].value,50);
 const rows=await(await eventAdmin(request('/api/pms/live/score-records?gameId=courtside&playerId=p'),env,'/api/pms/live/score-records')).json();assert.equal(rows.records.length,2);assert.equal(rows.records[0].submitted_at,now);
});
test('new time and score events require diamond entry fees',async t=>{
 const {env,now}=setup(t);
 for(const kind of ['time','score']){
  const p={kind,title:'Paid event',game_id:'courtside',starts_at:now+60,ends_at:now+120,reward:10,winners:1,enabled:1,entry_diamonds:0};
  assert.equal((await eventAdmin(request('/api/pms/live/events',p,'PUT'),env,'/api/pms/live/events')).status,400);
  assert.equal((await eventAdmin(request('/api/pms/live/events',{...p,id:'custom-new-id'},'PUT'),env,'/api/pms/live/events')).status,400);
  assert.equal((await eventAdmin(request('/api/pms/live/events',{...p,entry_diamonds:5},'PUT'),env,'/api/pms/live/events')).status,200);
 }
});
test('time events require paid entry before the session and ignore duplicate heartbeats',async t=>{
 const {db,env,session,event,play,now}=setup(t);event('time','time');play('unpaid');
 const original=Date.now;let time=now;Date.now=()=>time*1000;
 const beat=id=>eventPublic(request('/api/game-events/heartbeat',{sessionId:id}),env,session,'/api/game-events/heartbeat');
 try{
  await beat('unpaid');time+=15;await beat('unpaid');assert.equal(db.prepare('SELECT COUNT(*) n FROM event_time').get().n,0);
  await eventPublic(request('/api/events/time/join',{}),env,session,'/api/events/time/join');
  play('paid',0);await beat('paid');time+=15;await beat('paid');await beat('paid');
  assert.equal(db.prepare('SELECT SUM(seconds) n FROM event_time').get().n,15);
 }finally{Date.now=original;}
});
test('transport retries retain run identity and do not retry validation errors',async()=>{
 let attempts=[];
 const result=await deliverScore(async body=>{attempts.push(body);if(attempts.length<3)throw new TypeError('Network disconnected');return{status:'approved'}},'s',42,'r',async()=>{});
 assert.equal(result.status,'approved');assert.equal(attempts.length,3);assert.deepEqual(attempts[0],attempts[2]);
 let calls=0;await assert.rejects(deliverScore(async()=>{calls++;throw Object.assign(new Error('Invalid'),{status:400})},'s',42,'r',async()=>{}));assert.equal(calls,1);
});
test('game bridge records each replay once and emits matching web/native run IDs',()=>{
 const messages=[],logs=[];const context={URL,URLSearchParams,crypto,location:{origin:'https://playloot.pages.dev',search:'?gameId=courtside'},parent:{postMessage:(...args)=>messages.push(args)},console:{log:v=>logs.push(v)}};context.window=context;
 vm.runInNewContext(fs.readFileSync('public/grogames/score-bridge.js','utf8'),context);
 context.PlaylootScores.start();context.PlaylootScores.finish(12);context.PlaylootScores.finish(12);context.PlaylootScores.start();context.PlaylootScores.finish(13);
 assert.equal(messages.length,2);assert.notEqual(messages[0][0].runId,messages[1][0].runId);assert.equal(JSON.parse(logs[0].slice(15)).runId,messages[0][0].runId);
});
