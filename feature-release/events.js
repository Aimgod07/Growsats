import { json, fail, randomId } from '../lib/util.js';

const now = () => Math.floor(Date.now()/1000);
const color = (s, fallback) => /^#[0-9a-f]{6}$/i.test(s || '') ? s : fallback;
const integer = (n,min,max) => Number.isSafeInteger(Number(n)) && Number(n)>=min && Number(n)<=max;
async function settings(env) {
  const rows = await env.DB.prepare('SELECT * FROM event_settings').all();
  return Object.fromEntries(rows.results.map(r=>[r.id,r.value==='true']));
}
async function event(env,id) { return env.DB.prepare('SELECT * FROM live_events WHERE id=?').bind(id).first(); }
async function board(env,e) {
  const sql = e.kind==='time'
    ? `SELECT player_id, SUM(seconds) AS value FROM event_time WHERE event_id=?1 GROUP BY player_id`
    : `SELECT player_id, MAX(score) AS value FROM event_scores WHERE game_id=?1 AND submitted_at>=?2 AND submitted_at<=?3 AND status='approved' GROUP BY player_id`;
  const q=env.DB.prepare(`SELECT t.player_id, t.value, u.name, u.handle FROM (${sql}) t JOIN users u ON u.id=t.player_id WHERE u.banned=0 ORDER BY t.value DESC,t.player_id ASC LIMIT 1000`);
  const rows=await (e.kind==='time'?q.bind(e.id):q.bind(e.game_id,e.starts_at,e.ends_at)).all();
  return rows.results.map((r,i)=>({...r,rank:i+1,game_id:e.game_id}));
}
export async function eventAdmin(request,env,path) {
  const method=request.method;
  if(path==='/api/pms/live/game-time' && method==='GET') {
    const game=new URL(request.url).searchParams.get('gameId')||'';
    const rows=await env.DB.prepare(`SELECT t.player_id,t.game_id,SUM(t.seconds) AS value,u.name,u.handle FROM game_session_time t JOIN users u ON u.id=t.player_id WHERE t.game_id=? GROUP BY t.player_id,t.game_id ORDER BY value DESC,t.player_id LIMIT 1000`).bind(game).all();
    return json({players:rows.results.map((r,i)=>({...r,rank:i+1}))});
  }
  if(path==='/api/pms/live' && method==='GET') {
    const [events,ads,scores]=await Promise.all([
      env.DB.prepare('SELECT * FROM live_events ORDER BY created_at DESC').all(),
      env.DB.prepare('SELECT * FROM ad_placements').all(),
      env.DB.prepare(`SELECT s.*,u.name FROM event_scores s JOIN users u ON u.id=s.player_id ORDER BY submitted_at DESC LIMIT 100`).all()
    ]);
    return json({events:events.results,ads:ads.results,scores:scores.results,settings:await settings(env)});
  }
  if(path.startsWith('/api/pms/live/board/') && method==='GET') {
    const e=await event(env,path.split('/').at(-1));
    return e?json({players:await board(env,e)}):fail('Event not found',404);
  }
  if(method==='DELETE' && path.startsWith('/api/pms/live/events/')) {
    const id=path.split('/').at(-1), e=await event(env,id);
    if(e && now()>=e.starts_at) return fail('Started events are retained for rewards and audit. Disable this event instead.',409);
    await env.DB.prepare('DELETE FROM live_events WHERE id=?').bind(id).run(); return json({ok:true});
  }
  if(method==='DELETE' && path.startsWith('/api/pms/live/ads/')) {
    await env.DB.prepare('DELETE FROM ad_placements WHERE id=?').bind(path.split('/').at(-1)).run();return json({ok:true});
  }
  if(method!=='PUT') return fail('Not found',404);
  let p;try{p=await request.json();}catch{return fail('Invalid JSON');}
  if(path==='/api/pms/live/settings') {
    if(!['score','time','ads'].includes(p.id)||typeof p.enabled!=='boolean')return fail('Invalid feature switch');
    await env.DB.prepare('INSERT OR REPLACE INTO event_settings VALUES (?,?)').bind(p.id,String(p.enabled)).run();return json({ok:true});
  }
  if(path==='/api/pms/live/scores') {
    if(!['approved','rejected'].includes(p.status))return fail('Invalid status');
    const s=await env.DB.prepare('SELECT * FROM event_scores WHERE session_id=?').bind(p.sessionId).first();
    if(!s)return fail('Score not found',404);
    const ended=await env.DB.prepare('SELECT id FROM live_events WHERE kind=\'score\' AND game_id=? AND starts_at<=? AND ends_at>=? AND ends_at<=? LIMIT 1').bind(s.game_id,s.submitted_at,s.submitted_at,now()).first();
    if(ended)return fail('This result belongs to an ended event and is locked',409);
    await env.DB.prepare('UPDATE event_scores SET status=? WHERE session_id=?').bind(p.status,p.sessionId).run();return json({ok:true});
  }
  if(path==='/api/pms/live/events') {
    if(!['score','time'].includes(p.kind)||!String(p.title||'').trim()||!String(p.game_id||'').trim())return fail('Title, game ID and event type are required');
    if(!integer(p.starts_at,1,9999999999)||!integer(p.ends_at,1,9999999999)||p.ends_at<=p.starts_at||!integer(p.reward,0,1000000)||!integer(p.winners,1,1000))return fail('Invalid dates, prize or winner count');
    const old=p.id?await event(env,p.id):null;
    if(old && now()>=old.starts_at && ['kind','game_id','starts_at','ends_at','reward','winners'].some(k=>String(old[k])!==String(p[k])))return fail('Rules and rewards are locked after the event starts',409);
    if(!old && p.starts_at<now())return fail('New events must start in the future');
    const id=old?.id||randomId('evt');
    await env.DB.prepare(`INSERT INTO live_events(id,kind,title,game_id,starts_at,ends_at,enabled,reward,winners,description,color,text_color,button_title,icon,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,kind=excluded.kind,game_id=excluded.game_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,enabled=excluded.enabled,reward=excluded.reward,winners=excluded.winners,description=excluded.description,color=excluded.color,text_color=excluded.text_color,button_title=excluded.button_title,icon=excluded.icon`)
      .bind(id,p.kind,String(p.title).slice(0,100),String(p.game_id).slice(0,64),p.starts_at,p.ends_at,p.enabled?1:0,p.reward,p.winners,String(p.description||'').slice(0,1000),color(p.color,'#4cd7f6'),color(p.text_color,'#071016'),String(p.button_title||'View event').slice(0,40),String(p.icon||'🏆').slice(0,16),now()).run();
    return json({id});
  }
  if(path==='/api/pms/live/ads') {
    if(!['arcade','ranks','loot','profile','events'].includes(p.id))return fail('Unknown ad placement');
    if(!['top','middle','bottom'].includes(p.position ?? 'top'))return fail('Invalid ad position');
    let url;try{url=new URL(p.src);}catch{return fail('An HTTPS ad source is required');}
    if(url.protocol!=='https:'||url.username||url.password||!integer(p.width,100,1200)||!integer(p.height,50,900)||!integer(p.radius,0,60))return fail('Invalid ad URL or dimensions');
    await env.DB.prepare('INSERT OR REPLACE INTO ad_placements (id,enabled,title,src,width,height,radius,background,position) VALUES (?,?,?,?,?,?,?,?,?)').bind(p.id,p.enabled?1:0,String(p.title||'Advertisement').slice(0,80),url.href,Number(p.width),Number(p.height),Number(p.radius),color(p.background,'#151925'),p.position ?? 'top').run();return json({ok:true});
  }
  return fail('Not found',404);
}

export async function eventPublic(request,env,session,path) {
  const flags=await settings(env), time=now();
  if(path==='/api/live' && request.method==='GET') {
    const events=await env.DB.prepare('SELECT * FROM live_events WHERE enabled=1 ORDER BY starts_at DESC').all();
    const ads=flags.ads?await env.DB.prepare('SELECT * FROM ad_placements WHERE enabled=1').all():{results:[]};
    return json({events:events.results.filter(e=>flags[e.kind]),ads:ads.results});
  }
  const id=path.split('/')[3];
  if(path.startsWith('/api/events/') && request.method==='GET') {
    const e=await event(env,id);if(!e||!e.enabled||!flags[e.kind])return fail('Event unavailable',404);
    const players=await board(env,e);
    const claim=await env.DB.prepare('SELECT amount FROM event_claims WHERE event_id=? AND player_id=?').bind(id,session.user.id).first();
    return json({event:e,players,me:players.find(p=>p.player_id===session.user.id)||null,claimed:!!claim,ended:time>=e.ends_at});
  }
  if(request.method!=='POST')return fail('Not found',404);
  if(path.endsWith('/claim') && path.startsWith('/api/events/')) {
    const e=await event(env,id);if(!e||!e.enabled||!flags[e.kind])return fail('Event unavailable',404);
    if(time<e.ends_at)return fail('Prizes unlock when the event ends',409);
    const players=await board(env,e), me=players.find(p=>p.player_id===session.user.id);
    if(!me||me.value<=0||me.rank>e.winners||e.reward<=0)return fail('No prize is available for this position',409);
    const rid=randomId('event_reward'), uid=session.user.id;
    const result=await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO event_claims VALUES (?,?,?,?)').bind(id,uid,rid,e.reward),
      env.DB.prepare(`INSERT INTO reward_ledger(id,user_id,source,kind,amount,ref_id) SELECT ?,?,?,'coins',?,? WHERE EXISTS(SELECT 1 FROM event_claims WHERE reward_id=?)`).bind(rid,uid,`Event: ${e.title}`,e.reward,`${id}:${uid}`,rid),
      env.DB.prepare(`UPDATE wallets SET coins=coins+?,lifetime_coins=lifetime_coins+?,updated_at=datetime('now') WHERE user_id=? AND EXISTS(SELECT 1 FROM reward_ledger WHERE id=?)`).bind(e.reward,e.reward,uid,rid)
    ]);
    return result[0].meta.changes?json({coinsAwarded:e.reward}):fail('Prize already claimed',409);
  }
  let p;try{p=await request.json();}catch{return fail('Invalid JSON');}
  const play=await env.DB.prepare(`SELECT *,CAST(strftime('%s',started_at) AS INTEGER) AS started FROM play_sessions WHERE id=? AND user_id=?`).bind(String(p.sessionId||''),session.user.id).first();
  if(!play||play.claimed||time-play.started>7200)return fail('Active game session required',409);
  if(path==='/api/game-events/score') {
    if(!flags.score)return fail('Score events are disabled',409);
    if(!integer(p.score,0,1000000000))return fail('Score must be a non-negative integer');
    const result=await env.DB.prepare('INSERT OR IGNORE INTO event_scores(session_id,player_id,game_id,score,submitted_at) VALUES (?,?,?,?,?)').bind(play.id,session.user.id,play.game_code,Number(p.score),time).run();
    return result.meta.changes?json({status:'pending',gameId:play.game_code,playerId:session.user.id,sessionId:play.id,score:Number(p.score)}):fail('A score was already submitted for this session',409);
  }
  if(path==='/api/game-events/heartbeat') {
    const uid=session.user.id;
    await env.DB.prepare('INSERT OR IGNORE INTO event_clock VALUES (?,?,?)').bind(uid,play.id,time).run();
    const clock=await env.DB.prepare('SELECT * FROM event_clock WHERE player_id=?').bind(uid).first();
    const elapsed=clock.session_id===play.id?Math.max(0,Math.min(45,time-clock.last_at)):0;
    const events=flags.time?await env.DB.prepare(`SELECT * FROM live_events WHERE kind='time' AND enabled=1 AND game_id=? AND starts_at<=? AND ends_at>?`).bind(play.game_code,time,time).all():{results:[]};
    const statements=events.results.map(e=>env.DB.prepare(`INSERT INTO event_time(event_id,session_id,player_id,game_id,seconds)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM event_clock WHERE player_id=? AND last_at=? AND session_id=?)
      ON CONFLICT(event_id,session_id) DO UPDATE SET seconds=seconds+excluded.seconds`)
      .bind(e.id,play.id,uid,play.game_code,Math.max(0,Math.min(time,e.ends_at)-Math.max(time-elapsed,e.starts_at)),uid,clock.last_at,clock.session_id));
    statements.push(env.DB.prepare(`INSERT INTO game_session_time(session_id,player_id,game_id,seconds) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM event_clock WHERE player_id=? AND last_at=? AND session_id=?) ON CONFLICT(session_id) DO UPDATE SET seconds=seconds+excluded.seconds`).bind(play.id,uid,play.game_code,elapsed,uid,clock.last_at,clock.session_id));
    statements.push(env.DB.prepare('UPDATE event_clock SET session_id=?,last_at=? WHERE player_id=? AND last_at=? AND session_id=?').bind(play.id,time,uid,clock.last_at,clock.session_id));
    await env.DB.batch(statements);return json({ok:true});
  }
  return fail('Not found',404);
}
