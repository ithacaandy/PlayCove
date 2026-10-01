import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
export async function POST(req) {
  if (req.headers.get('origin')!==new URL(req.url).origin) return NextResponse.json({ error:'Invalid request origin.' },{status:403});
  try {
    const s=createServerSupabase();
    const { data:{user},error:authError }=await s.auth.getUser();
    if(authError || !user) return NextResponse.json({error:'Sign in with the invited email first.'},{status:401});
    const fd=await req.formData();
    const token=String(fd.get('token') || '');
    if(!/^[a-zA-Z0-9]{40,128}$/.test(token)) return NextResponse.json({error:'Invalid invitation link.'},{status:400});
    const {data:eventId,error}=await s.rpc('accept_event_invite',{invite_token:token});
    if(error) return NextResponse.json({error:error.message},{status:error.code==='42501'?403:400});
    return NextResponse.json({eventId});
  } catch { return NextResponse.json({error:'Could not accept this invitation. Please try again.'},{status:500}); }
}