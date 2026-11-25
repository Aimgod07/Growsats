import EventEntry from '../components/EventEntry';
import TreasureChest from '../components/TreasureChest';
import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import { ArrowLeft, Clock3, Medal, ShieldCheck, Trophy, Users } from 'lucide-react';
import { CalendarDays } from '../components/PlaylootIcons';
import { Coins } from '../components/PlaylootIcons';
import { Gamepad2 } from '../components/PlaylootIcons';
import {backend} from '../utils/api';
import {useLiveFeatures,AdPlacement} from '../components/LiveFeatures';
import '../styles/player-hub.css';

const date=value=>new Date(value*1000).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
const state=(event,now)=>now<event.starts_at?'Upcoming':now>=event.ends_at?'Completed':'Live now';

export default function Events(){const {eventId}=useParams();return eventId?<EventDetails key={eventId} id={eventId}/>:<EventList/>}

function PageHeader({title,back='/leaderboard'}){return <header className="hub__header events-header"><Link to={back} className="hub__back" aria-label="Go back"><ArrowLeft size={20}/></Link><div><span className="hub__eyebrow">PLAYLOOT EVENTS</span><h1>{title}</h1></div></header>}

function EventList(){
 const {events}=useLiveFeatures();const [now]=useState(()=>Math.floor(Date.now()/1000));
 return <main className="hub events-page" aria-label="Events and tournaments"><div className="hub__body events-body">
  <section className="events-hero"><div><span className="events-kicker"><Trophy/> COMPETE FOR REWARDS</span><h2>Play. Score.<br/>Take the top spot.</h2><p>Finish event runs, climb verified leaderboards, and receive prize coins automatically when time expires.</p><div className="events-hero__facts"><span><ShieldCheck/> Automatic scores</span><span><Coins/> Automatic prizes</span></div></div><TreasureChest/></section>
  <AdPlacement slot="events"/>
  <div className="events-section-head"><div><span>ACTIVE ARENA</span><h2>Choose your challenge</h2></div><b>{events.length} event{events.length===1?'':'s'}</b></div>
  {!events.length?<section className="events-empty"><Trophy/><h2>More challenges are coming</h2><p>New tournaments and time events will appear here.</p></section>:<div className="event-grid">{events.map(e=><EventCard key={e.id} event={e} now={now}/>)}</div>}
 </div></main>
}

function EventCard({event:e,now}){
 const status=state(e,now);return <article className="event-card"><div className="event-card__top"><span className={'event-status event-status--'+status.toLowerCase().replaceAll(' ','-')}>{status}</span><span className="event-type">{e.kind==='time'?<Clock3/>:<Trophy/>}{e.kind==='time'?'Time event':'Score tournament'}</span></div><div className="event-card__title"><span>{e.icon||'🏆'}</span><div><h3>{e.title}</h3><p>{e.description}</p></div></div><div className="event-card__meta"><div><Gamepad2/><span>Game<strong>{e.game_id}</strong></span></div><div><Coins/><span>Prize<strong>{Number(e.reward||0).toLocaleString()} coins</strong></span></div><div><Users/><span>Entry<strong>{Number(e.entry_diamonds||0).toLocaleString()} diamonds</strong></span></div><div><Users/><span>Winners<strong>Top {e.winners}</strong></span></div><div><CalendarDays/><span>{status==='Completed'?'Ended':status==='Upcoming'?'Starts':'Ends'}<strong>{date(status==='Upcoming'?e.starts_at:e.ends_at)}</strong></span></div></div><Link className="event-card__action" style={{'--event-color':e.color,'--event-text':e.text_color}} to={'/events/'+e.id}>{status==='Completed'?'View results':e.button_title||'View event'}<span>→</span></Link></article>
}

function EventDetails({id}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{let active=true;const load=()=>backend.event(id).then(d=>{if(active){setData(d);setError('')}}).catch(e=>{if(active)setError(e.message)});load();const timer=setInterval(load,20000);return()=>{active=false;clearInterval(timer)}},[id]);
 const e=data?.event,current=Math.floor(clock/1000),active=e&&current>=e.starts_at&&!data.ended;
 return <main className="hub events-page"><PageHeader title={e?.title||'Event'} back="/events"/><div className="hub__body events-body">{error&&<div className="hub__error" role="alert">{error}</div>}{!data&&!error&&<div className="events-loading">Loading event…</div>}{data&&<>
  <section className="event-detail-hero" style={{'--event-color':e.color}}><div className="event-detail-hero__copy"><span className={'event-status event-status--'+state(e,current).toLowerCase().replaceAll(' ','-')}>{state(e,current)}</span><div className="event-detail-hero__title"><span>{e.icon||'🏆'}</span><div><small>{e.kind==='time'?'TIME EVENT':'SCORE TOURNAMENT'}</small><h2>{e.title}</h2></div></div><p>{e.description}</p>{active&&<EventEntry event={e} joined={data.joined} onJoined={()=>setData(d=>({...d,joined:true}))}/>} {data.ended&&data.claimed&&<div className="event-won"><Medal/>Your {e.reward} prize coins were transferred automatically.</div>}</div><div className="event-detail-stats"><div><Coins/><span>Prize pool<strong>{Number(e.reward||0).toLocaleString()} coins</strong></span></div><div><Trophy/><span>Winning places<strong>Top {e.winners}</strong></span></div><div><Clock3/><span>{data.ended?'Ended':current<e.starts_at?'Starts':'Time remaining'}<strong>{date(current<e.starts_at?e.starts_at:e.ends_at)}</strong></span></div><div><ShieldCheck/><span>Scoring<strong>{e.kind==='time'?'Verified play time':'Automatic final score'}</strong></span></div></div></section>
  <div className="event-detail-layout"><section className="event-board"><header><div><span>LIVE STANDINGS</span><h2>{e.kind==='time'?'Play-time leaderboard':'Score leaderboard'}</h2></div><b>{data.players.length} player{data.players.length===1?'':'s'}</b></header>{data.me&&<div className="event-my-rank"><span>Your position</span><strong>#{data.me.rank}</strong><b>{data.me.value.toLocaleString()} {e.kind==='time'?'sec':'pts'}</b></div>}{!data.players.length?<div className="events-empty events-empty--board"><Trophy/><h3>No results yet</h3><p>Complete a run to become the first name on the board.</p></div>:<div className="event-board__rows">{data.players.map(p=><div className={'event-board__row '+(p.player_id===data.me?.player_id?'is-me':'')} key={p.player_id}><span className="event-rank">{p.rank<=3?['🥇','🥈','🥉'][p.rank-1]:'#'+p.rank}</span><Link to={'/players/'+encodeURIComponent(p.player_id)}><b>{p.name}</b><small>@{p.handle}</small></Link><strong>{Number(p.value).toLocaleString()}<small>{e.kind==='time'?'seconds':'points'}</small></strong></div>)}</div>}</section><aside className="event-rules"><h3>How it works</h3><ol><li><span>1</span>Pay the displayed diamond fee once, then open the event game.</li><li><span>2</span>Finish a new run in the embedded session.</li><li><span>3</span>Your best recorded result enters the leaderboard automatically.</li><li><span>4</span>Prize coins transfer automatically after the event.</li></ol><AdPlacement slot="events"/></aside></div>
 </>}</div></main>
}
