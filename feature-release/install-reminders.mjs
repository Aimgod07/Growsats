import fs from 'node:fs';
const root='C:/Users/choud/Desktop/playloot-backend',pms='C:/Users/choud/Desktop/playloot-pms';
fs.copyFileSync(new URL('./reminders.js',import.meta.url),root+'/src/routes/reminders.js');
fs.copyFileSync(new URL('./0008_reminders.sql',import.meta.url),root+'/migrations/0008_reminders.sql');
fs.copyFileSync(new URL('./NotificationsStudio.jsx',import.meta.url),pms+'/src/NotificationsStudio.jsx');
let s=fs.readFileSync(root+'/src/index.js','utf8');
if(!s.includes("from './routes/reminders.js'")){
 s="import {remindersAdmin,remindersPlayer,sendReminders} from './routes/reminders.js';\n"+s;
 s=s.replace('    if (path.startsWith("/api/pms/live"))', '    if (path === "/api/pms/reminders") return remindersAdmin(request,env);\n    if (path.startsWith("/api/pms/live"))');
 s=s.replace('  if (path === "/api/offers"', '  if (path === "/api/reminders") return remindersPlayer(request,env,session);\n  if (path === "/api/offers"');
 s=s.replace('export default {','export default {\n  async scheduled(event,env,ctx){ctx.waitUntil(sendReminders(env));},');
 fs.writeFileSync(root+'/src/index.js',s);
}
s=fs.readFileSync(root+'/wrangler.toml','utf8');if(!s.includes('[triggers]'))fs.appendFileSync(root+'/wrangler.toml','\n[triggers]\ncrons = ["*/5 * * * *"]\n');
s=fs.readFileSync(pms+'/src/App.jsx','utf8');if(!s.includes("import NotificationsStudio")){
 s="import NotificationsStudio from './NotificationsStudio';\n"+s;
 s=s.replace('const pages = [',"const pages = [['notifications','Notifications',Settings2],");
 s=s.replace(" {section==='overview'"," {section==='notifications'&&<NotificationsStudio auth={auth}/>}\n {section==='overview'");
 fs.writeFileSync(pms+'/src/App.jsx',s);
}
