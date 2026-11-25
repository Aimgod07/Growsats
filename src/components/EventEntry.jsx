import {useState} from 'react';
import {Link} from 'react-router-dom';
import {backend} from '../utils/api';

export default function EventEntry({event,joined,onJoined}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const fee=Number(event.entry_diamonds||0);
  const join=async()=>{
    if(busy)return;
    setBusy(true);setError('');
    try{await backend.joinEvent(event.id);onJoined();}
    catch(e){setError(e.message||'Unable to join. Please try again.');}
    finally{setBusy(false);}
  };
  return <div className="event-entry">
    <p>{fee>0?`${fee.toLocaleString()} diamonds · One entry fee per event`:'Free entry'}{joined?' · Entry confirmed':''}</p>
    {fee>0&&!joined?<button type="button" className="event-play" disabled={busy} onClick={join} style={{background:event.color,color:event.text_color}}>{busy?'Joining…':`Pay ${fee.toLocaleString()} diamonds & join`}</button>:<Link className="event-play" style={{background:event.color,color:event.text_color}} to={'/all-games?game='+encodeURIComponent(event.game_id)+'&event='+encodeURIComponent(event.id)}>Play {event.game_id}<span aria-hidden="true">→</span></Link>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
