import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
export async function POST(req) {
 try {
  if(req.headers.get('origin')!==new URL(req.url).origin) return NextResponse.json({error:'Invalid request.'},{status:403});
  const s=createServerSupabase();const {data:{user}}=await s.auth.getUser();
  if(!user) return NextResponse.json({error:'Please sign in first.'},{status:401});
  const {id}=await req.json();
  const {data,error}=await s.from('event_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
  if(error) throw error;
  if(!data) return NextResponse.json({error:'Notification unavailable.'},{status:404});
  return NextResponse.json({read:true});
 } catch(error) {return NextResponse.json({error:error.message || 'Could not mark notification read.'},{status:400});}
}
