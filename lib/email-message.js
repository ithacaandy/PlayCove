const origin='https://getlinklemon.com';
const tokenPattern=/^[0-9a-f]{64}$/;
const idPattern=/^[0-9a-f-]{36}$/i;
export function emailPath(path){
 if(path==='/notifications' || path==='/notification-settings')return path;
 if(/^\/(outings|events)\/[0-9a-f-]{36}$/i.test(path))return path;
 if(/^\/(invite|event-invite)\?token=[0-9a-f]{64}$/i.test(path))return path;
 throw new Error('Invalid email destination');
}
export function escapeEmail(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function emailMessage(job){
 if(!idPattern.test(job.id) || !tokenPattern.test(job.unsubscribe_token) || typeof job.to!=='string' || job.to.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(job.to))throw new Error('Invalid email job');
 const subject=String(job.subject || 'A LinkLemon update').replace(/[\r\n]/g,' ').slice(0,180);
 const body=String(job.body || '').slice(0,1000);
 const url=origin+emailPath(job.url);
 const unsubscribe=origin+'/email-unsubscribe?token='+job.unsubscribe_token;
 const action=job.source==='group_invites' || job.source==='event_invites'?'View invitation':job.source==='social'?'View outing':'Open LinkLemon';
 const text=`${subject}\n\n${body}\n\n${action}: ${url}\n\nLife’s busy, squeeze in some fun.\nManage email: ${origin}/notification-settings\nUnsubscribe from notification emails: ${unsubscribe}\nPlease use LinkLemon to respond; this address does not receive replies.`;
 const html=`<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#172026"><table role="presentation" width="100%"><tr><td style="padding:28px 16px"><table role="presentation" style="max-width:560px;width:100%;margin:auto;background:white;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="padding:28px"><img src="${origin}/brand/lemon-logo.png" width="36" height="36" alt="" style="vertical-align:middle"><strong style="margin-left:8px;font-size:22px">LinkLemon</strong><h1 style="font-size:23px;line-height:1.3">${escapeEmail(subject)}</h1><p style="line-height:1.6;white-space:pre-line">${escapeEmail(body)}</p><p style="margin:24px 0"><a href="${escapeEmail(url)}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#ffdb00;color:#172026;font-weight:bold;text-decoration:none">${action}</a></p><p style="color:#667085;font-size:13px">Life’s busy, squeeze in some fun.</p><p style="font-size:12px;line-height:1.7"><a href="${origin}/notification-settings">Manage email preferences</a> · <a href="${unsubscribe}">Unsubscribe</a><br>Please use LinkLemon to respond; this address does not receive replies.</p></td></tr></table></td></tr></table></body></html>`;
 return {from:'LinkLemon <notifications@notify.getlinklemon.com>',to:[job.to],subject,html,text,headers:{'List-Unsubscribe':`<${origin}/api/email/unsubscribe?token=${job.unsubscribe_token}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
}
export async function sendEmailJobs({jobs,call,request=fetch,key,now=Date.now,deadline=Infinity,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 for(const job of jobs){
  if(now()+18000>deadline)break;
  let outcome='retry';
  try{
   if(new Date(job.expires_at).getTime()<=now() || !await call('eligible',{id:job.id,lease:job.lease})){outcome='skipped';continue;}
   let message;try{message=emailMessage(job);}catch{outcome='skipped';continue;}
   const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'linklemon-'+job.id},body:JSON.stringify(message),signal:AbortSignal.timeout(8000)});
   if(response.ok){const data=await response.json();if(typeof data.id==='string')outcome='sent';}
   else if(response.status>=400 && response.status<500 && ![408,409,429].includes(response.status))outcome='skipped';
  }catch{/* Retry transient network failures using the same idempotency key. */}
  finally{await call('finish',{id:job.id,lease:job.lease,outcome});await wait(600);}
 }
}
