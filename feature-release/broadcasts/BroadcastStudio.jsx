import {useEffect,useRef,useState} from 'react';
const paths=[['/Home','Arcade'],['/offers','Offers'],['/missions','Missions'],['/events','Events'],['/leaderboard','Leaderboard'],['/redeem','Loot']];
export default function BroadcastStudio({auth}) {
 const [data,setData]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const [message,setMessage]=useState({title:'',body:'',path:'/Home'});
 const request=useRef(null),api=useRef(auth);api.current=auth;
 async function refresh(){try{setData(await api.current('/api/pms/broadcasts'));}catch(e){setError(e.message);}}
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);return()=>clearInterval(timer)},[]);
 function edit(key,value){setMessage(m=>({...m,[key]:value}));setConfirm(false);request.current=null;}
 async function send(){
  if(busy)return;setBusy(true);setError('');setStatus('');
  request.current ||= crypto.randomUUID();
  try{await auth('/api/pms/broadcasts',{method:'POST',body:JSON.stringify({...message,id:request.current})});setStatus('Broadcast queued. All eligible players have an inbox update. Push services will process subscribed devices.');setConfirm(false);setMessage({title:'',body:'',path:'/Home'});request.current=null;await refresh();}
  catch(e){setError(e.message+' Retrying this unchanged message uses the same request ID to prevent duplicate sends.');}
  finally{setBusy(false);}
 }
 return <section className="card"><h2>Send a broadcast</h2><p>Send an announcement to all active player inboxes and opted-in push devices. Device delivery depends on permission and connectivity. Accepted means the push service accepted it, not that a player read it.</p>
 {error&&<p className="error" role="alert">{error}</p>}{status&&<p className="success" role="status">{status}</p>}
 {data&&<><div className="stats"><article><b>{data.audience.users}</b><span>Player inboxes</span></article><article><b>{data.audience.web}</b><span>Web devices</span></article><article><b>{data.audience.android}</b><span>Android devices</span></article></div>
 {!data.webReady&&<p>Web push needs VAPID configuration. Inbox messages remain available.</p>}
 {!data.androidReady&&<p>Android remote push: awaiting Firebase setup. Android users receive the message in their app inbox.</p>}</>}
 <div className="grid2"><label className="field"><span>Title</span><input maxLength={80} value={message.title} disabled={busy} onChange={e=>edit('title',e.target.value)}/></label><label className="field"><span>Open when tapped</span><select value={message.path} disabled={busy} onChange={e=>edit('path',e.target.value)}>{paths.map(([path,label])=><option key={path} value={path}>{label}</option>)}</select></label></div>
 <label className="field"><span>Message ({message.body.length}/300)</span><textarea rows={3} maxLength={300} value={message.body} disabled={busy} onChange={e=>edit('body',e.target.value)} style={{width:'100%',padding:14,background:'#10151f',color:'#fff',border:'1px solid #303748',borderRadius:12}}/></label>
 <div className="card" aria-label="Notification preview"><small>PLAYLOOT · NOW</small><h3>{message.title||'Your notification title'}</h3><p>{message.body||'Your message appears here.'}</p></div>
 {confirm?<div role="group" aria-label="Confirm broadcast"><p>Send this message to {data?.audience.users??'all'} player inboxes and all subscribed devices?</p><div className="actions"><button className="primary" disabled={busy} onClick={send}>{busy?'Queuing…':'Send to all users'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div></div>:<button className="primary" disabled={!data||!message.title.trim()||!message.body.trim()} onClick={()=>setConfirm(true)}>Review & send</button>}
 <h3>Recent broadcasts</h3><button className="secondary" onClick={refresh}>Refresh delivery status</button>
 <div style={{overflowX:'auto',marginTop:16}}><table style={{width:'100%',textAlign:'left'}}><thead><tr>{['Message','Inboxes','Devices','Accepted','Pending','Failed','Skipped'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{data?.history.map(b=><tr key={b.id}><td><strong>{b.title}</strong><br/><small>{new Date(b.created_at*1000).toLocaleString()}</small></td>{[b.inbox_count,b.devices,b.accepted,b.pending,b.failed,b.skipped].map((v,i)=><td key={i}>{v||0}</td>)}</tr>)}</tbody></table>{data?.history.length===0&&<p>No broadcasts yet.</p>}</div>
 </section>;
}
