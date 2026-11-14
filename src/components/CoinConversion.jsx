import {useRef,useState} from 'react';
import {backend} from '../utils/api';
import {useWallet} from './WalletState';
export default function CoinConversion({onConverted}){
 const {data:wallet}=useWallet();
 const [target,setTarget]=useState('diamonds'),[coins,setCoins]=useState('1000'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef(null),lock=useRef(false);
 const amount=Number(coins),step=target==='diamonds'?10:1000;
 const valid=Number.isSafeInteger(amount)&&amount>0&&amount<=1000000000&&amount%step===0;
 async function submit(e){e.preventDefault();if(lock.current||!valid)return;lock.current=true;setBusy(true);setMessage('');
 const signature=target+':'+amount;
 if(pending.current?.signature!==signature)pending.current={signature,requestId:crypto.randomUUID()};
 try{await backend.convertCoins({target,coins:amount,requestId:pending.current.requestId});pending.current=null;setMessage('Converted successfully. Your balance has been updated.');onConverted?.();}
 catch(error){setMessage(error.message);}finally{lock.current=false;setBusy(false);}}
 return <section className="neo-panel"><h2>Convert your coins</h2><p>{Number(wallet.coins||0).toLocaleString()} coins available</p><p>10 coins = 1 diamond · 1,000 coins = ₹10</p><form onSubmit={submit}><label className="payments-field">Convert to<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setMessage('');}}><option value="diamonds">Diamonds — event entry</option><option value="cash_cents">INR cash — withdrawal balance</option></select></label><label className="payments-field">Coins<input type="number" min={step} step={step} max="1000000000" value={coins} disabled={busy} onChange={e=>setCoins(e.target.value)} required/></label><p>{valid?'You receive '+(target==='diamonds'?amount/10+' diamonds':'₹'+(amount/100).toFixed(2)):'Enter a multiple of '+step+' coins.'}</p><p>Conversions are final. Cash withdrawals require a connected payment provider.</p><button className="hub__primary" disabled={busy||!valid||amount>Number(wallet.coins||0)}>{busy?'Converting…':'Confirm conversion'}</button></form>{message&&<p role="status">{message}</p>}</section>;
}
