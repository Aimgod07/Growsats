import {useEffect,useState} from 'react';
import {getStoredUser} from '../utils/api';
import {trackedFetch} from '../utils/loading';
import './lootably-offers.css';
export const LOOTABLY_URL='https://67c7374cbb0988d092ea.appwrite.global/get-lootably-offers';
export function safeOfferUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export async function fetchLootablyOffers(userId,signal){
 if(!userId)throw new Error('Sign in to see offers for your account.');
 const response=await trackedFetch(LOOTABLY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:String(userId),countries:['IN']}),signal});
 if(!response.ok)throw new Error('Offers could not be loaded. Please try again.');
 const data=await response.json();
 if(data.status!=='success'||!Array.isArray(data.offers))throw new Error('The offer provider returned an invalid response.');
 return data.offers;
}
export default function LootablyOffers({compact=false}){
 const [userId,setUserId]=useState(()=>getStoredUser()?.id);
 const [offers,setOffers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[query,setQuery]=useState('');
 useEffect(()=>{const sync=()=>setUserId(getStoredUser()?.id);window.addEventListener('playloot:session-changed',sync);return()=>window.removeEventListener('playloot:session-changed',sync)},[]);
 useEffect(()=>{const controller=new AbortController();let active=true;setOffers([]);setLoading(true);setError('');fetchLootablyOffers(userId,controller.signal).then(list=>{if(active)setOffers(list)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;controller.abort()}},[userId,attempt]);
 const visible=compact?offers:offers.filter(o=>String(o.name||'').toLowerCase().includes(query.toLowerCase()));
 return <section className="lootably-section" aria-label="Lootably offers">{!compact&&<><div className="lootably-heading"><div><small>DISCOVER • INDIA</small><h2>Partner offers</h2></div><button type="button" className="hub__back" disabled={loading} onClick={()=>setAttempt(n=>n+1)} aria-label="Refresh partner offers">↻</button></div><p className="lootably-note">Browse available offers. Reward tracking and claiming will be available later.</p></>}{loading?<p role="status">Loading partner offers…</p>:error?<div role="alert"><p>{error}</p><button className="hub__primary" onClick={()=>setAttempt(n=>n+1)}>Try again</button></div>:<>{!compact&&<input className="lootably-search" aria-label="Search partner offers" placeholder="Search offers" value={query} onChange={e=>setQuery(e.target.value)}/>}<p className="lootably-note">{visible.length} offers</p><div className="lootably-grid">{visible.map((o,index)=><article className="lootably-card" key={o.offerID||index}><div className="lootably-title">{safeOfferUrl(o.image)&&<img src={safeOfferUrl(o.image)} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>}<div><h3>{o.name}</h3><small>{(o.devices||[]).join(' · ')}</small></div></div><p>{o.description}</p>{Array.isArray(o.goals)&&o.goals.length>0&&<details><summary>{o.goals.length} offer steps</summary><ol>{o.goals.map((g,i)=><li key={g.goalID||i}>{g.description}{g.isOptional&&<small> · Optional</small>}{Number.isFinite(g.currencyReward)&&<small> · {g.currencyReward.toLocaleString()} provider points</small>}</li>)}</ol></details>}{safeOfferUrl(o.link)&&<a className="hub__primary" href={safeOfferUrl(o.link)} target="_blank" rel="noopener noreferrer">View offer ↗</a>}</article>)}</div>{!visible.length&&<p>No offers available{query?' matching your search':''}.</p>}</>}</section>;
}
