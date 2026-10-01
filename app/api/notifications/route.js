import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const s = createServerSupabase();
    const { data: { user }, error: authError } = await s.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401, headers });
    const { data, error } = await s.rpc('my_pending_group_invites');
    if (error) return NextResponse.json({ error: 'Invitation notifications are not available yet.' }, { status: 503, headers });
    const events = await s.rpc('my_pending_event_invites');
    if (events.error && !['PGRST202', '42883'].includes(events.error.code)) return NextResponse.json({ error: 'Could not load event invitations.' }, { status: 503, headers });
    const notices = await s.from('event_notifications').select('id,event_id,event_title,kind,created_at').eq('user_id',user.id).is('read_at',null).order('created_at',{ascending:false});
    if(notices.error) throw notices.error;
    return NextResponse.json({ eventNotices: notices.data || [], invitations: data || [], eventInvitations: events.data || [] }, { headers });
  } catch { return NextResponse.json({ error: 'Could not load invitations.' }, { status: 503, headers }); }
}