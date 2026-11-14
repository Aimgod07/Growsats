import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {eventAdmin,eventPublic} from 'file:///C:/Users/choud/Desktop/playloot-backend/src/routes/events.js';
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,handle TEXT,banned INTEGER DEFAULT 0); CREATE TABLE wallets(user_id TEXT PRIMARY KEY,coins INTEGER DEFAULT 0,lifetime_coins INTEGER DEFAULT 0,updated_at TEXT); CREATE TABLE play_sessions(id TEXT PRIMARY KEY,user_id TEXT,game_code TEXT,claimed INTEGER DEFAULT 0,started_at TEXT); CREATE TABLE reward_ledger(id TEXT PRIMARY KEY,user_id TEXT,source TEXT,kind TEXT,amount INTEGER,ref_id TEXT); INSERT INTO users VALUES('p','Player','player',0); INSERT INTO wallets(user_id) VALUES('p');`);
 db.exec(fs.readFileSync(new URL('./0005_events.sql',import.meta.url),'utf8'));
 db.exec(fs.readFileSync(new URL('./0007_ad_positions.sql',import.meta.url),'utf8'));
 const env={DB:{prepare(sql){const s=db.prepare(sql);let args=[];const q={bind(...v){args=v;return q},async first(){return s.get(...args)||null},async all(){return {results:s.all(...args)}},async run(){return {meta:{changes:Number(s.run(...args).changes)}}}};return q},async batch(list){db.exec('BEGIN');try{const r=[];for(const q of list)r.push(await q.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
 return {db,env};
}
const session={user:{id:'p'}};
const req=(path,body,method='POST')=>new Request('https://app.test'+path,{method,body:body===undefined?undefined:JSON.stringify(body),headers:{'content-type':'application/json'}});
test('time accumulates across sessions, cannot duplicate credit or claim, ownership enforced',async()=>{
 const {db,env}=setup();const original=Date.now;let time=Math.floor(original()/1000);Date.now=()=>time*1000;
 try{
 db.prepare('INSERT INTO live_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('e','time','Time','game',time-60,time+60,1,100,1,'','#4cd7f6','#071016','View','',time);
 const start=new Date((time-60)*1000).toISOString().replace('T',' ').slice(0,19);
 db.prepare('INSERT INTO play_sessions(id,user_id,game_code,started_at) VALUES(?,?,?,?)').run('s1','p','game',start);
 db.prepare('INSERT INTO play_sessions(id,user_id,game_code,started_at) VALUES(?,?,?,?)').run('s2','p','game',start);
 const beat=async id=>eventPublic(req('/api/game-events/heartbeat',{sessionId:id}),env,session,'/api/game-events/heartbeat');
 await beat('s1');time+=15;await beat('s1');await beat('s1');await beat('s2');time+=15;await beat('s2');
 assert.equal(db.prepare('SELECT SUM(seconds) AS n FROM event_time').get().n,30);
 assert.equal(db.prepare('SELECT SUM(seconds) AS n FROM game_session_time').get().n,30);
 const wrong=await eventPublic(req('/api/game-events/heartbeat',{sessionId:'s1'}),env,{user:{id:'other'}},'/api/game-events/heartbeat');assert.equal(wrong.status,409);
 time+=100;
 await beat('s2');assert.equal(db.prepare('SELECT SUM(seconds) AS n FROM event_time').get().n,30,'ended event standings must not change');
 const claim=()=>eventPublic(req('/api/events/e/claim',{}),env,session,'/api/events/e/claim');
 assert.equal((await claim()).status,200);assert.equal((await claim()).status,409);
 assert.equal(db.prepare('SELECT coins FROM wallets').get().coins,100);
 }finally{Date.now=original;db.close()}
});
test('scores stay pending until review and are tied to session game/player',async()=>{
 const {db,env}=setup();const n=Math.floor(Date.now()/1000);
 db.prepare('INSERT INTO live_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('e','score','Score','game',n-60,n+60,1,100,1,'','#4cd7f6','#071016','View','',n);
 db.prepare('INSERT INTO play_sessions(id,user_id,game_code,started_at) VALUES(?,?,?,datetime(\'now\'))').run('s','p','game');
 const submit=()=>eventPublic(req('/api/game-events/score',{sessionId:'s',score:900,playerId:'forged',gameId:'wrong'}),env,session,'/api/game-events/score');
 assert.equal((await submit()).status,200);assert.equal((await submit()).status,409);
 const get=()=>eventPublic(req('/api/events/e',undefined,'GET'),env,session,'/api/events/e').then(r=>r.json());
 assert.equal((await get()).players.length,0);
 await eventAdmin(req('/api/pms/live/scores',{sessionId:'s',status:'approved'},'PUT'),env,'/api/pms/live/scores');
 const rows=(await get()).players;assert.equal(rows[0].player_id,'p');assert.equal(rows[0].game_id,'game');assert.equal(rows[0].value,900);db.close();
});

