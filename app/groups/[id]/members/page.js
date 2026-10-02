import { ACTIVE_GROUP_STATUSES, canManageGroup, readGroupAccess } from "../../../../lib/group-membership";
import { createServerSupabase } from "../../../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function MembersPage({ params }){
  const groupId = params.id;
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  if(!user) redirect(`/auth?next=/groups/${groupId}/members`);

  const { group, membership } = await readGroupAccess(s, groupId, user.id);
  if (!canManageGroup(group, user.id, membership)) redirect('/groups');
  const isOwner = group.owner_id === user.id;
  const { data: pend, error: pendingError } = await s
    .from("group_members")
    .select("user_id, role, status")
    .eq("group_id", groupId).eq("status", "pending");

  const { data: actv, error: activeError } = await s
    .from("group_members")
    .select("user_id, role, status")
    .eq("group_id", groupId).in("status", ACTIVE_GROUP_STATUSES);

  if (pendingError || activeError) throw new Error("Could not load memberships. Please reload and try again.");

  return (
    <main>
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-xl font-semibold">Manage Members</h1>
          <div className="flex flex-wrap gap-2">
            <a className="btn" href={`/groups/${groupId}/invite`}>Invite</a>
            <a className="btn" href={`/groups/${groupId}`}>Open group</a>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold">Pending requests</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {(pend||[]).map(p => (
              <div key={p.user_id} className="card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.user_id.slice(0,8)}…</div>
                  <div className="text-xs text-gray-500">status: {p.status}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form method="post" action={`/api/groups/members/approve?group=${groupId}&user=${p.user_id}`}>
                    <button className="btn btn-primary">Approve</button>
                  </form>
                  <form method="post" action={`/api/groups/members/reject?group=${groupId}&user=${p.user_id}`}>
                    <button className="btn">Reject</button>
                  </form>
                </div>
              </div>
            ))}
            {(pend||[]).length===0 && <div className="text-sm text-gray-600">No pending requests.</div>}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Active members</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {(actv||[]).map(m => (
              <div key={m.user_id} className="card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.user_id.slice(0,8)}…</div>
                  <div className="text-xs text-gray-500">role: {m.role}</div>
                </div>
                {isOwner && m.user_id !== group.owner_id && <div className="flex flex-wrap gap-2">
                  <form method="post" action={`/api/groups/members/role?group=${groupId}&user=${m.user_id}&role=member`}>
                    <button className="btn">Member</button>
                  </form>
                  <form method="post" action={`/api/groups/members/role?group=${groupId}&user=${m.user_id}&role=admin`}>
                    <button className="btn">Admin</button>
                  </form>
                </div>}
              </div>
            ))}
            {(actv||[]).length===0 && <div className="text-sm text-gray-600">No active members yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
