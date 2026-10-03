import {NextResponse} from 'next/server';
import {createServerSupabase} from '../../../../lib/supabase-server';
import {emailReady} from '../../../../lib/email-delivery';
const headers={'Cache-Control':'private, no-store'};
async function settings(action,payload={}){
 const s=createServerSupabase();const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const {data,error}=await s.rpc('email_settings',{action,payload});
 if(error)return NextResponse.json({error:'Email settings are not available yet.'},{status:503,headers});
 return NextResponse.json({settings:data,deliveryReady:emailReady(),email:user.email},{headers});
}
export async function GET(){try{return await settings('get');}catch{return NextResponse.json({error:'Could not load email settings.'},{status:503,headers});}}
export async function POST(req){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
 try{const raw=await req.text();if(raw.length>1000)throw new Error();const input=JSON.parse(raw);
 if(!['enable','off','pause','resume','heading_out','test'].includes(input.action))throw new Error();
 if(input.action==='test' && !emailReady())return NextResponse.json({error:'Email delivery is not ready yet.'},{status:503,headers});
 if(input.action==='heading_out' && typeof input.enabled!=='boolean')throw new Error();
 if(input.action==='pause'){const until=new Date(input.until);if(!Number.isFinite(until.getTime()) || until.getTime()<=Date.now() || until.getTime()>Date.now()+366*86400000)throw new Error();}
 return await settings(input.action,{until:input.until,enabled:input.enabled});
 }catch{return NextResponse.json({error:'Could not save email settings. Check the selected pause time.'},{status:400,headers});}
}
