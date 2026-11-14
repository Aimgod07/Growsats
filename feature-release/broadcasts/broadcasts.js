import {buildPushPayload} from '@block65/webcrypto-web-push';
import {json,fail,sha256} from '../lib/util.js';
import {destinations,validSubscription} from './reminders.js';

export function validBroadcast(p) {
 return !!p && /^[a-zA-Z0-9_-]{16,80}$/.test(p.id || '') && typeof p.title==='string' && p.title.trim().length>0 && p.title.length<=80 && typeof p.body==='string' && p.body.trim().length>0 && p.body.length<=300 && destinations.includes(p.path);
}
export async function broadcastsAdmin(req,env,ctx) {
 if(req.method==='GET') {
  const [history,audience]=await Promise.all([
   env.DB.prepare(`SELECT b.id,b.title,b.body,b.path,b.created_at,b.inbox_count,
    COUNT(d.target) AS devices, SUM(CASE WHEN d.status='accepted' THEN 1 ELSE 0 END) AS accepted,
    SUM(CASE WHEN d.status='failed' THEN 1 ELSE 0 END) AS failed,
    SUM(CASE WHEN d.status='skipped' THEN 1 ELSE 0 END) AS skipped,
    SUM(CASE WHEN d.status IN ('pending','sending') THEN 1 ELSE 0 END) AS pending
    FROM notification_broadcasts b LEFT JOIN broadcast_deliveries d ON d.broadcast_id=b.id
    GROUP BY b.id ORDER BY b.created_at DESC LIMIT 30`).all(),
   env.DB.prepare(`SELECT (SELECT COUNT(*) FROM users WHERE banned=0) AS users,
    (SELECT COUNT(*) FROM push_subscriptions s JOIN users u ON u.id=s.user_id WHERE u.banned=0) AS web,
    (SELECT COUNT(*) FROM native_push_devices s JOIN users u ON u.id=s.user_id WHERE u.banned=0) AS android`).first()
  ]);
  return json({history:history.results,audience,webReady:!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY),androidReady:!!env.FCM_SERVICE_ACCOUNT});
 }
 if(req.method!=='POST')return fail('Method not allowed',405);
 let p;try{p=await req.json()}catch{return fail('Invalid JSON')}
 if(!validBroadcast(p))return fail('A unique request ID, title, message and valid destination are required.');
 const hash=await sha256(JSON.stringify([p.title.trim(),p.body.trim(),p.path]));
 const existing=await env.DB.prepare('SELECT payload_hash FROM notification_broadcasts WHERE id=?').bind(p.id).first();
 if(existing&&existing.payload_hash!==hash)return fail('This request ID already belongs to a different message.',409);
 const now=Math.floor(Date.now()/1000);
 // D1 batch is atomic: retries cannot duplicate inbox rows or device deliveries.
 const statements=[
  env.DB.prepare('INSERT OR IGNORE INTO notification_broadcasts(id,payload_hash,title,body,path,created_at) VALUES(?,?,?,?,?,?)').bind(p.id,hash,p.title.trim(),p.body.trim(),p.path,now),
  env.DB.prepare(`INSERT OR IGNORE INTO notifications(id,user_id,text,path)
    SELECT b.id||':'||u.id,u.id,b.title||' — '||b.body,b.path FROM users u,notification_broadcasts b
    WHERE b.id=? AND b.payload_hash=? AND b.status='preparing' AND u.banned=0`).bind(p.id,hash)
 ];
 for(const [channel,table,target,ready] of [['web','push_subscriptions','endpoint',env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY],['android','native_push_devices','token',env.FCM_SERVICE_ACCOUNT]]) {
  if(ready)statements.push(env.DB.prepare(`INSERT OR IGNORE INTO broadcast_deliveries(broadcast_id,channel,target,user_id,next_at)
   SELECT b.id,?,s.${target},s.user_id,? FROM ${table} s JOIN users u ON u.id=s.user_id,notification_broadcasts b
   WHERE b.id=? AND b.payload_hash=? AND b.status='preparing' AND u.banned=0`).bind(channel,now,p.id,hash));
 }
 statements.push(env.DB.prepare(`UPDATE notification_broadcasts SET status='queued',inbox_count=(SELECT COUNT(*) FROM notifications WHERE substr(id,1,?)=?)
  WHERE id=? AND payload_hash=? AND status='preparing'`).bind(p.id.length+1,p.id+':',p.id,hash));
 await env.DB.batch(statements);
 ctx?.waitUntil(processBroadcasts(env));
 return json({ok:true,id:p.id,reused:!!existing},202);
}

export async function nativePushPlayer(req,env,session) {
 if(req.method==='GET')return json({ready:!!env.FCM_SERVICE_ACCOUNT});
 let p;try{p=await req.json()}catch{return fail('Invalid JSON')}
 if(typeof p.token!=='string'||!/^[\w:\-]{20,4096}$/.test(p.token))return fail('Invalid device token');
 if(req.method==='DELETE') {await env.DB.prepare('DELETE FROM native_push_devices WHERE token=? AND user_id=?').bind(p.token,session.user.id).run();return json({ok:true});}
 if(req.method!=='POST')return fail('Method not allowed',405);
 if(!env.FCM_SERVICE_ACCOUNT)return fail('Android push is awaiting Firebase setup.',503);
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM native_push_devices WHERE user_id=? AND token<>?').bind(session.user.id,p.token).first();
 if(count.n>=10)return fail('Device limit reached',409);
 await env.DB.prepare(`INSERT INTO native_push_devices(token,user_id,updated_at) VALUES(?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,updated_at=excluded.updated_at`).bind(p.token,session.user.id,Math.floor(Date.now()/1000)).run();
 return json({ok:true});
}

let access;
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function firebaseAccess(env) {
 const account=JSON.parse(env.FCM_SERVICE_ACCOUNT),now=Math.floor(Date.now()/1000);
 if(!/^[a-z0-9-]+$/.test(account.project_id||''))throw new Error('Firebase project is invalid');
 if(access?.email===account.client_email&&access.expires>now+60)return {...access,project:account.project_id};
 const enc=new TextEncoder(),head=b64(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
 const body=b64(enc.encode(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
 const pem=account.private_key.replace(/-----[^-]+-----|\s/g,'');
 const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(head+'.'+body)));
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+body+'.'+signature}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Firebase authentication failed');
 const token=await r.json();access={token:token.access_token,email:account.client_email,expires:now+Number(token.expires_in||3600)};
 return {...access,project:account.project_id};
}

export async function processBroadcasts(env) {
 const now=Math.floor(Date.now()/1000);
 await env.DB.prepare(`UPDATE broadcast_deliveries SET status='failed',last_error='Delivery expired' WHERE status IN ('pending','sending') AND broadcast_id IN (SELECT id FROM notification_broadcasts WHERE created_at<?)`).bind(now-86400).run();
 const {results}=await env.DB.prepare(`SELECT d.*,b.title,b.body,b.path FROM broadcast_deliveries d JOIN notification_broadcasts b ON b.id=d.broadcast_id
  WHERE d.status IN ('pending','sending') AND d.next_at<=? ORDER BY d.next_at LIMIT 20`).bind(now).all();
 for(let i=0;i<results.length;i+=4)await Promise.all(results.slice(i,i+4).map(async row=>{
  const lease=crypto.randomUUID();
  const claimed=await env.DB.prepare(`UPDATE broadcast_deliveries SET status='sending',attempts=attempts+1,next_at=?,lease=?
   WHERE broadcast_id=? AND channel=? AND target=? AND status IN ('pending','sending') AND next_at<=?`).bind(now+120,lease,row.broadcast_id,row.channel,row.target,now).run();
  if(!claimed.meta.changes)return;
  const finish=(status,error='')=>env.DB.prepare('UPDATE broadcast_deliveries SET status=?,last_error=?,next_at=? WHERE broadcast_id=? AND channel=? AND target=? AND lease=?').bind(status,error,now+300,row.broadcast_id,row.channel,row.target,lease).run();
  try{
   const table=row.channel==='web'?'push_subscriptions':'native_push_devices',column=row.channel==='web'?'endpoint':'token';
   const device=await env.DB.prepare(`SELECT s.* FROM ${table} s JOIN users u ON u.id=s.user_id WHERE s.${column}=? AND s.user_id=? AND u.banned=0`).bind(row.target,row.user_id).first();
   if(!device){await finish('skipped','Unsubscribed or unavailable');return;}
   const message={title:row.title,body:row.body,path:row.path,id:row.broadcast_id};let response;
   if(row.channel==='web') {
    const subscription=JSON.parse(device.subscription);
    if(!validSubscription(subscription)||subscription.endpoint!==row.target){await finish('failed','Invalid subscription');return;}
    const payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:86400}},subscription,{subject:'https://playloot.pages.dev',publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
    response=await fetch(row.target,{...payload,redirect:'manual',signal:AbortSignal.timeout(10000)});
   }else{
    const auth=await firebaseAccess(env);
    response=await fetch(`https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`,{method:'POST',headers:{authorization:`Bearer ${auth.token}`,'content-type':'application/json'},body:JSON.stringify({message:{token:row.target,notification:{title:row.title,body:row.body},data:{path:row.path,broadcastId:row.broadcast_id},android:{priority:'normal',ttl:'86400s',notification:{tag:row.broadcast_id,channel_id:'playloot-broadcasts'}}}}),signal:AbortSignal.timeout(10000)});
   }
   const status=response.status;
   let expired=row.channel==='web'&&(status===404||status===410);
   if(row.channel==='android'&&!response.ok){const detail=await response.json().catch(()=>({}));expired=detail.error?.details?.some(d=>d.errorCode==='UNREGISTERED');}
   else await response.body?.cancel();
   if(expired)await env.DB.prepare(`DELETE FROM ${table} WHERE ${column}=? AND user_id=?`).bind(row.target,row.user_id).run();
   if(response.ok)await finish('accepted');
   else await finish(!expired&&(status===429||status>=500)&&row.attempts<2?'pending':'failed',`Push service returned ${status}`);
  }catch{await finish(row.attempts<2?'pending':'failed','Push connection failed');}
 }));
}
