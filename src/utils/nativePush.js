import {Capacitor} from '@capacitor/core';
import {PushNotifications} from '@capacitor/push-notifications';
import {backend,getStoredUser,isSignedIn} from './api';
export const isAndroidPush=()=>Capacitor.getPlatform()==='android';
export const nativePushConfigured=()=>import.meta.env.VITE_ANDROID_PUSH_CONFIGURED===true;
const enabledKey='playloot.push.enabled',tokenKey='playloot.push.token';
export const nativePushEnabled=()=>localStorage.getItem(enabledKey)==='true';
let registering;
export async function enableNativePush(ask=true) {
 if(!isAndroidPush())return;
 if(registering)return registering;
 registering=(async()=>{
  if(!nativePushConfigured())throw new Error('This Android build is awaiting Firebase setup. Your messages are still available in the app inbox.');
  if(!(await backend.nativePushStatus()).ready)throw new Error('Android push is awaiting Firebase setup. Your messages are still available in the app inbox.');
  let permission=await PushNotifications.checkPermissions();
  if(permission.receive!=='granted'&&ask)permission=await PushNotifications.requestPermissions();
  if(permission.receive!=='granted')throw new Error('Allow notifications in Android settings to receive announcements.');
  const userId=getStoredUser()?.id;
  await PushNotifications.createChannel({id:'playloot-broadcasts',name:'Playloot announcements',importance:3,description:'Offers, games and announcements you opted into'});
  const token=await new Promise((resolve,reject)=>{
   const listeners=[];let done=false;
   const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);listeners.forEach(p=>p.then(l=>l.remove()));if(err)reject(err);else resolve(value);};
   const timer=setTimeout(()=>finish(new Error('Push registration timed out. Please try again.')),15000);
   listeners.push(PushNotifications.addListener('registration',t=>finish(null,t.value)));
   listeners.push(PushNotifications.addListener('registrationError',()=>finish(new Error('Android push setup is incomplete.'))));
   Promise.all(listeners).then(()=>PushNotifications.register()).catch(()=>finish(new Error('Android push is not configured in this build.')));
  });
  if(!isSignedIn()||getStoredUser()?.id!==userId){await PushNotifications.unregister();return;}
  await backend.subscribeNativePush(token);
  localStorage.setItem(tokenKey,token);localStorage.setItem(enabledKey,'true');
 })().finally(()=>{registering=null;});
 return registering;
}
export async function disableNativePush(logout=false) {
 const token=localStorage.getItem(tokenKey);
 if(token&&!logout)await backend.unsubscribeNativePush(token);
 localStorage.removeItem(enabledKey);localStorage.removeItem(tokenKey);
 if(token&&isAndroidPush())await PushNotifications.unregister();
}
export async function listenNativePush(navigate) {
 if(!isAndroidPush())return()=>{};
 const handle=await PushNotifications.addListener('pushNotificationActionPerformed',event=>{
  const path=event.notification.data?.path;
  if(['/Home','/offers','/missions','/events','/leaderboard','/redeem'].includes(path))navigate(path);
 });
 const received=await PushNotifications.addListener('pushNotificationReceived',()=>window.dispatchEvent(new Event('playloot:notifications-changed')));
 return()=>{handle.remove();received.remove();};
}
