export async function social(action,payload,signal) {
 const writing=payload!==undefined;
 const response=await fetch('/api/social'+(writing?'':'?action='+encodeURIComponent(action)),writing?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:signal || AbortSignal.timeout(15000)}:{cache:'no-store',signal:signal || AbortSignal.timeout(15000)});
 const result=await response.json(); if(!response.ok) throw new Error(result.error || 'Please try again.');
 if(writing) window.dispatchEvent(new Event('notifications-changed'));
 return result.data;
}
export function outingTime(value) {return new Date(value).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
