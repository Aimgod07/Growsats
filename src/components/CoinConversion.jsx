import {useRef,useState} from 'react';
import { ArrowRight, IndianRupee, Info } from 'lucide-react';
import { Coins } from './PlaylootIcons';
import DiamondIcon from './DiamondIcon';
import {backend} from '../utils/api';
import {useWallet} from './WalletState';
import '../styles/transactions.css';

export default function CoinConversion({onConverted}) {
 const {data:wallet}=useWallet();
 const [target,setTarget]=useState('diamonds'),[coins,setCoins]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef(null),lock=useRef(false);
 const balance=Number(wallet.coins||0),amount=Number(coins),step=target==='diamonds'?10:1000;
 const maxAmount=Math.min(1000000000,Math.floor(balance/step)*step);
 const valid=Number.isSafeInteger(amount)&&amount>0&&amount<=1000000000&&amount%step===0;
 const affordable=valid&&amount<=balance;
 const received=valid?(target==='diamonds'?`${(amount/10).toLocaleString()} diamonds`:`₹${(amount/100).toFixed(2)}`):'—';
 const TargetIcon=target==='diamonds'?DiamondIcon:IndianRupee;
 const changeAmount=value=>{setCoins(String(value));setMessage('');};
 async function submit(e) {
  e.preventDefault();if(lock.current||!affordable)return;
  lock.current=true;setBusy(true);setMessage('');
  const signature=target+':'+amount;
  if(pending.current?.signature!==signature)pending.current={signature,requestId:crypto.randomUUID()};
  try {await backend.convertCoins({target,coins:amount,requestId:pending.current.requestId});pending.current=null;setMessage('Converted successfully. Your balance has been updated.');onConverted?.();}
  catch(error){setMessage(error.message);}finally{lock.current=false;setBusy(false);}
 }
 return <section className="neo-panel coin-conversion" aria-labelledby="conversion-title">
  <header className="coin-conversion__header">
   <div><span>WALLET EXCHANGE</span><h2 id="conversion-title">Make your coins go further.</h2><p>Exchange your play rewards for event diamonds or INR cash.</p></div>
   <div className="coin-conversion__balance"><Coins aria-hidden="true"/><span>Available to exchange</span><strong>{balance.toLocaleString()} <small>coins</small></strong></div>
  </header>
  <form onSubmit={submit} className="coin-conversion__form">
   <div className="coin-conversion__fields">
    <label className="payments-field">Convert to<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setMessage('');}}><option value="diamonds">Diamonds · event entry</option><option value="cash_cents">INR cash · withdrawal balance</option></select></label>
    <div className="coin-conversion__rate"><span>{target==='diamonds'?'10 coins = 1 diamond':'1,000 coins = ₹10'}</span><small>Current exchange rate</small></div>
    <label className="payments-field">Coins to exchange<input type="number" inputMode="numeric" min={step} step={step} max="1000000000" placeholder={target==='diamonds'?'e.g. 100':'e.g. 1,000'} value={coins} disabled={busy} onChange={e=>changeAmount(e.target.value)} aria-describedby="conversion-help" aria-invalid={coins!==''&&(!valid||!affordable)} required/><small id="conversion-help">{target==='diamonds'?'Exchange in multiples of 10 coins.':'Exchange in multiples of 1,000 coins.'}</small></label>
    <div className="coin-conversion__presets" aria-label="Choose an amount">{[step,step*5].map(value=><button type="button" key={value} disabled={busy||value>balance} aria-pressed={amount===value} onClick={()=>changeAmount(value)}>{value.toLocaleString()} coins</button>)}<button type="button" disabled={busy||maxAmount===0} onClick={()=>changeAmount(maxAmount)}>Use max <span>{maxAmount.toLocaleString()}</span></button></div>
    {coins!==''&&!valid&&<p className="coin-conversion__error" role="status">Enter a positive multiple of {step.toLocaleString()} coins.</p>}
    {valid&&!affordable&&<p className="coin-conversion__error" role="status">You need {(amount-balance).toLocaleString()} more coins for this exchange.</p>}
   </div>
   <aside className="coin-conversion__preview" aria-live="polite">
    <span>YOUR EXCHANGE</span><div className="coin-conversion__reward-icon"><TargetIcon size={44} aria-hidden="true"/></div>
    <small>You receive</small><strong>{received}</strong><p>{target==='diamonds'?'Ready for your next event.':'Added to your INR withdrawal balance.'}</p>
    <div className="coin-conversion__flow"><span><Coins/> {valid?amount.toLocaleString():'—'} coins</span><ArrowRight/><span>{affordable?`${(balance-amount).toLocaleString()} coins left`:'Preview only'}</span></div>
    <button type="submit" className="hub__primary" disabled={busy||!affordable}>{busy?'Exchanging…':'Confirm exchange'}<ArrowRight aria-hidden="true"/></button>
   </aside>
   <div className="coin-conversion__footer"><p><Info aria-hidden="true"/>Exchanges are final.{target==='cash_cents'?' Cash withdrawals require a connected payment provider.':''}</p></div>
  </form>
  {message&&<p className="coin-conversion__message" role="status">{message}</p>}
 </section>;
}
