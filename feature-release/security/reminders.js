import {buildPushPayload} from '@block65/webcrypto-web-push';
import {json,fail} from '../lib/util.js';
export const DEFAULT_REMINDERS={enabled:true,intervalHours:2,messages:[
 {enabled:true,title:'Ready for a quick game?',body:'“Every great run starts with one move.” Explore the arcade when you have time.',path:'/Home'},
 {enabled:true,title:'Explore reward offers',body:'“Small steps make progress.” Check the offers page for available tasks and rewards.',path:'/offers'},
 {enabled:true,title:'A new personal best?',body:'“Practice turns a challenge into progress.” Pick a favorite game and enjoy a round.',path:'/Home'},
 {enabled:true,title:'Your next mission',body:'“Make your next move count.” See which missions you can complete today.',path:'/missions'}]};
export const intervals=[1,2,3,4,6,8,12,24];
export const destinations=['/Home','/offers','/missions','/events','/leaderboard','/redeem'];
export function validConfig(c){return c && typeof c.enabled==='boolean' && intervals.includes(c.intervalHours) && Array.isArray(c.messages) && c.messages.length>0 && c.messages.length<=24 && c.messages.every(m=>typeof m.enabled==='boolean' && typeof m.title==='string' && m.title.trim().length>0 && m.title.length<=80 && typeof m.body==='string' && m.body.trim().length>0 && m.body.length<=300 && destinations.includes(m.path));}
export async function reminderConfig(env){const row=await env.DB.prepare('SELECT config FROM reminder_config WHERE id=1').first();return row?JSON.parse(row.config):DEFAULT_REMINDERS;}
export async function remindersAdmin(req,env){
 if(req.method==='GET')return json({config:await reminderConfig(env)});
 if(req.method!=='PUT')return fail('Method not allowed',405);
 let c;try{c=await req.json()}catch{return fail('Invalid JSON')}
 if(!validConfig(c))return fail('Choose a valid interval and 1–24 messages with titles, text and destinations.');
 await env.DB.batch([env.DB.prepare('INSERT INTO reminder_config VALUES(1,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config').bind(JSON.stringify(c)),env.DB.prepare('UPDATE push_subscriptions SET next_at=?').bind(Math.floor(Date.now()/1000)+c.intervalHours*3600)]);
 return json({ok:true,config:c});
}
export function validSubscription(s){try{const u=new URL(s.endpoint);return u.protocol==='https:' && !u.username && !u.password && !u.port && (['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||u.hostname.endsWith('.notify.windows.com')) && s.endpoint.length<=2048 && /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh) && /^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth);}catch{return false}}
export async function remindersPlayer(req,env,session){
 if(req.method==='GET')return json({config:await reminderConfig(env),publicKey:env.VAPID_PUBLIC_KEY||null});
 let p;try{p=await req.json()}catch{return fail('Invalid JSON')}
 if(req.method==='DELETE'){await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?').bind(String(p.endpoint||''),session.user.id).run();return json({ok:true});}
 if(req.method!=='POST')return fail('Method not allowed',405);
 if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return fail('Push notifications are not configured yet',503);
 if(!validSubscription(p))return fail('Unsupported push subscription');
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=? AND endpoint<>?').bind(session.user.id,p.endpoint).first();
 if(count.n>=10)return fail('Device limit reached',409);
 const c=await reminderConfig(env);
 await env.DB.prepare(`INSERT INTO push_subscriptions(endpoint,user_id,subscription,next_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,subscription=excluded.subscription,next_at=CASE WHEN user_id=excluded.user_id THEN next_at ELSE excluded.next_at END`).bind(p.endpoint,session.user.id,JSON.stringify(p),Math.floor(Date.now()/1000)+c.intervalHours*3600).run();return json({ok:true});
}
export async function sendReminders(env){
 const c=await reminderConfig(env),messages=c.messages.filter(m=>m.enabled);
 if(!c.enabled||!messages.length||!env.VAPID_PRIVATE_KEY||!env.VAPID_PUBLIC_KEY)return;
 const now=Math.floor(Date.now()/1000);
 const {results}=await env.DB.prepare('SELECT s.* FROM push_subscriptions s JOIN users u ON u.id=s.user_id WHERE s.next_at<=? AND u.banned=0 ORDER BY s.next_at LIMIT 100').bind(now).all();
 for(const row of results){
  const claim=await env.DB.prepare('UPDATE push_subscriptions SET next_at=?,sequence=sequence+1 WHERE endpoint=? AND next_at=?').bind(now+c.intervalHours*3600,row.endpoint,row.next_at).run();
  if(!claim.meta.changes)continue;
  try{
   const message=messages[row.sequence%messages.length];
   const payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:3600}},JSON.parse(row.subscription),{subject:'https://playloot.pages.dev',publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
   const r=await fetch(row.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(10000)});
   if(r.status===404||r.status===410)await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(row.endpoint).run();
   else if(!r.ok)console.warn('Reminder delivery rejected',r.status);
   await r.body?.cancel();
  }catch{console.warn('Reminder delivery failed');}
 }
}
