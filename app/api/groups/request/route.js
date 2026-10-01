import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { requestGroupMembership } from '../../../../lib/group-membership';

export async function POST(req) {
  const s = createServerSupabase();
  const { data: { user }, error } = await s.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const group = new URL(req.url).searchParams.get('group');
  if (!group) return NextResponse.json({ error: 'Missing group.' }, { status: 400 });
  try {
    const result = await requestGroupMembership(s, group, user.id);
    if (req.headers.get('accept')?.includes('application/json')) return NextResponse.json(result);
    return NextResponse.redirect(new URL('/groups/' + group, req.url), 303);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Could not request membership.' }, { status: e.status || 500 });
  }
}