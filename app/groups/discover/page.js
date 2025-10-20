
import { createServerSupabase } from "../../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DiscoverGroupsPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/groups/discover");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, is_discoverable")
    .eq("is_discoverable", true)
    .order("created_at", { ascending: false });

  let mySet = new Set();
  {
    const { data: mems } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    (mems || []).forEach(m => mySet.add(m.group_id));
  }

  // hide groups the user owns
  const list = (groups || []).filter(g => g.owner_id !== user.id);

  return (
    <main>
      <div className="container py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Discover Groups</h1>
          <div className="hidden md:flex gap-2">
            <a href="/groups/new" className="btn btn-ghost">+ New Group</a>
          </div>
        </div>

        <section className="grid gap-3">
          {list.map((g) => {
            const isMember = mySet.has(g.id);
            const isOwner = g.owner_id === user.id;

            return (
              <div key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{g.name}</div>
                    {g.description && (
                      <p className="text-sm text-neutral-600 mt-1 line-clamp-3">{g.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <span className="meta">Owner</span>
                    ) : isMember ? (
                      <span className="meta">Joined</span>
                    ) : (
                      <form action={`/api/groups/request?group=${g.id}`} method="post">
                        <button className="btn btn-primary">Ask to Join</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {(list || []).length === 0 && (
            <div className="card p-6 text-neutral-600">
              No discoverable groups yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
