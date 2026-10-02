
import {createHmac,timingSafeEqual} from 'node:crypto';
export function validBearer(header,secret){if(!secret || typeof header!=='string')return false;const actual=Buffer.from(header),expected=Buffer.from('Bearer '+secret);return actual.length===expected.length && timingSafeEqual(actual,expected);}
export function validDispatchProof(proof,secret,now=Date.now()){
 if(!secret || !Number.isSafeInteger(proof?.timestamp) || Math.abs(Math.floor(now/1000)-proof.timestamp)>120 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(proof?.nonce || '') || !/^[0-9a-f]{64}$/.test(proof?.signature || ''))return false;
 const expected=createHmac('sha256',secret).update(proof.timestamp+':'+proof.nonce+':linklemon-push-dispatch-v1').digest();
 return timingSafeEqual(Buffer.from(proof.signature,'hex'),expected);
}
