const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('public/sw.js','utf8');
async function run({action='in',ok=true,respondable=true,path='/outings/10000000-0000-4000-8000-000000000001',fail=false}={}){
 const events={},shown=[],opened=[],requests=[];let pending;
 const context={self:{location:{origin:'https://getlinklemon.com'},addEventListener:(name,fn)=>events[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)}},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)},URL,AbortSignal,fetch:async(url,options)=>{requests.push(JSON.parse(options.body));if(fail)throw Error('offline');return {ok};}};
 vm.runInNewContext(code,context);
 events.notificationclick({action,notification:{close(){},tag:'test',data:{url:path,respondable}},waitUntil:p=>pending=p});await pending;
 return {shown,opened,requests,events};
}
(async()=>{
 for(const action of ['in','out']){const r=await run({action});assert.equal(r.requests[0].payload.going,action==='in');assert.equal(r.opened.length,0);assert.equal(r.shown.length,1);}
 for(const opts of [{ok:false},{fail:true},{action:''},{respondable:false}]){const r=await run(opts);assert.equal(r.opened.length,1);assert.equal(r.shown.length,0);}
 const unsafe=await run({path:'https://other.example'});assert.equal(unsafe.requests.length,0);assert.equal(unsafe.opened[0],'https://getlinklemon.com/notifications');
 const r=await run();let pending;r.events.push({data:{json:()=>({url:'/notifications',respondable:true})},waitUntil:p=>pending=p});await pending;assert.equal(r.shown.at(-1)[1].actions.length,0);
 console.log('Quick-reply checks passed: both responses, expired session, offline fallback, normal click, unsupported actions and unsafe URLs.');
})().catch(e=>{console.error(e);process.exit(1)});
