import {useEffect,useState} from 'react';
import {useNavigate,useLocation} from 'react-router-dom';
import {LocalNotifications} from '@capacitor/local-notifications';
import {backend,isSignedIn} from '../utils/api';
import BroadcastSettings from './BroadcastSettings';
import {NotificationButtonIcon} from './PlaylootIcons';
import {nativePushEnabled,enableNativePush,disableNativePush,listenNativePush} from '../utils/nativePush';
import {enableReminders,disableReminders,remindersEnabled,refreshReminders,nativeReminders} from '../utils/reminders';
export function ReminderLifecycle(){
 const navigate=useNavigate();
 useLocation();
 const signedIn=isSignedIn();
 useEffect(()=>{if(signedIn){refreshReminders().catch(()=>{});if(nativePushEnabled())enableNativePush(false).catch(()=>{});}},[signedIn]);
 useEffect(()=>{const stop=listenNativePush(navigate);return()=>{stop.then(cleanup=>cleanup());};},[navigate]);
 useEffect(()=>{

  let listener;
  if(nativeReminders())listener=LocalNotifications.addListener('localNotificationActionPerformed',event=>{
   const path=event.notification.extra?.path;
   if(['/Home','/offers','/missions','/events','/leaderboard','/redeem'].includes(path))navigate(path);
  });
  const stop=()=>{disableReminders().catch(()=>{});disableNativePush(true).catch(()=>{});};
  window.addEventListener('playloot:logout',stop);
  return()=>{window.removeEventListener('playloot:logout',stop);listener?.then(l=>l.remove());};
 },[navigate]);
 return null;
}
export default function ReminderSettings(){
 const [enabled,setEnabled]=useState(remindersEnabled),[busy,setBusy]=useState(false),[error,setError]=useState(''),[config,setConfig]=useState(null);
 useEffect(()=>{backend.reminders().then(d=>setConfig(d.config)).catch(e=>setError(e.message));},[]);
 async function toggle(){setBusy(true);setError('');try{if(enabled)await disableReminders();else await enableReminders();setEnabled(remindersEnabled());}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><BroadcastSettings/><section className="neo-panel"><h2>Game & offer reminders</h2>{config?.enabled===false&&<p>Reminders are currently paused by Playloot.</p>}<button className="hub__primary polished-action polished-action--primary" disabled={busy} aria-busy={busy} aria-pressed={enabled} onClick={toggle}><NotificationButtonIcon size={20}/><span>{busy?'Updating…':enabled?'Disable reminders':'Enable reminders'}</span></button>{error&&<p role="alert">{error}</p>}</section></>;
}
