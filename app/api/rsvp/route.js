import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';
import { setEventRsvp } from '../../../lib/event-rsvp';

export async function POST(req) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const event = params.get('event');
    if (!event || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event)) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
    const action = params.get('action');
    if (action && !['join', 'leave'].includes(action)) return NextResponse.json({ error: 'Invalid RSVP action.' }, { status: 400 });
    let attending = action === 'join';
    if (!action) {
      const { data, error } = await supabase.from('rsvps').select('event_id')
        .eq('event_id', event).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      attending = !data;
    }
    await setEventRsvp(supabase, event, user.id, attending);
    if (req.headers.get('accept')?.includes('application/json')) return NextResponse.json({ attending });
    return NextResponse.redirect(new URL('/events/' + event, req.url), 303);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not update your RSVP.' }, { status: 400 });
  }
}