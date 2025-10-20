import Header from "../components/Header";
import { createServerSupabase } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export default async function Admin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/");

  const { data: flagged } = await supabase
    .from("events")
    .select("*, created_at")
    .order("created_at", { ascending: false });

  return (
    <main>
      {/* @ts-expect-error Async Server Component */}
      <Header />
      <div className="container py-4 space-y-4">
        <h2 className="text-lg font-semibold">Moderation</h2>
        <div className="grid gap-3">
          {(flagged || []).map(e => (
            <div key={e.id} className={`card p-3 ${e.is_hidden ? "opacity-60" : ""}`}>
              <div className="flex justify-between">
                <b>{e.title}</b>
                <span className="text-sm">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-600">{e.location_name} · {e.city}</p>
              <div className="mt-2 flex gap-2">
                <form action={`/api/admin/hide?event=${e.id}`} method="post"><button className="btn">{e.is_hidden ? "Unhide" : "Hide"}</button></form>
                <form action={`/api/admin/delete?event=${e.id}`} method="post"><button className="btn">Delete</button></form>
                <form action={`/api/admin/clear-reports?event=${e.id}`} method="post"><button className="btn">Clear reports</button></form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
