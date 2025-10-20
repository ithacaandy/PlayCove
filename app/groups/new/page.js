import Header from "../../components/Header";
import { createServerSupabase } from "../../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function NewGroup(){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  if(!user) redirect("/auth");
  return (
    <main>
      {/* @ts-expect-error Async Server Component */}
      <Header />
      <div className="container py-4 max-w-xl space-y-4">
        <h2 className="text-lg font-semibold">Create a Group</h2>
        <form method="post" action="/api/groups/create" className="grid gap-3">
          <input name="name" className="input" placeholder="Group name" required />
          <textarea name="description" className="input" placeholder="Description (optional)" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="is_discoverable" /> Discoverable (allow join requests)
          </label>
          <button className="btn btn-primary">Create</button>
        </form>
      </div>
    </main>
  );
}
