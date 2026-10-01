import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase-server";

import { recurrenceDates, recurrenceFromForm } from "../../../lib/event-recurrence";
import { parseEventInput } from "../../../lib/event-validation";
import { readGroupAccess, isActiveMembership } from "../../../lib/group-membership";

export async function POST(req) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  let payload;
  let dates;
  try {
    payload = parseEventInput(fd, user.id);
    dates = recurrenceDates(payload.date_iso, recurrenceFromForm(fd));
    const cloneId = fd.get("clone_id");
    if (cloneId) {
      const { data: source, error } = await supabase.from("events").select("image_url").eq("id", cloneId).eq("owner_id", user.id).maybeSingle();
      if (error || !source) throw new Error("You can only clone your own events.");
      if (source.image_url) payload.image_url = source.image_url;
    }
    if (payload.group_id) {
      const { group, membership } = await readGroupAccess(supabase, payload.group_id, user.id);
      if (group.owner_id !== user.id && !isActiveMembership(membership)) {
        return NextResponse.json({ error: 'Join this group and wait for approval before hosting an event in it.' }, { status: 403 });
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Invalid event details.' }, { status: e.status || 400 });
  }
  const { data: created, error: insertErr } = await supabase
    .from("events")
    .insert(dates.map((date_iso) => ({ ...payload, date_iso })))
    .select("id, date_iso");

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

  const first = created.find((row) => row.date_iso === dates[0]);
  const file = fd.get("image");
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    try {
      const ext = (file.type?.split("/")?.[1] || "jpg").toLowerCase();
      const path = `events/${first.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from("event-images")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || "image/jpeg" });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
        if (pub?.publicUrl) {
          await supabase.from("events").update({ image_url: pub.publicUrl }).in("id", created.map((row) => row.id));
        }
      }
    } catch (e) { console.error("Upload error:", e); }
  }

  if (req.headers.get("accept")?.includes("application/json")) return NextResponse.json({ id: first.id, count: created.length }, { status: 201 });
  return NextResponse.redirect(new URL("/events/" + first.id, req.url), 303);
}
