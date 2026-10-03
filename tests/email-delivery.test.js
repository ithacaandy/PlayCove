import test from 'node:test';
import assert from 'node:assert/strict';
import {emailMessage,emailPath,sendEmailJobs} from '../lib/email-message.js';
const job={id:'10000000-0000-4000-8000-000000000001',lease:'fixture',to:'tester@example.com',unsubscribe_token:'a'.repeat(64),source:'social',subject:'Andy is heading out. Who’s in?',body:'Andy is heading out to Stewart Park. Who’s in?',url:'/outings/10000000-0000-4000-8000-000000000002',expires_at:'2030-01-01T00:00:00Z'};
test('emails escape user text and include plain text, safe app links and one-click unsubscribe headers',()=>{
 const m=emailMessage({...job,body:'<script>alert("x")</script>&',subject:'Hello\r\nBcc: x'});
 assert.ok(!m.html.includes('<script>'));assert.ok(m.html.includes('&lt;script&gt;'));
 assert.ok(m.text.includes('Unsubscribe from notification emails: https://getlinklemon.com/email-unsubscribe?token='));
 assert.equal(m.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');assert.ok(!m.subject.includes('\n'));
 assert.ok(m.headers['List-Unsubscribe'].startsWith('<https://getlinklemon.com/api/email/unsubscribe?token='));assert.ok(m.text.includes('Life’s busy, squeeze in some fun.'));assert.equal(m.from,'LinkLemon <notifications@notify.getlinklemon.com>');assert.deepEqual(m.to,['tester@example.com']);
});
test('untrusted destinations, malformed recipient and missing unsubscribe tokens cannot send',()=>{
 for(const url of ['https://evil.example','//evil.example','/outings/../../auth','/invite?token=bad','/notifications?evil=true'])assert.throws(()=>emailPath(url));
 assert.throws(()=>emailMessage({...job,to:'x@example.com\nBcc: y@example.com'}));
 assert.throws(()=>emailMessage({...job,unsubscribe_token:'bad'}));
 assert.equal(emailPath('/invite?token='+'f'.repeat(64)),'/invite?token='+'f'.repeat(64));
});
async function scenario({eligible=true,status=200,expired=false,fail=false,bad=false,deadline=Infinity}={}){
 const sent=[],outcomes=[];
 await sendEmailJobs({jobs:[{...job,...expired?{expires_at:'2000-01-01'}:{},...bad?{url:'//evil.example'}:{}}],key:'fixture',deadline,now:()=>1000000000000,wait:async()=>{},call:async(action,payload)=>action==='eligible'?eligible:outcomes.push(payload.outcome),request:async(url,options)=>{sent.push({url,options});if(fail)throw new Error('Network failure');return {ok:status===200,status,json:async()=>({id:'provider-id'})};}});
 return {sent,outcomes};
}
test('disabled, paused, unsubscribed or expired work is skipped immediately before sending',async()=>{
 for(const opts of [{eligible:false},{expired:true},{bad:true}]){const r=await scenario(opts);assert.equal(r.sent.length,0);assert.deepEqual(r.outcomes,['skipped']);}
});
test('successful submission is recorded and retries use a stable provider idempotency key',async()=>{
 const r=await scenario();assert.deepEqual(r.outcomes,['sent']);assert.equal(r.sent[0].options.headers['Idempotency-Key'],'linklemon-'+job.id);assert.equal(JSON.parse(r.sent[0].options.body).text.includes('Stewart Park'),true);
 assert.equal((await scenario({status:503})).sent[0].options.headers['Idempotency-Key'],r.sent[0].options.headers['Idempotency-Key']);
});
test('provider limits and temporary failures retry; permanent rejections do not',async()=>{
 for(const status of [408,409,429,500,503])assert.deepEqual((await scenario({status})).outcomes,['retry']);
 for(const status of [400,401,403,422])assert.deepEqual((await scenario({status})).outcomes,['skipped']);
 assert.deepEqual((await scenario({fail:true})).outcomes,['retry']);
});
test('dispatch leaves unstarted work for another run when its time budget is exhausted',async()=>{
 const r=await scenario({deadline:1000000000001});assert.equal(r.sent.length,0);assert.deepEqual(r.outcomes,[]);
});

test('outing email shows timing and optional message without repeating the subject',()=>{
 const m=emailMessage({...job,subject:'Andy is heading out to Stewart Park',body:'Fri, Oct 2, 2026 • 4:00 PM–6:00 PM Eastern Time\n\nWe’ll be near the swings!'});
 assert.ok(m.text.includes('4:00 PM–6:00 PM Eastern Time'));assert.ok(m.html.includes('We’ll be near the swings!'));assert.ok(m.html.includes('white-space:pre-line'));assert.ok(m.text.includes('View outing:'));assert.equal(m.text.split('Andy is heading out').length-1,1);
});
