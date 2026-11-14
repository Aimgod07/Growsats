import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {offersAdmin,offersPlayer} from 'file:///C:/Users/choud/Desktop/playloot-backend/src/routes/offers.js';
test('offers require completion, freeze started terms and pay each reward once',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE users(id TEXT,name TEXT);CREATE TABLE play_sessions(user_id TEXT,game_code TEXT,claimed INTEGER);CREATE TABLE wallets(user_id TEXT,coins INTEGER,diamonds INTEGER,lifetime_coins INTEGER,updated_at TEXT);CREATE TABLE reward_ledger(id TEXT PRIMARY KEY,user_id TEXT,source TEXT,kind TEXT,amount INTEGER,ref_id TEXT);INSERT INTO wallets VALUES('p',0,0,0,NULL);INSERT INTO users VALUES('p','Player');`);db.exec(fs.readFileSync(new URL('./0006_offers.sql',import.meta.url),'utf8'));
 const env={DB:{prepare(sql){let a=[];const s=db.prepare(sql);return {bind(...v){a=v;return this},async first(){return s.get(...a)},async all(){return {results:s.all(...a)}},async run(){return {meta:{changes:Number(s.run(...a).changes)}}}}},async batch(qs){db.exec('BEGIN');try{const r=[];for(const q of qs)r.push(await q.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
 const req=(body,method='POST')=>new Request('https://test/api',{method,body:JSON.stringify(body)}),session={user:{id:'p'}};
 for(const reward_type of ['coins','diamonds']){
 const p={title:'Offer',description:'',enabled:1,rule:'games',target:1,game_id:'g',reward_type,quantity:25};
 const {id}=await (await offersAdmin(req(p,'PUT'),env,'/api/pms/offers')).json();
 const act=action=>offersPlayer(req({}),env,session,`/api/offers/${id}/${action}`);
 assert.equal((await act('claim')).status,409);await act('start');assert.equal((await act('claim')).status,409);
 assert.equal((await offersAdmin(req({...p,id,quantity:999},'PUT'),env,'/api/pms/offers')).status,409);
 db.exec("INSERT INTO play_sessions VALUES('p','g',1)");assert.equal((await act('claim')).status,200);assert.equal((await act('claim')).status,409);
 assert.equal(db.prepare(`SELECT ${reward_type} AS n FROM wallets`).get().n,25);
 }
 const p={title:'Manual',enabled:1,rule:'manual',target:1,game_id:'',reward_type:'coins',quantity:10};const {id}=await(await offersAdmin(req(p,'PUT'),env,'/api/pms/offers')).json();
 const act=(a,body={})=>offersPlayer(req(body),env,session,`/api/offers/${id}/${a}`);
 await act('start');await act('submit',{proof:'Completed'});assert.equal((await act('claim')).status,409);
 await offersAdmin(req({offer_id:id,player_id:'p',status:'approved'},'PUT'),env,'/api/pms/offers/review');assert.equal((await act('claim')).status,200);
 db.close();
});
