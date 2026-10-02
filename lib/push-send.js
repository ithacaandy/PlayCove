import {validateSubscription,notificationPath} from './push-validation.js';

export async function sendClaimedJobs({jobs,call,send,vapid,now=Date.now}) {
 for(let offset=0;offset<jobs.length;offset+=10)await Promise.all(jobs.slice(offset,offset+10).map(async job=>{
  let outcome='retry';
  try {
   if(!await call('eligible',{id:job.id,lease:job.lease})){outcome='skipped';return;}
   const subscription=validateSubscription(job.subscription);
   const ttl=Math.min(60,Math.floor((new Date(job.expires_at).getTime()-now())/1000));
   if(ttl<=0){outcome='skipped';return;}
   await send(subscription,JSON.stringify({title:'LinkLemon',body:job.body,url:notificationPath(job.url),tag:job.tag}),{vapidDetails:vapid,TTL:ttl,timeout:3000,urgency:job.urgent?'high':'normal',topic:job.tag.replace(/-/g,'').slice(0,32)});
   outcome='sent';
  }catch(error){if(error.statusCode===404 || error.statusCode===410)outcome='expired';else if(error.statusCode===400 || error.message?.includes('subscription') || error.message?.includes('push service'))outcome='skipped';}
  finally{try{await call('finish',{id:job.id,lease:job.lease,outcome});}catch{console.warn('Push delivery acknowledgement deferred');}}
 }));
}
