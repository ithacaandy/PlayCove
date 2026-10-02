
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json() || {};}catch{}
 const url=typeof data.url==='string' && /^\/(?:notifications|outings\/[0-9a-f-]{36})$/.test(data.url)?data.url:'/notifications';
 event.waitUntil(self.registration.showNotification('LinkLemon',{body:typeof data.body==='string'?data.body.slice(0,180):'You have an update in LinkLemon.',icon:'/brand/icons/check-in.png',tag:typeof data.tag==='string'?data.tag:'linklemon-update',renotify:false,data:{url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const path=event.notification.data?.url;
 const url=new URL(typeof path==='string' && /^\/(?:notifications|outings\/[0-9a-f-]{36})$/.test(path)?path:'/notifications',self.location.origin).href;
 event.waitUntil((async()=>{const windows=await clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);if(existing){await existing.navigate(url);await existing.focus();}else await clients.openWindow(url);})());
});
