import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Wallet, Bitcoin, Landmark, RefreshCw, ArrowLeft, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import { Gift } from '../components/PlaylootIcons';
import {backend,getStoredUser} from '../utils/api';
import {toMinorUnits} from '../utils/money';
import '../styles/player-hub.css';
import '../styles/transactions.css';
const statuses={created:'Awaiting provider',pending:'Processing',succeeded:'Successful',failed:'Failed'};
const icons={currency:Landmark,crypto:Bitcoin,gift_card:Gift};
export default function Transactions(){
 const [,setSearchParams]=useSearchParams();
 const direction='withdraw';
 const setDirection=value=>setSearchParams({direction:value},{replace:true});
 const [providerId,setProviderId]=useState('default');
 const [data,setData]=useState(null),[methodId,setMethod]=useState('currency'),[amount,setAmount]=useState(''),[destination,setDestination]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[offset,setOffset]=useState(0),[loading,setLoading]=useState(true);
 const intentKey='playloot.payment.intent.'+(getStoredUser()?.id||'unknown');
 const [initialIntent]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(intentKey)||'null');}catch{return null;}});
 const intent=useRef(initialIntent),submitLock=useRef(false),loadVersion=useRef(0);
 const load=useCallback(async()=>{const version=++loadVersion.current;try{const next=await backend.payments(offset);if(version===loadVersion.current)setData(next);}catch(e){if(version===loadVersion.current)setError(e.message);}finally{if(version===loadVersion.current)setLoading(false);}},[offset]);
 useEffect(()=>{load();},[load]);
 const hasPending=data?.transactions.some(t=>['created','pending'].includes(t.status));
 useEffect(()=>{if(!hasPending)return;const timer=setInterval(()=>{if(!document.hidden)load();},8000);return()=>clearInterval(timer);},[hasPending,load]);
 const currency=data?.wallet?.currency||'INR';
 const money=n=>new Intl.NumberFormat(undefined,{style:'currency',currency}).format((n||0)/100);
 const providerMethods=data?.providers??[{id:'default',title:'Primary payment provider',method_id:'currency',deposit_enabled:1,withdraw_enabled:1}];
 const availableProviders=[...new Map(providerMethods.filter(p=>p[direction==='deposit'?'deposit_enabled':'withdraw_enabled']&&(data?.methods||[]).some(m=>m.id===p.method_id&&m[direction==='deposit'?'deposit_enabled':'withdraw_enabled'])).map(p=>[p.id,p])).values()];
 const selectedProvider=availableProviders.find(p=>p.id===providerId)||availableProviders[0];
 const methods=(data?.methods||[]).filter(m=>m[direction==='deposit'?'deposit_enabled':'withdraw_enabled']&&providerMethods.some(p=>p.id===selectedProvider?.id&&p.method_id===m.id&&p[direction==='deposit'?'deposit_enabled':'withdraw_enabled']));
 const selected=methods.find(m=>m.id===methodId)||methods[0];
 async function submit(e){
  e.preventDefault();if(submitLock.current)return;setError('');setMessage('');const minor=toMinorUnits(amount);
  if(!selected||minor===null||minor<selected.min_minor||minor>selected.max_minor){setError('Enter an amount within the selected payment method’s limits.');return;}
  if(direction==='withdraw'&&minor>(data?.wallet?.availableMinor||0)){setError('Your available cash balance is too low.');return;}
  const details={direction,providerId:selectedProvider.id,methodId:selected.id,amountMinor:minor,destination:direction==='withdraw'?destination.trim():''};
  const signature=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(details))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(submitLock.current)return;
  if(intent.current&&intent.current.signature!==signature){setError('A previous submission is unresolved. Refresh transaction history and retry the same details before starting a different payment.');return;}
  if(!intent.current)intent.current={signature,key:crypto.randomUUID()};
  try{sessionStorage.setItem(intentKey,JSON.stringify(intent.current));}catch{}
  submitLock.current=true;setBusy(true);
  try{const result=await backend.createPayment({...details,idempotencyKey:intent.current.key});setMessage(result.message||'Request saved. Its status will update when the payment provider confirms the result.');intent.current=null;sessionStorage.removeItem(intentKey);setAmount('');setDestination('');setOffset(0);await load();}catch(e){if(e.status>=400&&e.status<500&&e.status!==429){intent.current=null;sessionStorage.removeItem(intentKey);}setError(e.message);}finally{submitLock.current=false;setBusy(false);}
 }
 async function retry(id){setBusy(true);setError('');try{await backend.retryPayment(id);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="hub payments"><header className="hub__header"><Link className="hub__back" to="/redeem" aria-label="Back to Loot"><ArrowLeft/></Link><div><small className="payments-eyebrow">YOUR WALLET</small><h1>Transactions</h1></div><button className="hub__back" onClick={load} aria-label="Refresh transactions"><RefreshCw size={18}/></button></header>
 <div className="hub__body">{error&&<p className="payments-alert" role="alert">{error}</p>}{message&&<p className="payments-message" role="status">{message}</p>}
 <section className="neo-panel payments-balance">
   <div className="payments-balance__copy"><span>Available cash</span><strong>{data?money(data.wallet?.availableMinor):'—'}</strong><small>{money(data?.wallet?.reservedMinor)} reserved for withdrawals</small></div>
   <img className="payments-balance__art" src="/playloot-art/withdraw-bank.png" alt="" />
 </section>
 {loading?<p role="status">Loading your wallet…</p>:data&&<>
 {!data.ready&&<section className="payments-notice"><Clock3 size={20}/><div><b>Payments are coming soon</b><p>Gift cards, crypto and currency payments will open when our payment provider is connected.</p></div></section>}
 <section className="neo-panel"><div className="payments-tabs" role="group" aria-label="Transaction type">{['withdraw'].map(type=><button key={type} type="button" aria-pressed={direction===type} onClick={()=>{setDirection(type);setError('');}}>{type==='deposit'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>} {type==='deposit'?'Deposit':'Withdraw'}</button>)}</div>
 <form onSubmit={submit}><label className="payments-field">Payment provider<select value={selectedProvider?.id||''} disabled={busy} onChange={e=>setProviderId(e.target.value)}>{availableProviders.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><h2>Choose a payment method</h2><div className="payments-methods">{methods.map(m=>{const Icon=icons[m.category]||Wallet;return <button type="button" key={m.id} aria-pressed={selected?.id===m.id} onClick={()=>setMethod(m.id)}><Icon size={22}/><b>{m.title}</b><small>{m.category.replace('_',' ')}</small></button>;})}</div>
 {selected?<><p className="payments-muted">{selected.description}</p><label className="payments-field">Amount in {currency}<input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required disabled={busy}/><small>{money(selected.min_minor)} – {money(selected.max_minor)}</small></label>
 {direction==='withdraw'&&<label className="payments-field">{selected.destination_label}<input value={destination} onChange={e=>setDestination(e.target.value)} maxLength={500} minLength={3} required disabled={busy} autoComplete="off"/><small>Use an account reference, recipient email, or wallet address and network. Never enter passwords, card security codes or private keys.</small></label>}
 <p className="payments-muted">{direction==='deposit'?'Your cash balance changes only after payment confirmation.':'Your cash amount is reserved while processing and returned if the provider confirms failure.'} Crypto rates, networks, gift card brands and any fees will be confirmed by the provider. Coins and diamonds are separate from cash.</p>
 <button className="hub__primary payments-submit" disabled={busy||!data.ready}>{busy?'Submitting…':!data.ready?'Available once payments connect':direction==='deposit'?'Continue to deposit':'Request withdrawal'}</button></>:<p>No methods available for this transaction type.</p>}</form></section>
 <section className="neo-panel"><h2>Transaction history</h2><p className="payments-muted">Provider confirmations update automatically while this screen is open.</p><div className="payments-history">{!data.transactions.length?<p className="payments-empty">Your transactions will appear here.</p>:data.transactions.map(t=>{const Icon=t.status==='succeeded'?CheckCircle2:t.status==='failed'?XCircle:Clock3;return <article key={t.id} className="payments-entry"><div className="payments-entry-heading"><b>{t.direction==='deposit'?'Deposit':'Withdrawal'}</b><strong>{money(t.amount_minor)}</strong></div><span className={'payment-status '+t.status}><Icon size={14}/>{statuses[t.status]}</span><small>{data.methods.find(m=>m.id===t.method_id)?.title||t.method_id} · {new Date(t.created_at.replace(' ','T')+'Z').toLocaleString()}</small><details><summary>Transaction details</summary><p>ID: {t.id}</p><p>Provider: {t.provider_id||'default'}</p>{t.provider_reference&&<p>Provider reference: {t.provider_reference}</p>}{t.failure_message&&<p>{t.failure_message}</p>}</details>{t.direction==='withdraw'&&t.checkout_url&&t.status==='pending'&&<a className="hub__primary" href={t.checkout_url} target="_blank" rel="noopener noreferrer">Continue payment ↗</a>}{t.direction==='withdraw'&&t.status==='created'&&<button className="hub__primary" disabled={busy||!data.ready} onClick={()=>retry(t.id)}>Retry provider connection</button>}</article>;})}</div><div className="payments-pagination"><button disabled={offset===0} onClick={()=>setOffset(n=>Math.max(0,n-20))}>Previous</button><span>Page {offset/20+1}</span><button disabled={!data.hasMore} onClick={()=>setOffset(n=>n+20)}>Next</button></div></section></>}
 </div></main>;
}
