import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {toMinorUnits} from '../../src/utils/money.js';
const root='C:/Users/choud/Desktop/playloot-backend';
const {paymentPlayer,paymentWebhook,paymentAdmin}=await import(pathToFileURL(root+'/src/routes/payments.js'));
function setup(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const f of readdirSync(root+'/migrations').sort().filter(f=>f.endsWith('.sql')))db.exec(readFileSync(root+'/migrations/'+f,'utf8'));
 db.exec("INSERT INTO users(id,email,password_hash,salt,name,handle) VALUES('u','u@test.com','hash','salt','Player','player'); INSERT INTO wallets(user_id,cash_cents) VALUES('u',10000)");
 const prepare=sql=>{let args=[];return{bind(...p){args=p;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};};
 const env={PAYMENTS_ENABLED:'true',PAYMENT_API_URL:'https://adapter.example/payments',PAYMENT_API_TOKEN:'test-token',PAYMENT_WEBHOOK_SECRET:'test-signature-secret',PAYMENT_CHECKOUT_ORIGINS:'https://checkout.example',TWO_STEP_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),DB:{prepare,async batch(ss){db.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 return{db,env};
}
const session={user:{id:'u'}};
const payload=(direction='deposit')=>({direction,methodId:'currency',amountMinor:500,idempotencyKey:'request-1234567890',destination:direction==='withdraw'?'verified-account-ref':''});
async function create(env,p=payload()){
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({reference:'ref-'+p.idempotencyKey,checkoutUrl:'https://checkout.example/order'}),{status:200});
 try{return await paymentPlayer(new Request('https://test/api/payments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}),env,session,'/api/payments');}finally{globalThis.fetch=original;}
}
function event(row,status='succeeded',eventId='event-1'){return{eventId,paymentId:row.id,reference:row.provider_reference,direction:row.direction,methodId:row.method_id,amountMinor:row.amount_minor,currency:row.currency,status};}
async function callback(env,p,{badSignature=false,age=0}={}){
 const raw=JSON.stringify(p),ts=String(Math.floor(Date.now()/1000)-age);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw))).toString('hex');
 return paymentWebhook(new Request('https://test/api/payments/webhook',{method:'POST',headers:{'x-payment-timestamp':ts,'x-payment-signature':badSignature?'0'.repeat(64):sig},body:raw}),env);
}
test('provider missing disables submissions without touching money',async()=>{const {env,db}=setup();env.PAYMENTS_ENABLED='false';assert.equal((await create(env)).status,503);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM payment_requests').get().n,0);});
test('deposits credit only on signed success and repeated events never credit twice',async()=>{
 const {env,db}=setup();const row=(await (await create(env)).json()).payment;assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,10000);
 assert.equal((await callback(env,event(row),{badSignature:true})).status,401);assert.equal((await callback(env,event(row),{age:400})).status,401);
 assert.equal((await callback(env,{...event(row),amountMinor:501})).status,409);
 assert.equal((await callback(env,event(row))).status,200);assert.equal((await callback(env,event(row))).status,200);assert.equal((await callback(env,event(row,'succeeded','event-2'))).status,200);
 assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,10500);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM deposits').get().n,1);
 assert.equal((await callback(env,event(row,'failed','event-3'))).status,409);
});
test('withdrawals reserve once, refund once on failure and cannot overspend',async()=>{
 const {env,db}=setup();const p=payload('withdraw'),row=(await (await create(env,p)).json()).payment;
 await create(env,p);assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,9500);
 assert.equal((await create(env,{...p,amountMinor:600})).status,409);
 assert.equal((await create(env,{...p,idempotencyKey:'another-request-key',amountMinor:10000})).status,409);
 await callback(env,event(row,'failed'));await callback(env,event(row,'failed','event-2'));
 assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,10000);assert.equal(db.prepare('SELECT status FROM payment_withdrawals').get().status,'released');
});
test('successful payout does not debit twice, and another player cannot retry it',async()=>{
 const {env,db}=setup(),row=(await (await create(env,payload('withdraw'))).json()).payment;
 await callback(env,event(row));assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,9500);assert.equal(db.prepare('SELECT status FROM payment_withdrawals').get().status,'paid');
 const path='/api/payments/'+row.id+'/retry';assert.equal((await paymentPlayer(new Request('https://test'+path,{method:'POST'}),env,{user:{id:'someone-else'}},path)).status,404);
 const log=db.prepare("SELECT SUM(amount) AS n FROM transaction_log WHERE asset='cash_cents'").get();assert.equal(log.n,9500);
});
test('ambiguous timeout preserves reservation; retry uses same payment identity',async()=>{
 const {env,db}=setup(),original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('timeout');};
 try{const res=await paymentPlayer(new Request('https://test/api/payments',{method:'POST',body:JSON.stringify(payload('withdraw')),headers:{'content-type':'application/json'}}),env,session,'/api/payments');assert.equal(res.status,202);}finally{globalThis.fetch=original;}
 const row=db.prepare('SELECT * FROM payment_requests').get();assert.equal(row.status,'created');assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,9500);
 const again=(await (await create(env,payload('withdraw'))).json()).payment;assert.equal(again.id,row.id);assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,9500);
});
test('methods and amount bounds are enforced; APIs omit payout details',async()=>{
 const {env}=setup();assert.equal((await create(env,{...payload(),methodId:'gift_card'})).status,400);assert.equal((await create(env,{...payload(),amountMinor:0.1})).status,400);
 await create(env,payload('withdraw'));
 const result=await paymentPlayer(new Request('https://test/api/payments'),env,session,'/api/payments');const body=await result.text();assert.ok(!body.includes('destination_encrypted'));assert.ok(!body.includes('verified-account-ref'));
 const admin=await paymentAdmin(new Request('https://test/api/pms/payments'),env);assert.equal(admin.status,200);
});
test('currency parsing uses exact minor units',()=>{assert.equal(toMinorUnits('1'),100);assert.equal(toMinorUnits('1.01'),101);assert.equal(toMinorUnits('0.29'),29);for(const v of ['0','-1','1e3','1.001','NaN',''])assert.equal(toMinorUnits(v),null);});
async function admin(env,p,method='PUT'){return paymentAdmin(new Request('https://test/api/pms/payments',{method,headers:{'content-type':'application/json'},body:JSON.stringify(p)}),env);}
test('provider switches block new payments but preserve in-flight confirmations',async()=>{
 const {env,db}=setup();
 assert.equal((await admin(env,{id:'second',title:'Second provider'},'POST')).status,201);
 assert.equal((await create(env,{...payload(),providerId:'second'})).status,400);
 await admin(env,{entity:'provider',id:'second',title:'Second provider',enabled:true});
 assert.equal((await create(env,{...payload(),providerId:'second'})).status,400);
 await admin(env,{entity:'provider_method',providerId:'second',methodId:'currency',enabled:true,depositEnabled:true,withdrawEnabled:false});
 assert.equal((await create(env,{...payload('withdraw'),providerId:'second'})).status,400);
 const row=(await (await create(env,{...payload(),providerId:'second'})).json()).payment;
 assert.equal(row.provider_id,'second');
 await admin(env,{entity:'provider',id:'second',title:'Second provider',enabled:false});
 assert.equal((await create(env,{...payload(),providerId:'second',idempotencyKey:'disabled-request-001'})).status,400);
 const visible=await (await paymentPlayer(new Request('https://test/api/payments'),env,session,'/api/payments')).json();assert.ok(visible.providers.every(p=>p.id!=='second'));
 assert.equal((await callback(env,event(row))).status,409);
 assert.equal((await callback(env,{...event(row),providerId:'second'})).status,200);
 assert.equal(db.prepare('SELECT cash_cents FROM wallets').get().cash_cents,10500);
 assert.throws(()=>db.prepare('UPDATE payment_requests SET provider_id=? WHERE id=?').run('default',row.id));
});
