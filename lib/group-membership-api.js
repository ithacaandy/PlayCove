import { NextResponse } from 'next/server';
import { createServerSupabase } from './supabase-server';
import { ACTIVE_GROUP_STATUSES, canManageGroup, readGroupAccess, GroupActionError } from './group-membership';

export async function handleMembershipAction(req, action) {
  const s = createServerSupabase();
  const { data: { user }, error } = await s.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const url = new URL(req.url);
  const groupId = url.searchParams.get('group');
  const target = url.searchParams.get('user');
  const role = url.searchParams.get('role');
  if (!groupId || !target) return NextResponse.json({ error: 'Missing group or member.' }, { status: 400 });
  try {
    const { group, membership } = await readGroupAccess(s, groupId, user.id);
    if (!canManageGroup(group, user.id, membership)) throw new GroupActionError('Only group owners and active admins can manage requests.', 403);
    if (target === group.owner_id) throw new GroupActionError('The group owner cannot be changed here.', 403);
    let query;
    if (action === 'role') {
      if (group.owner_id !== user.id) throw new GroupActionError('Only the owner can change member roles.', 403);
      if (!['member', 'admin'].includes(role)) throw new GroupActionError('Invalid role.');
      query = s.from('group_members').update({ role })
        .eq('group_id', groupId).eq('user_id', target).in('status', ACTIVE_GROUP_STATUSES);
    } else {
      query = s.from('group_members').update({ status: action === 'approve' ? 'active' : 'rejected' })
        .eq('group_id', groupId).eq('user_id', target).eq('status', 'pending');
    }
    const { data, error: updateError } = await query.select('user_id').maybeSingle();
    if (updateError) throw new GroupActionError(updateError.message);
    if (!data) throw new GroupActionError('That request or member is no longer available. Reload and try again.', 409);
    return NextResponse.redirect(new URL('/groups/' + groupId + '/members', req.url), 303);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Could not update membership.' }, { status: e.status || 500 });
  }
}