import {NextResponse} from 'next/server';
import {createServerSupabase} from '../../../../lib/supabase-server';
import {pushReady} from '../../../../lib/push-delivery';
const headers={'Cache-Control':'private, no-store'};
export async function POST(req){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
 try{
 const s=await createServerSupabase();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const raw=await req.text();if(raw.length>3000)throw new Error('Invalid request.');const input=JSON.parse(raw);
 if(!['status','test'].includes(input.action) || typeof input.endpoint!=='string' || input.endpoint.length>2048)throw new Error('Invalid request.');
 if(input.action==='test' && !pushReady())return NextResponse.json({error:'Delivery is not available yet.'},{status:503,headers});
 const {data,error}=await s.rpc('push_setup',{action:input.action,device_endpoint:input.endpoint});
 if(error)return NextResponse.json({error:input.action==='test'?'Enable this device and clear any pause first. Allow one minute between tests.':'Could not check this device.'},{status:400,headers});
 return NextResponse.json(data,{headers});
 }catch{return NextResponse.json({error:'Could not complete device setup. Please try again.'},{status:400,headers});}
}
