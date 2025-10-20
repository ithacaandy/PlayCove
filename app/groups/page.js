
// app/groups/page.js — v4.8.2
import { createServerSupabase } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function GroupsPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/groups");

  const { data: mine } = await supabase
    .from("group_members")
    .select("role, groups:groups(id, name, description, owner_id)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const list = mine || [];

  return (
    <main>
      <div className="container py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Groups</h1>
          <div className="hidden md:flex gap-2">
            <a href="/groups/new" className="btn btn-ghost">+ New Group</a>
            <a href="/groups/discover" className="btn btn-ghost">Discover</a>
          </div>
        </div>

        <section className="grid gap-3">
          {list.map((m) => (
            <div key={m.groups.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{m.groups.name}</div>
                  {m.groups.description && (
                    <p className="text-sm text-neutral-600 mt-1 line-clamp-3">{m.groups.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {m.groups.owner_id === user.id && (
                    <>
                      <a className="btn btn-ghost" href={`/groups/${m.groups.id}/members`}>Manage</a>
                      <a className="btn btn-ghost" href={`/groups/${m.groups.id}/invite`}>Invite</a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {(list || []).length === 0 && (
            <div className="card p-6 text-neutral-600">
              You’re not in any groups yet.{" "}
              <a className="underline" href="/groups/discover">Discover groups</a> or{" "}
              <a className="underline" href="/groups/new">create one</a>.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
