import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {backend} from './api';
const key='playloot.reminders.enabled';
const ids=Array.from({length:24},(_,i)=>({id:81000+i}));
export const nativeReminders=()=>Capacitor.isNativePlatform();
export const remindersEnabled=()=>localStorage.getItem(key)==='true';
export async function registration(){await navigator.serviceWorker.register('/push-sw.js');return navigator.serviceWorker.ready;}
function bytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function scheduleNative(config){
 const serialized=JSON.stringify(config);
 const pending=await LocalNotifications.getPending();
 if(localStorage.getItem('playloot.reminders.schedule')===serialized && pending.notifications.some(n=>n.id>=81000&&n.id<81024))return;
 await LocalNotifications.cancel({notifications:ids});
 const messages=config.messages.filter(m=>m.enabled);
 if(!config.enabled||!messages.length)return;
 const now=new Date(),notifications=[];
 for(let i=0;i<24/config.intervalHours;i++){
  const at=new Date(now.getTime()+(i+1)*config.intervalHours*3600000),m=messages[i%messages.length];
  notifications.push({id:81000+i,title:m.title,body:m.body,channelId:'playloot-reminders',schedule:{on:{hour:at.getHours(),minute:at.getMinutes()},repeats:true},extra:{path:m.path}});
 }
 await LocalNotifications.createChannel({id:'playloot-reminders',name:'Game and offer reminders',importance:3,description:'Optional game, offer and mission reminders'});
 await LocalNotifications.schedule({notifications});
 localStorage.setItem('playloot.reminders.schedule',serialized);
}
export async function enableReminders(){
 // Ask for OS permission only from the player's button click.
 if(nativeReminders()){
  const p=await LocalNotifications.requestPermissions();if(p.display!=='granted')throw new Error('Allow notifications in device settings to enable reminders.');
  const {config}=await backend.reminders();await scheduleNative(config);
 }else{
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('This browser does not support push notifications. On iPhone, add the app to your Home Screen first.');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notifications are blocked. Update this site’s notification permission to enable reminders.');
  const {publicKey}=await backend.reminders();if(!publicKey)throw new Error('Push service is not configured yet.');
  const reg=await registration();const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
  await backend.subscribeReminders(subscription.toJSON());
 }
 localStorage.setItem(key,'true');
}
export async function disableReminders(){
 if(nativeReminders())await LocalNotifications.cancel({notifications:ids});
 else if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration('/push-sw.js');const s=await reg?.pushManager.getSubscription();if(s){await s.unsubscribe();try{await backend.unsubscribeReminders(s.endpoint)}catch{/* Expired subscriptions are also removed by the sender. */}}}
 localStorage.removeItem(key);
 localStorage.removeItem('playloot.reminders.schedule');
}
export async function refreshReminders(){
 if(!remindersEnabled())return;
 if(nativeReminders()){
  if((await LocalNotifications.checkPermissions()).display!=='granted'){localStorage.removeItem(key);return;}
  await scheduleNative((await backend.reminders()).config);
 }else{
  const reg=await registration(),s=await reg.pushManager.getSubscription();
  if(s)await backend.subscribeReminders(s.toJSON());else localStorage.removeItem(key);
 localStorage.removeItem('playloot.reminders.schedule');
 }
}
