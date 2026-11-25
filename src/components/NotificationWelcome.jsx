import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import { Bell } from './PlaylootIcons';
import {PushNotifications} from '@capacitor/push-notifications';
import {isSignedIn} from '../utils/api';
import {isAndroidPush,nativePushEnabled,enableNativePush} from '../utils/nativePush';
import {enableReminders,remindersEnabled} from '../utils/reminders';
import './notification-welcome.css';

const key='playloot.notification-welcome.v1';
function read(){try{return localStorage.getItem(key);}catch{return null;}}
function save(value){try{localStorage.setItem(key,value);}catch{/* Session state still prevents repeated prompts. */}}
export default function NotificationWelcome(){
 const [choice,setChoice]=useState(()=>read()==='registration-pending'?'pending':read()||((nativePushEnabled()||remindersEnabled())?'enabled':null));
 const [signedIn,setSignedIn]=useState(isSignedIn),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),first=useRef(null);
 const open=choice===null;
 useEffect(()=>{const changed=()=>setSignedIn(isSignedIn());window.addEventListener('playloot:session-changed',changed);return()=>window.removeEventListener('playloot:session-changed',changed);},[]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement;first.current?.focus();
  return()=>previous?.focus?.();
 },[open]);
 useEffect(()=>{
  if(choice!=='pending'||!signedIn)return;
  let active=true;
  const connect=()=>isAndroidPush()?enableNativePush(false):enableReminders();
  connect().then(()=>{if(active){save('enabled');setChoice('enabled');}}).catch(()=>{
   // Permission was granted, but registration failed. Keep retry available in settings.
   if(active){save('registration-pending');setChoice('registration-pending');}
  });
  return()=>{active=false;};
 },[choice,signedIn]);
 function dismiss(){if(busy)return;save('dismissed');setChoice('dismissed');}
 async function enable(){
  if(busy)return;setBusy(true);setError('');
  try{
   // Browser permission must be requested directly from this button gesture.
   if(isAndroidPush()){
    const permission=await PushNotifications.requestPermissions();
    if(permission.receive!=='granted')throw Error('Notifications are blocked. You can enable them later in your device settings.');
   }else{
    if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw Error('This browser does not support push here. On iPhone, add the app to your Home Screen and open it there.');
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw Error('Notifications were not enabled. You can change this later in your browser settings.');
   }
   if(isSignedIn()){
    if(isAndroidPush())await enableNativePush(false);else await enableReminders();
    save('enabled');setChoice('enabled');
   }else{save('pending');setChoice('pending');}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function keys(event){
  if(event.key==='Escape'){event.preventDefault();dismiss();}
  if(event.key!=='Tab')return;
  const buttons=[...dialog.current.querySelectorAll('button:not(:disabled)')];
  const start=buttons[0],end=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===start){event.preventDefault();end?.focus();}
  else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();start?.focus();}
 }
 if(!open)return null;
 return createPortal(<div className="notification-welcome-backdrop"><section ref={dialog} className="notification-welcome" role="dialog" aria-modal="true" aria-labelledby="notification-welcome-title" aria-describedby="notification-welcome-description" onKeyDown={keys}>
  <span className="notification-welcome-icon" aria-hidden="true"><Bell size={28}/></span><small>STAY IN THE GAME</small><h2 id="notification-welcome-title">Never miss what’s next.</h2>
  <p id="notification-welcome-description">Get new game alerts, offers and Playloot announcements{isAndroidPush()?'':', plus game reminders'}. You can turn these off anytime in Notifications.</p>
  {!signedIn&&<p className="notification-welcome-note">We’ll connect notifications to your account after you sign in.</p>}
  {error&&<p role="alert" className="notification-welcome-error">{error}</p>}
  <button ref={first} className="notification-welcome-enable" disabled={busy} onClick={enable}>{busy?'Enabling…':'Enable notifications'}</button>
  <button className="notification-welcome-later" disabled={busy} onClick={dismiss}>Not now</button>
 </section></div>,document.body);
}
