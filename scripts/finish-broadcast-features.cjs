const fs=require('node:fs');
function edit(file,from,to){const s=fs.readFileSync(file,'utf8');if(!s.includes(from))throw Error('Missing '+from);fs.writeFileSync(file,s.replace(from,to));}
const root=__dirname+'/..';
edit(root+'/src/components/ReminderSettings.jsx','return <section className="neo-panel">','return <><BroadcastSettings/><section className="neo-panel">');
edit(root+'/src/components/ReminderSettings.jsx','</section>;','</section></>;');
edit(root+'/src/pages/PlayerHub.jsx','const reloadProfile = profile.reload;',`const reloadNotifications = notifications.reload;
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)reloadNotifications();};
    const timer=setInterval(refresh,30000);
    window.addEventListener('playloot:notifications-changed',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('playloot:notifications-changed',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[reloadNotifications]);
  const reloadProfile = profile.reload;`);
let hub=fs.readFileSync(root+'/src/pages/PlayerHub.jsx','utf8');
hub=hub.replaceAll('<b>{n.text}</b><small>Player update</small>',`<b>{n.text}</b>{n.path&&['/Home','/offers','/missions','/events','/leaderboard','/redeem'].includes(n.path)?<a href={n.path}>Open announcement →</a>:<small>Player update</small>}`);
fs.writeFileSync(root+'/src/pages/PlayerHub.jsx',hub);
const backend='C:/Users/choud/Desktop/playloot-backend';
edit(backend+'/src/index.js','if (session) await destroySession(env, session.tokenHash);',`const payload = await request.json().catch(()=>({}));
    if (typeof payload.pushToken==='string') await env.DB.prepare('DELETE FROM native_push_devices WHERE token=? AND user_id=?').bind(payload.pushToken,session.user.id).run();
    if (session) await destroySession(env, session.tokenHash);`);
edit(backend+'/src/routes/broadcasts.js','WHERE id LIKE ?','WHERE substr(id,1,?)=?');
edit(backend+'/src/routes/broadcasts.js',".bind(p.id+':%',p.id,hash)",".bind(p.id.length+1,p.id+':',p.id,hash)");
fs.copyFileSync(backend+'/src/routes/broadcasts.js',root+'/feature-release/broadcasts/broadcasts.js');
console.log('Connected native push lifecycle and announcement inbox.');
