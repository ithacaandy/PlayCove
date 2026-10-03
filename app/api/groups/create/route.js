import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';

export async function POST(req) {
  const s = await createServerSupabase();
  const { data: { user }, error: authError } = await s.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const fd = await req.formData();
  const name = String(fd.get('name') || '').trim();
  const description = String(fd.get('description') || '').trim();
  if (!name || name.length > 100 || description.length > 2000) {
    return NextResponse.json({ error: 'Use a group name of 1–100 characters and a description of up to 2,000 characters.' }, { status: 400 });
  }
  const discoverable = fd.get('is_discoverable');
  const { data: group, error } = await s.from('groups')
    .insert({ name, description: description || null, is_discoverable: ['true', 'on', '1'].includes(discoverable), owner_id: user.id })
    .select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: membershipError } = await s.from('group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'owner', status: 'active' });
  // The group already exists: return its ID even if the second write fails.
  // Never encourage the user to submit creation again and create a duplicate.
  const warning = membershipError
    ? 'Your group was created, but owner membership setup failed: ' + membershipError.message
    : null;
  if (req.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({ id: group.id, warning }, { status: 201 });
  }
  return NextResponse.redirect(new URL('/groups/' + group.id, req.url), 303);
}