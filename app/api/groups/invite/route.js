import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { readGroupAccess, canManageGroup } from '../../../../lib/group-membership';

export async function POST(req) {
  try {
    const s = await createServerSupabase();
    const { data: { user }, error: authError } = await s.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    const fd = await req.formData();
    const group_id = String(fd.get('group_id') || '');
    const email = String(fd.get('email') || '').trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(group_id) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Choose a valid group and email address.' }, { status: 400 });
    const { group, membership } = await readGroupAccess(s, group_id, user.id);
    if (!canManageGroup(group, user.id, membership)) return NextResponse.json({ error: 'Only the group owner or an active admin can invite parents.' }, { status: 403 });
    const token = randomBytes(32).toString('hex');
    const { error } = await s.from('group_invites').insert({ group_id, email, token, invited_by: user.id });
    if (error) throw error;
    return NextResponse.json({ ok: true, acceptUrl: new URL('/api/groups/accept?token=' + token, req.url).toString() });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not create the invitation.' }, { status: error.status || 400 });
  }
}