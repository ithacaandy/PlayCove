
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubscription,notificationPath} from '../lib/push-validation.js';
const keys={p256dh:Buffer.alloc(65,4).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')};
test('only supported HTTPS push providers are accepted',()=>{
 for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.example/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x','https://fcm.googleapis.com/x#secret'])assert.throws(()=>validateSubscription({endpoint,keys}));
 for(const host of ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'])assert.equal(validateSubscription({endpoint:'https://'+host+'/x',keys}).endpoint,'https://'+host+'/x');
});
test('malformed push keys cannot reach the sender',()=>{assert.throws(()=>validateSubscription({endpoint:'https://fcm.googleapis.com/x',keys:{p256dh:'x',auth:'x'}}));});
test('notification links stay within the app',()=>{for(const value of ['https://evil.example','//evil.example','/auth','/notifications?token=secret',null])assert.equal(notificationPath(value),'/notifications');assert.equal(notificationPath('/outings/10000000-0000-4000-8000-000000000001'),'/outings/10000000-0000-4000-8000-000000000001');});
