import {useEffect,useState} from 'react';
import {backend} from '../utils/api';
import {isAndroidPush,nativePushConfigured,nativePushEnabled,enableNativePush,disableNativePush} from '../utils/nativePush';
export default function BroadcastSettings(){
 const [ready,setReady]=useState(false),[enabled,setEnabled]=useState(nativePushEnabled),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(isAndroidPush())backend.nativePushStatus().then(d=>setReady(d.ready&&nativePushConfigured())).catch(e=>setError(e.message));},[]);
 if(!isAndroidPush())return null;
 async function toggle(){setBusy(true);setError('');try{if(enabled)await disableNativePush();else await enableNativePush();setEnabled(nativePushEnabled());}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="neo-panel"><h2>Game announcements</h2><p>Receive new games, offers and announcements from Playloot.</p>{!ready&&<p>Android push is being set up. Announcements remain available in your inbox below.</p>}<button className="hub__primary" disabled={busy||(!ready&&!enabled)} onClick={toggle}>{busy?'Updating…':enabled?'Turn off announcements':'Enable announcements'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
