const outingPath = /^\/outings\/[0-9a-f-]{36}$/;
const allowedPath = /^\/(?:notifications|outings\/[0-9a-f-]{36})$/;
self.addEventListener('push', event => {
 let data={};try{data=event.data?.json() || {};}catch{}
 const url=typeof data.url==='string' && allowedPath.test(data.url)?data.url:'/notifications';
 const respondable=data.respondable===true && outingPath.test(url);
 event.waitUntil(self.registration.showNotification('LinkLemon',{
  body:typeof data.body==='string'?data.body.slice(0,180):'You have an update in LinkLemon.',
  icon:'/brand/lemon-logo.png',tag:typeof data.tag==='string'?data.tag:'linklemon-update',renotify:false,
  actions:respondable?[{action:'in',title:'I’m in!'},{action:'out',title:'Can’t this time'}]:[],data:{url,respondable}
 }));
});
async function openOuting(path){
 const url=new URL(path,self.location.origin).href;
 const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
 const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
 if(existing){await existing.navigate(url);await existing.focus();}else await clients.openWindow(url);
}
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const data=event.notification.data || {};
 const path=typeof data.url==='string' && allowedPath.test(data.url)?data.url:'/notifications';
 event.waitUntil((async()=>{
  if(data.respondable===true && outingPath.test(path) && ['in','out'].includes(event.action)){
   try{
    const response=await fetch('/api/social',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'respond_outing',payload:{id:path.split('/')[2],going:event.action==='in'}}),signal:AbortSignal.timeout(10000)});
    if(response.ok){
     await self.registration.showNotification('LinkLemon',{body:event.action==='in'?'You’re in!':'Response saved: can’t this time.',icon:'/brand/lemon-logo.png',tag:event.notification.tag, data:{url:path},renotify:false});
     return;
    }
   }catch{}
  }
  await openOuting(path);
 })());
});
