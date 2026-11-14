import {Capacitor,registerPlugin} from '@capacitor/core';

export async function deviceIdentity(){
 let installationId;
 try{
  installationId=localStorage.getItem('playloot.device.installation');
  if(!installationId){installationId=crypto.randomUUID();localStorage.setItem('playloot.device.installation',installationId);}
 }catch{return null;}
 let hints={};
 try{hints=await navigator.userAgentData?.getHighEntropyValues(['model','platformVersion']);}catch{/* Browser may withhold device details. */}
 let native={};
 if(Capacitor.isNativePlatform()){
  try{native=await registerPlugin('GameWebView').deviceInfo();}catch{/* Available after the next Android build. */}
 }
 const ua=navigator.userAgent;
 return {
  installationId,model:native.model||hints?.model||'Unavailable',
  os:native.os||[navigator.userAgentData?.platform||navigator.platform,hints?.platformVersion||''].join(' ').trim(),
  platform:Capacitor.getPlatform(),browser:navigator.userAgentData?.brands?.map(b=>`${b.brand} ${b.version}`).join(', ')||ua,
  screen:`${screen.width}x${screen.height}@${devicePixelRatio}`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,language:navigator.language,
 };
}
