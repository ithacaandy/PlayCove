import { createServerSupabase } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function New() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: myGroups } = await supabase
    .from("group_members")
    .select("group_id, groups!inner(id,name)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return (
    <main>
      <div className="container py-4 space-y-4">
        <h2 className="text-lg font-semibold">Post a Playdate</h2>
        <form className="grid gap-3" action="/api/create" method="post" encType="multipart/form-data">
          <select name="group_id" className="input" required defaultValue="">
            <option value="" disabled>Choose a group</option>
            {(myGroups || []).map(m => (
              <option key={m.groups.id} value={m.groups.id}>{m.groups.name}</option>
            ))}
          </select>
          <div className="grid md:grid-cols-3 gap-2">
          </div>
          <div className="grid md:grid-cols-3 gap-2">
          </div>
          <div>
            <label className="label">Cover image (optional)</label>
          </div>
          <button className="btn btn-primary">Post</button>
        </form>
      </div>
    </main>
  );
}
