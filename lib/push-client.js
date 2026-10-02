
function bytes(value){const normalized=value.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(normalized),c=>c.charCodeAt(0));}
export async function enableDevicePush(){
 if(!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))throw new Error('This browser does not support device alerts. On iPhone or iPad, add LinkLemon to your Home Screen first, then open it there.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error(permission==='denied'?'Alerts are blocked in your browser settings. You can still use your inbox.':'Alerts were not enabled. You can try again whenever you like.');
 const response=await fetch('/api/push/vapid',{cache:'no-store',signal:AbortSignal.timeout(15000)});const key=await response.json();if(!response.ok)throw new Error('Push setup is temporarily unavailable.');
 await navigator.serviceWorker.register('/sw.js',{scope:'/'});
 const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Device setup took too long. Please try again.')),15000))]);
 let subscription=await registration.pushManager.getSubscription();
 if(subscription && subscription.options.applicationServerKey && Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',')!==Array.from(bytes(key.publicKey)).join(',')){await subscription.unsubscribe();subscription=null;}
 subscription=subscription || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key.publicKey)});
 const saved=await fetch('/api/push/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON()),signal:AbortSignal.timeout(15000)});const data=await saved.json();if(!saved.ok)throw new Error(data.error || 'Could not save this device.');
 return data.settings;
}

export async function currentDeviceEndpoint(){
 if(!('serviceWorker' in navigator))return null;
 const registration=await navigator.serviceWorker.getRegistration('/');
 return (await registration?.pushManager?.getSubscription())?.endpoint || null;
}
export async function deviceSetup(action){
 const endpoint=await currentDeviceEndpoint();if(!endpoint){if(action==='status')return {registered:false};throw new Error('Enable alerts on this device first.');}
 const response=await fetch('/api/push/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,endpoint}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
}
