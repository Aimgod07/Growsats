import {json,fail,randomId} from '../lib/util.js';
const types=['coins','diamonds'],rules=['games','manual'];
const num=(v)=>Number.isSafeInteger(Number(v))&&Number(v)>0&&Number(v)<=1000000;
async function count(env,uid,o){return (await env.DB.prepare("SELECT COUNT(*) AS n FROM play_sessions WHERE user_id=? AND claimed=1 AND (?='' OR game_code=?)").bind(uid,o.game_id,o.game_id).first())?.n||0}
export async function offersAdmin(req,env,path){
 if(req.method==='GET'){const offers=await env.DB.prepare('SELECT * FROM offers ORDER BY rowid DESC').all();const entries=await env.DB.prepare("SELECT e.*,u.name,o.title FROM offer_entries e JOIN users u ON u.id=e.player_id JOIN offers o ON o.id=e.offer_id WHERE e.status='submitted' ORDER BY e.joined_at LIMIT 200").all();return json({offers:offers.results,entries:entries.results})}
 let p;try{p=await req.json()}catch{return fail('Invalid JSON')}
 if(path==='/api/pms/offers/review'&&req.method==='PUT'){
 if(!['approved','rejected'].includes(p.status))return fail('Invalid review');
 await env.DB.prepare("UPDATE offer_entries SET status=? WHERE offer_id=? AND player_id=? AND status='submitted'").bind(p.status,p.offer_id,p.player_id).run();return json({ok:true})}
 if(path!=='/api/pms/offers'||req.method!=='PUT')return fail('Not found',404);
 if(!p.title?.trim()||!types.includes(p.reward_type)||!rules.includes(p.rule)||!num(p.quantity)||!num(p.target))return fail('Title, valid completion rule, reward type and positive whole-number quantities are required');
 if(p.url){try{if(new URL(p.url).protocol!=='https:')return fail('Offer link must use HTTPS')}catch{return fail('Invalid offer link')}}
 const old=p.id?await env.DB.prepare('SELECT * FROM offers WHERE id=?').bind(p.id).first():null;
 if(old){const joined=await env.DB.prepare('SELECT 1 FROM offer_entries WHERE offer_id=? LIMIT 1').bind(old.id).first();if(joined&&['rule','target','game_id','reward_type','quantity'].some(k=>String(old[k])!==String(p[k])))return fail('Players have started this offer. Create a new offer to change requirements or rewards.',409)}
 const id=old?.id||randomId('offer'),c=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
 await env.DB.prepare(`INSERT INTO offers VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,enabled=excluded.enabled,rule=excluded.rule,target=excluded.target,game_id=excluded.game_id,reward_type=excluded.reward_type,quantity=excluded.quantity,color=excluded.color,text_color=excluded.text_color,icon=excluded.icon,button_title=excluded.button_title,url=excluded.url`).bind(id,p.title.slice(0,100),String(p.description||'').slice(0,2000),p.enabled?1:0,p.rule,Number(p.target),String(p.game_id||'').slice(0,64),p.reward_type,Number(p.quantity),c(p.color,'#4cd7f6'),c(p.text_color,'#071016'),String(p.icon||'🎁').slice(0,16),String(p.button_title||'Start offer').slice(0,40),String(p.url||'').slice(0,2000)).run();return json({id})
}
export async function offersPlayer(req,env,session,path){
 const uid=session.user.id;
 if(req.method==='GET'&&path==='/api/offers'){
 const rows=await env.DB.prepare('SELECT o.*,e.status,e.baseline,e.proof FROM offers o LEFT JOIN offer_entries e ON e.offer_id=o.id AND e.player_id=? WHERE o.enabled=1 ORDER BY o.rowid DESC').bind(uid).all();
 const offers=await Promise.all(rows.results.map(async o=>({...o,progress:o.rule==='games'&&o.status?Math.max(0,await count(env,uid,o)-o.baseline):0})));return json({offers})}
 if(req.method!=='POST')return fail('Not found',404);
 const id=path.split('/')[3],action=path.split('/')[4],o=await env.DB.prepare('SELECT * FROM offers WHERE id=? AND enabled=1').bind(id).first();if(!o)return fail('Offer unavailable',404);
 const e=await env.DB.prepare('SELECT * FROM offer_entries WHERE offer_id=? AND player_id=?').bind(id,uid).first();
 if(action==='start'){await env.DB.prepare('INSERT OR IGNORE INTO offer_entries(offer_id,player_id,joined_at,baseline) VALUES(?,?,?,?)').bind(id,uid,Math.floor(Date.now()/1000),await count(env,uid,o)).run();return json({ok:true})}
 if(!e)return fail('Start the offer first',409);
 if(action==='submit'&&o.rule==='manual'){
 let p;try{p=await req.json()}catch{return fail('Invalid JSON')}
 if(!String(p.proof||'').trim()||String(p.proof).length>2000)return fail('Enter completion details (up to 2000 characters)');
 await env.DB.prepare("UPDATE offer_entries SET proof=?,status='submitted' WHERE offer_id=? AND player_id=? AND status IN ('started','rejected')").bind(p.proof,id,uid).run();return json({ok:true})}
 if(action!=='claim')return fail('Not found',404);
 if(e.status==='claimed')return fail('Reward already claimed',409);
 if(o.rule==='manual'?e.status!=='approved':(await count(env,uid,o)-e.baseline<o.target))return fail('Complete the offer before claiming',409);
 const rid=randomId('offer_reward'),column=o.reward_type;
 const result=await env.DB.batch([
 env.DB.prepare("UPDATE offer_entries SET status='claimed',reward_id=? WHERE offer_id=? AND player_id=? AND reward_id IS NULL").bind(rid,id,uid),
 env.DB.prepare('INSERT INTO reward_ledger(id,user_id,source,kind,amount,ref_id) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM offer_entries WHERE reward_id=?)').bind(rid,uid,'Offer: '+o.title,column,o.quantity,id+':'+uid,rid),
 env.DB.prepare(`UPDATE wallets SET ${column}=${column}+?${column==='coins'?',lifetime_coins=lifetime_coins+?':''},updated_at=datetime('now') WHERE user_id=? AND EXISTS(SELECT 1 FROM reward_ledger WHERE id=?)`).bind(...(column==='coins'?[o.quantity,o.quantity,uid,rid]:[o.quantity,uid,rid]))
 ]);return result[0].meta.changes?json({rewardType:column,quantity:o.quantity}):fail('Reward already claimed',409)
}

