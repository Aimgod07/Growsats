self.addEventListener('push',event=>{
 let message;try{message=event.data.json()}catch{return;}
 event.waitUntil(self.registration.showNotification(message.title||'Playloot',{body:message.body||'',tag:message.id?'playloot-broadcast-'+message.id:'playloot-reminder',data:{path:message.path||'/Home'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const paths=['/Home','/offers','/missions','/events','/leaderboard','/redeem'];
 const path=paths.includes(event.notification.data?.path)?event.notification.data.path:'/Home';
 event.waitUntil((async()=>{
  const url=new URL(path,self.location.origin).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);return client.focus();}}
  return self.clients.openWindow(url);
 })());
});
