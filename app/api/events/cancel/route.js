import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
export async function POST(req) {
 try {
  if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const s=createServerSupabase(); const {data:{user}}=await s.auth.getUser();
  if (!user) return NextResponse.json({error:'Please sign in first.'},{status:401});
  const {eventId}=await req.json();
  const {data:event,error}=await s.from('events').select('id,owner_id,cancelled_at').eq('id',eventId).maybeSingle();
  if(error) throw error;
  if(!event || event.owner_id!==user.id) return NextResponse.json({error:'Only the host can cancel this event.'},{status:403});
  if(!event.cancelled_at) {
   const result=await s.from('events').update({cancelled_at:new Date().toISOString()}).eq('id',eventId).eq('owner_id',user.id).is('cancelled_at',null).select('id').maybeSingle();
   if(result.error) throw result.error;
  }
  return NextResponse.json({cancelled:true});
 } catch(error) { return NextResponse.json({error:error.message || 'Could not cancel this event.'},{status:400}); }
}
