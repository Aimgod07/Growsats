import fs from 'node:fs';
const path='C:/Users/choud/Desktop/playloot-backend/src/routes/account.js';
let s=fs.readFileSync(path,'utf8');
const played="(claimed = 1 OR seconds > 0 OR EXISTS (SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0))";
s=s.replaceAll('FROM play_sessions WHERE user_id = ?1 AND claimed = 1',`FROM play_sessions WHERE user_id = ?1 AND ${played}`);
s=s.replace(/\(SELECT IFNULL\(SUM\(seconds\), 0\) FROM play_sessions WHERE user_id = \?1(?: AND \(claimed = 1 OR seconds > 0 OR EXISTS \(SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0\)\))?\) AS seconds_played/g,
 '(SELECT IFNULL(SUM(MAX(IFNULL(p.seconds,0),IFNULL(t.seconds,0))),0) FROM play_sessions p LEFT JOIN game_session_time t ON t.session_id=p.id WHERE p.user_id=?1) AS seconds_played');
s=s.replaceAll('started_at AS at, seconds','started_at AS at, MAX(IFNULL(seconds,0),IFNULL((SELECT t.seconds FROM game_session_time t WHERE t.session_id=play_sessions.id),0)) AS seconds');
s=s.replaceAll('hoursPlayed: Math.floor', 'secondsPlayed: stats?.seconds_played ?? 0,\n    hoursPlayed: Math.floor');
s=s.replace('hoursPlayed: shared.hoursPlayed,','hoursPlayed: shared.hoursPlayed,\n      secondsPlayed: shared.secondsPlayed,');
fs.writeFileSync(path,s);
const events='C:/Users/choud/Desktop/playloot-backend/src/routes/events.js';
for(const p of [events,new URL('./events.js',import.meta.url)]){
 const data=fs.readFileSync(p,'utf8').replace('if(flags.time)statements.push','statements.push');
 fs.writeFileSync(p,data);
}
