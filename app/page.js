import { createServerSupabase } from "../lib/supabase-server";
import { redirect } from "next/navigation";
import FabNewPost from "./components/FabNewPost";

export default async function Page({ searchParams }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/");

  // get my groups (still used to scope events)
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups!inner(id,name)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const myGroups = (memberships || []).map(m => ({ id: m.groups.id, name: m.groups.name }));
  const groupParam = searchParams?.group || "";

  // events query (include groups.owner_id so we can detect ownership)
  let q = supabase
    .from("events")
    .select("*, groups:groups(name, owner_id)")
    .order("date_iso", { ascending: true })
    .gte("date_iso", new Date().toISOString().slice(0,10));

  if (myGroups.length) {
    const ids = myGroups.map(g => g.id);
    if (groupParam && ids.includes(groupParam)) q = q.eq("group_id", groupParam);
    else q = q.in("group_id", ids);
  } else {
    // show none if user isn’t in any groups
    q = q.eq("group_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: events } = await q;
  const list = (events || []).filter(e => !e.is_hidden);

  // which events I RSVP’d
  let mySet = new Set();
  if (user && list.length) {
    const ids = list.map(e => e.id);
    const { data: mine } = await supabase
      .from("rsvps").select("event_id")
      .in("event_id", ids)
      .eq("user_id", user.id);
    (mine || []).forEach(r => mySet.add(r.event_id));
  }

  // quick RSVP counts
  let countMap = new Map();
  if (list.length) {
    const ids = list.map(e => e.id);
    const { data: all } = await supabase
      .from("rsvps").select("event_id")
      .in("event_id", ids);
    (all || []).forEach(r => countMap.set(r.event_id, (countMap.get(r.event_id) || 0) + 1));
  }

  return (
    <main>
      <div className="container py-4 space-y-4">
        {/* Page title */}
        <h1 className="text-xl font-semibold">Upcoming Playtime!</h1>

        {/* Events */}
        <div className="grid md:grid-cols-2 gap-4">
          {list.map(e => {
            const rsvps = countMap.get(e.id) || 0;
            const canSeeContact = user && mySet.has(e.id);
            const isOwner = e.owner_id === user.id || e.groups?.owner_id === user.id;

            return (
              <div key={e.id} className="card overflow-hidden">
                {e.image_url && (
                  <img
                    src={e.image_url}
                    alt={e.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-neutral-500">
                      {e.date_iso} {e.start_time}
                    </div>
                    <div className="font-medium mt-0.5">{e.title}</div>
                    <div className="text-xs text-neutral-500">
                      Group: {e.groups?.name || "—"}
                    </div>
                  </div>
                  {e.map_url && (
                    <a className="btn btn-ghost" href={e.map_url} target="_blank" rel="noreferrer">
                      Map
                    </a>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <div className="text-sm text-neutral-700">
                    {e.location_name} · {e.city}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {rsvps} / {e.capacity} going
                  </div>
                  {e.description && <p className="mt-2 text-sm">{e.description}</p>}
                  {e.contact && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Contact: {canSeeContact ? e.contact : (user ? "RSVP to view" : "Sign in & RSVP to view")}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2 text-sm">
                    {isOwner ? (
                      <a className="btn btn-ghost" href={`/edit/${e.id}`}>Edit</a>
                    ) : (
                      <form action={`/api/rsvp?event=${e.id}`} method="post">
                        <button className="btn btn-ghost">RSVP</button>
                      </form>
                    )}
                    {!isOwner && (
                      <form action={`/api/report?event=${e.id}`} method="post">
                        <button className="btn btn-ghost">Report</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {list.length === 0 && (
            <div className="card p-6 text-center text-neutral-600">
              No upcoming playdates yet. <a className="underline" href="/new">Post one</a>!
            </div>
          )}
        </div>
      </div>

      {/* FAB for mobile */}
      {/* @ts-expect-error Async Server Component */}
      <FabNewPost />
    </main>
  );
}
