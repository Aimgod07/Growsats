import {useRef,useState} from 'react';
import {ArrowRight,Coins,Diamond,IndianRupee,Info} from 'lucide-react';
import {backend} from '../utils/api';
import {useWallet} from './WalletState';
export default function CoinConversion({onConverted}){
 const {data:wallet}=useWallet();
 const [target,setTarget]=useState('diamonds'),[coins,setCoins]=useState('1000'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef(null),lock=useRef(false);
 const amount=Number(coins),step=target==='diamonds'?10:1000;
 const valid=Number.isSafeInteger(amount)&&amount>0&&amount<=1000000000&&amount%step===0;
 const affordable=valid&&amount<=Number(wallet.coins||0);
 const received=valid?(target==='diamonds'?`${(amount/10).toLocaleString()} diamonds`:`₹${(amount/100).toFixed(2)}`):'—';
 const TargetIcon=target==='diamonds'?Diamond:IndianRupee;
 async function submit(e){e.preventDefault();if(lock.current||!valid)return;lock.current=true;setBusy(true);setMessage('');
 const signature=target+':'+amount;
 if(pending.current?.signature!==signature)pending.current={signature,requestId:crypto.randomUUID()};
 try{await backend.convertCoins({target,coins:amount,requestId:pending.current.requestId});pending.current=null;setMessage('Converted successfully. Your balance has been updated.');onConverted?.();}
 catch(error){setMessage(error.message);}finally{lock.current=false;setBusy(false);}}
 return <section className="neo-panel coin-conversion"><header className="coin-conversion__header"><div><span>WALLET EXCHANGE</span><h2>Convert your coins</h2><p>Turn your play rewards into event diamonds or withdrawable cash.</p></div><div className="coin-conversion__balance"><Coins aria-hidden="true"/><span>Available balance</span><strong>{Number(wallet.coins||0).toLocaleString()}</strong><small>coins</small></div></header><div className="coin-conversion__rate"><span>10 coins = 1 diamond</span><span>1,000 coins = ₹10</span></div><form onSubmit={submit} className="coin-conversion__form"><div className="coin-conversion__fields"><label className="payments-field">Convert to<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setMessage('');}}><option value="diamonds">Diamonds — event entry</option><option value="cash_cents">INR cash — withdrawal balance</option></select></label><label className="payments-field">Coins to convert<input type="number" min={step} step={step} max="1000000000" value={coins} disabled={busy} onChange={e=>setCoins(e.target.value)} required/><small>Enter a multiple of {step.toLocaleString()} coins.</small></label></div><aside className="coin-conversion__preview"><span>YOU RECEIVE</span><div><TargetIcon aria-hidden="true"/><strong>{received}</strong></div><p>{target==='diamonds'?'Use diamonds to enter eligible events.':'Added to your INR withdrawal balance.'}</p><div className="coin-conversion__flow"><span><Coins/> {valid?amount.toLocaleString():'—'}</span><ArrowRight/><span><TargetIcon/> {received}</span></div></aside><div className="coin-conversion__footer"><p><Info aria-hidden="true"/>Conversions are final.{target==='cash_cents'?' Cash withdrawals require a connected payment provider.':''}</p>{valid&&!affordable&&<p className="coin-conversion__error">Your coin balance is too low for this conversion.</p>}<button className="hub__primary" disabled={busy||!affordable}>{busy?'Converting…':'Confirm conversion'}<ArrowRight aria-hidden="true"/></button></div></form>{message&&<p className="coin-conversion__message" role="status">{message}</p>}</section>;
}
