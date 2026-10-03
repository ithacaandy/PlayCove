
import {NextResponse} from 'next/server';
import {createServerSupabase} from '../../../../lib/supabase-server';
import {validateSubscription} from '../../../../lib/push-validation';
import {pushReady} from '../../../../lib/push-delivery';
export async function POST(req){
 const headers={'Cache-Control':'private, no-store'};
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
 try{
  const s=await createServerSupabase();const {data:{user},error:authError}=await s.auth.getUser();if(authError || !user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
  const availability=await s.rpc('push_available');
  if(!pushReady() || availability.error || availability.data!==true)return NextResponse.json({error:'Push alerts are not available yet.'},{status:503,headers});
  const text=await req.text();if(text.length>4000)throw new Error();
  const subscription=validateSubscription(JSON.parse(text));
  const {data,error}=await s.rpc('push_device',{action:'register',payload:subscription});
  if(error)return NextResponse.json({error:'Could not save this device. Please try again.'},{status:503,headers});
  return NextResponse.json({settings:data},{headers});
 }catch{return NextResponse.json({error:'This browser’s push subscription could not be saved.'},{status:400,headers});}
}
