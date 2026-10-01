import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
export async function POST(req) {
  try {
    const s=createServerSupabase();
    const { data: { user }, error: authError }=await s.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    const fd=await req.formData();
    const eventId=String(fd.get('event_id') || '');
    const email=String(fd.get('email') || '').trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(eventId) || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Choose a valid event and email.' }, { status: 400 });
    const { data: event,error: eventError }=await s.from('events').select('id,owner_id,is_hidden,cancelled_at').eq('id',eventId).maybeSingle();
    if (eventError) throw eventError;
    if (!event || event.cancelled_at || event.is_hidden || event.owner_id!==user.id) return NextResponse.json({ error: 'Only the host of an available event can invite parents.' }, { status: 403 });
    if (email===user.email?.toLowerCase()) return NextResponse.json({ error: 'You are already hosting this event.' }, { status: 400 });
    const { data: existing,error: readError }=await s.from('event_invites').select('token').eq('event_id',eventId).eq('email',email).eq('status','pending').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (readError) return NextResponse.json({ error: 'Event invitations are not available yet.' }, { status: 503 });
    const token=existing?.token || randomBytes(32).toString('hex');
    if (!existing) {
      const { error }=await s.from('event_invites').insert({ event_id:eventId,email,token,invited_by:user.id });
      if (error) throw error;
    }
    return NextResponse.json({ acceptUrl:new URL('/event-invite?token='+token,req.url).toString() });
  } catch (error) { return NextResponse.json({ error:error.message || 'Could not create invitation.' }, { status:400 }); }
}