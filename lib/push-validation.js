
export function validateSubscription(input) {
 const endpoint=new URL(input?.endpoint);
 const hosts=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
 if(endpoint.protocol!=='https:' || endpoint.port || endpoint.username || endpoint.password || endpoint.hash || !hosts.includes(endpoint.hostname) || endpoint.href.length>2048)throw new Error('Unsupported push service.');
 const keys=input?.keys;
 if(!keys || !/^[A-Za-z0-9_-]{87}=$|^[A-Za-z0-9_-]{87}$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]{22}(==)?$/.test(keys.auth))throw new Error('Invalid subscription keys.');
 if(Buffer.from(keys.p256dh,'base64url').length!==65 || Buffer.from(keys.auth,'base64url').length!==16)throw new Error('Invalid subscription keys.');
 return {endpoint:endpoint.href,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
export function notificationPath(value) {
 return typeof value==='string' && /^\/(?:notifications|outings\/[0-9a-f-]{36})$/.test(value)?value:'/notifications';
}
