
import 'server-only';
import webpush from 'web-push';
import {createClient} from '@supabase/supabase-js';
import {sendClaimedJobs} from './push-send';
export function pushReady(){return process.env.LINKLEMON_PUSH_DELIVERY_ENABLED==='true' && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT && !!process.env.SUPABASE_SERVICE_ROLE_KEY;}
export async function deliverPendingPush(actor=null) {
 if(!pushReady())return;
 const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}});
 const call=async(action,payload)=>{const {data,error}=await s.rpc('push_work',{action,payload});if(error)throw new Error('Push queue unavailable');return data;};
 const jobs=await call('claim',{actor});
 await sendClaimedJobs({jobs,call,send:webpush.sendNotification,vapid:{subject:process.env.VAPID_SUBJECT,publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY}});
}

export async function consumeDispatchNonce(nonce){
 const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}});
 const {data,error}=await s.rpc('consume_push_dispatch_nonce',{nonce_value:nonce});if(error)throw new Error('Dispatch authorization unavailable');return data===true;
}
