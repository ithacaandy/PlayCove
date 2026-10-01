export const ACTIVE_GROUP_STATUSES = ['active', 'accepted', 'approved', 'member'];

export class GroupActionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function isActiveMembership(membership) {
  return ACTIVE_GROUP_STATUSES.includes(membership?.status);
}

export function canManageGroup(group, userId, membership) {
  if (!userId || !group) return false;
  return group.owner_id === userId ||
    (isActiveMembership(membership) && membership.role === 'admin');
}

export async function readGroupAccess(supabase, groupId, userId) {
  const { data: group, error: groupError } = await supabase.from('groups')
    .select('id, owner_id, is_discoverable').eq('id', groupId).maybeSingle();
  if (groupError) throw new GroupActionError(groupError.message);
  if (!group) throw new GroupActionError('Group not found or unavailable.', 404);
  const { data: membership, error } = await supabase.from('group_members')
    .select('role, status').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  if (error) throw new GroupActionError(error.message);
  return { group, membership };
}

export async function requestGroupMembership(supabase, groupId, userId) {
  const { group, membership } = await readGroupAccess(supabase, groupId, userId);
  if (group.owner_id === userId || isActiveMembership(membership)) return { status: 'active' };
  if (membership?.status === 'pending') return { status: 'pending' };
  if (!group.is_discoverable) throw new GroupActionError('This group requires an invitation.', 403);
  if (membership && membership.status !== 'rejected') {
    throw new GroupActionError('Please contact the group owner about your membership.', 409);
  }
  const payload = { group_id: groupId, user_id: userId, role: 'member', status: 'pending' };
  const query = membership
    ? supabase.from('group_members').update({ status: 'pending', role: 'member' })
      .eq('group_id', groupId).eq('user_id', userId).eq('status', 'rejected')
    : supabase.from('group_members').insert(payload);
  const { error } = await query.select('status').single();
  if (error) throw new GroupActionError(error.code === '23505'
    ? 'A membership request already exists. Reload the group to see its status.'
    : error.message, error.code === '23505' ? 409 : 400);
  return { status: 'pending' };
}