import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {sendEmailJobs} from './email-message';
export function emailReady(){return process.env.LINKLEMON_EMAIL_DELIVERY_ENABLED==='true' && !!process.env.RESEND_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;}
export async function deliverPendingEmail(){
 if(!emailReady())return;
 const deadline=Date.now()+45000;
 const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(Math.max(1,Math.min(5000,deadline-Date.now())))})}});
 const call=async(action,payload)=>{const {data,error}=await s.rpc('email_work',{action,payload});if(error)throw new Error('Email queue unavailable');return data;};
 const jobs=await call('claim',{});
 await sendEmailJobs({jobs,call,deadline,key:process.env.RESEND_API_KEY});
}
