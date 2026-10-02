
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
test('push displays private generic content and click cannot navigate off-site',async()=>{
 const handlers={},shown=[],opened=[];const context={URL,self:{location:{origin:'https://getlinklemon.com'},addEventListener:(event,handler)=>handlers[event]=handler,registration:{showNotification:async(...args)=>shown.push(args)}},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),context);
 let pending;handlers.push({data:{json:()=>({title:'Forged sender',body:'New update',url:'https://evil.example',tag:'stable'})},waitUntil:p=>pending=p});await pending;
 assert.equal(shown[0][0],'LinkLemon');assert.equal(shown[0][1].data.url,'/notifications');assert.equal(shown[0][1].renotify,false);
 handlers.notificationclick({notification:{close(){},data:{url:'//evil.example'}},waitUntil:p=>pending=p});await pending;assert.deepEqual(opened,['https://getlinklemon.com/notifications']);
});
