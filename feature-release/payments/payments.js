import {json,fail,readJsonStrict,randomId,sha256} from '../lib/util.js';
import {encryptSecret,decryptSecret} from '../lib/crypto.js';

export const paymentReady=env=>env.PAYMENTS_ENABLED==='true' && !!env.PAYMENT_API_URL && !!env.PAYMENT_API_TOKEN && !!env.PAYMENT_WEBHOOK_SECRET && !!env.TWO_STEP_ENCRYPTION_KEY;
const fields='id,direction,method_id,amount_minor,currency,status,provider_reference,checkout_url,failure_message,created_at,updated_at';
const text=v=>typeof v==='string'?v.trim():'';
function safeCheckout(value,env){
 if(!value)return null;
 try{const u=new URL(value);const origins=(env.PAYMENT_CHECKOUT_ORIGINS||'').split(',').map(x=>x.trim());return u.protocol==='https:'&&!u.username&&!u.password&&origins.includes(u.origin)?u.href:null;}catch{return null;}
}
async function sendToProvider(env,row){
 const endpoint=new URL(env.PAYMENT_API_URL);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw new Error('Payment adapter must use HTTPS');
 const response=await fetch(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',authorization:`Bearer ${env.PAYMENT_API_TOKEN}`,'idempotency-key':row.id},body:JSON.stringify({paymentId:row.id,direction:row.direction,methodId:row.method_id,amountMinor:row.amount_minor,currency:row.currency,destination:row.destination_encrypted?await decryptSecret(env,row.destination_encrypted):null})});
 if(!response.ok)throw new Error('Provider initiation not confirmed');
 const result=await response.json();
 if(typeof result.reference!=='string'||!result.reference||result.reference.length>200)throw new Error('Invalid provider reference');
 const checkout=safeCheckout(result.checkoutUrl,env);
 if(result.checkoutUrl&&!checkout)throw new Error('Unapproved checkout URL');
 // Only a signed callback settles money. A create-response or browser redirect cannot.
 await env.DB.prepare("UPDATE payment_requests SET status='pending',provider_reference=?,checkout_url=?,updated_at=datetime('now') WHERE id=? AND status IN ('created','pending')").bind(result.reference,checkout,row.id).run();
}
export async function paymentPlayer(request,env,session,path){
 const userId=session.user.id,url=new URL(request.url);
 if(request.method==='GET'&&path==='/api/payments'){
  const [methods,wallet,history]=await Promise.all([
   env.DB.prepare('SELECT * FROM payment_methods WHERE enabled=1 ORDER BY rowid').all(),
   env.DB.prepare(`SELECT cash_cents AS availableMinor,currency,(SELECT IFNULL(SUM(amount_minor),0) FROM payment_withdrawals WHERE user_id=?1 AND status='reserved') AS reservedMinor FROM wallets WHERE user_id=?1`).bind(userId).first(),
   env.DB.prepare(`SELECT ${fields} FROM payment_requests WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET ?`).bind(userId,Math.max(0,Math.min(100000,parseInt(url.searchParams.get('offset')||'0',10)||0))).all(),
  ]);
  return json({ready:paymentReady(env),methods:methods.results,wallet,transactions:history.results.slice(0,20),hasMore:history.results.length>20});
 }
 if(request.method==='POST'&&path==='/api/payments'){
  if(!paymentReady(env))return fail('Payments will open when the payment provider is connected.',503,'provider_unavailable');
  const {data:p,error}=await readJsonStrict(request);if(error)return error;
  if(!p||!['deposit','withdraw'].includes(p.direction)||!Number.isSafeInteger(p.amountMinor)||p.amountMinor<=0||!/^[a-zA-Z0-9_-]{16,100}$/.test(p.idempotencyKey||''))return fail('Invalid payment request');
  const destination=p.direction==='withdraw'?text(p.destination):'';
  if(destination.length>500||(p.direction==='withdraw'&&destination.length<3))return fail('Enter the payout destination');
  const hash=await sha256(destination);
  let row=await env.DB.prepare('SELECT * FROM payment_requests WHERE user_id=? AND idempotency_key=?').bind(userId,p.idempotencyKey).first();
  if(row && (row.direction!==p.direction||row.method_id!==p.methodId||row.amount_minor!==p.amountMinor||row.destination_hash!==hash))return fail('This request key was already used for different payment details',409);
  if(!row){
   const method=await env.DB.prepare('SELECT * FROM payment_methods WHERE id=? AND enabled=1').bind(text(p.methodId)).first();
   if(!method||!method[p.direction==='deposit'?'deposit_enabled':'withdraw_enabled']||p.amountMinor<method.min_minor||p.amountMinor>method.max_minor)return fail('This method or amount is not available');
   const wallet=await env.DB.prepare('SELECT currency FROM wallets WHERE user_id=?').bind(userId).first();if(!wallet)return fail('Wallet not found',404);
   const id=randomId('pay');
   try{await env.DB.prepare('INSERT INTO payment_requests(id,user_id,idempotency_key,direction,method_id,amount_minor,currency,destination_encrypted,destination_hash) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,userId,p.idempotencyKey,p.direction,p.methodId,p.amountMinor,wallet.currency,destination?await encryptSecret(env,destination):null,hash).run();}
   catch(e){if(/Insufficient|Too many pending/.test(String(e)))return fail('Insufficient cash balance or too many pending payments.',409);if(!String(e).includes('UNIQUE'))throw e;}
   row=await env.DB.prepare('SELECT * FROM payment_requests WHERE user_id=? AND idempotency_key=?').bind(userId,p.idempotencyKey).first();
   if(!row||row.direction!==p.direction||row.method_id!==p.methodId||row.amount_minor!==p.amountMinor||row.destination_hash!==hash)return fail('Payment request conflict',409);
  }
  if(row.status==='created'){
   try{await sendToProvider(env,row);}catch{
    // Timeout is ambiguous: keep any reservation and retry with the same provider idempotency key.
    return json({payment:await env.DB.prepare(`SELECT ${fields} FROM payment_requests WHERE id=?`).bind(row.id).first(),message:'Waiting for provider confirmation. Use Retry on this transaction; do not make a duplicate request.'},202);
   }
  }
  return json({payment:await env.DB.prepare(`SELECT ${fields} FROM payment_requests WHERE id=?`).bind(row.id).first()},200);
 }
 if(request.method==='POST'&&/^\/api\/payments\/[^/]+\/retry$/.test(path)){
  if(!paymentReady(env))return fail('Payment provider is not connected',503);
  const row=await env.DB.prepare('SELECT * FROM payment_requests WHERE id=? AND user_id=?').bind(path.split('/')[3],userId).first();if(!row)return fail('Payment not found',404);
  if(row.status==='created'){try{await sendToProvider(env,row);}catch{return fail('Still awaiting provider confirmation. Your request is safely retained.',503);}}
  return json({ok:true});
 }
 return fail('Not found',404);
}

export async function paymentWebhook(request,env){
 if(request.method!=='POST')return fail('Method not allowed',405);
 if(!env.PAYMENT_WEBHOOK_SECRET)return fail('Payment callback is not configured',503);
 const timestamp=request.headers.get('x-payment-timestamp')||'',signature=request.headers.get('x-payment-signature')||'';
 if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!/^([a-fA-F0-9]{64})$/.test(signature))return fail('Invalid callback signature',401);
 const raw=await request.text();if(raw.length>16000)return fail('Callback too large',413);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g),h=>parseInt(h,16));
 if(!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(timestamp+'.'+raw)))return fail('Invalid callback signature',401);
 let p;try{p=JSON.parse(raw);}catch{return fail('Invalid JSON');}
 if(!p||!text(p.eventId)||p.eventId.length>200||!text(p.paymentId)||!text(p.reference)||p.reference.length>200||!['succeeded','failed'].includes(p.status))return fail('Invalid callback payload');
 const row=await env.DB.prepare('SELECT * FROM payment_requests WHERE id=?').bind(p.paymentId).first();if(!row)return fail('Payment not found',404);
 if(p.amountMinor!==row.amount_minor||p.currency!==row.currency||p.direction!==row.direction||p.methodId!==row.method_id||(row.provider_reference&&row.provider_reference!==p.reference))return fail('Callback does not match payment',409);
 const digest=await sha256(raw),existing=await env.DB.prepare('SELECT payload_hash FROM payment_webhook_events WHERE event_id=?').bind(p.eventId).first();
 if(existing)return existing.payload_hash===digest?json({ok:true,duplicate:true}):fail('Event ID already used',409);
 if(['succeeded','failed'].includes(row.status)&&row.status!==p.status)return fail('Payment already finalized with a different status',409);
 try{await env.DB.batch([
  env.DB.prepare('INSERT INTO payment_webhook_events(event_id,payment_id,payload_hash,status) VALUES(?,?,?,?)').bind(p.eventId,p.paymentId,digest,p.status),
  env.DB.prepare("UPDATE payment_requests SET status=?,provider_reference=?,failure_message=?,updated_at=datetime('now') WHERE id=? AND status IN ('created','pending')").bind(p.status,p.reference,p.status==='failed'?'The payment provider reported that this transaction failed.':null,p.paymentId),
 ]);}catch(e){if(/UNIQUE|Conflicting terminal/.test(String(e)))return fail('Event already received or conflicts with the finalized payment',409);throw e;}
 return json({ok:true});
}

export async function paymentAdmin(request,env){
 if(request.method==='PUT'){
  const {data:p,error}=await readJsonStrict(request);if(error)return error;
  if(!p||!['currency','crypto','gift_card'].includes(p.id)||!text(p.title)||p.title.length>80||!Number.isSafeInteger(p.minMinor)||!Number.isSafeInteger(p.maxMinor)||p.minMinor<1||p.maxMinor<p.minMinor||p.maxMinor>100000000)return fail('Invalid payment method settings');
  await env.DB.prepare('UPDATE payment_methods SET title=?,enabled=?,deposit_enabled=?,withdraw_enabled=?,min_minor=?,max_minor=? WHERE id=?').bind(p.title.trim(),p.enabled===true?1:0,p.depositEnabled===true?1:0,p.withdrawEnabled===true?1:0,p.minMinor,p.maxMinor,p.id).run();
  return json({ok:true});
 }
 if(request.method!=='GET')return fail('Method not allowed',405);
 const offset=Math.max(0,parseInt(new URL(request.url).searchParams.get('offset')||'0',10)||0);
 const rows=await env.DB.prepare(`SELECT ${fields},user_id FROM payment_requests ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?`).bind(offset).all();
 const methods=await env.DB.prepare('SELECT * FROM payment_methods ORDER BY rowid').all();
 return json({ready:paymentReady(env),methods:methods.results,rows:rows.results.slice(0,50),hasMore:rows.results.length>50});
}
