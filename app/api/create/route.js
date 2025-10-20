import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase-server";

export async function POST(req) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const payload = {
    group_id: String(fd.get("group_id")),
    owner_id: user.id,
    title: String(fd.get("title")||""),
    description: String(fd.get("description")||""),
    date_iso: String(fd.get("date_iso")),
    start_time: String(fd.get("start_time")),
    end_time: fd.get("end_time") ? String(fd.get("end_time")) : null,
    location_name: String(fd.get("location_name")),
    city: String(fd.get("city")),
    map_url: String(fd.get("map_url")||""),
    age_min: Number(fd.get("age_min")||0),
    age_max: Number(fd.get("age_max")||16),
    capacity: Number(fd.get("capacity")||6),
    contact: String(fd.get("contact")||"")
  };

  const { data: created, error: insertErr } = await supabase
    .from("events")
    .insert(payload)
    .select("*")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

  const file = fd.get("image");
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    try {
      const ext = (file.type?.split("/")?.[1] || "jpg").toLowerCase();
      const path = `events/${created.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from("event-images")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || "image/jpeg" });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
        if (pub?.publicUrl) {
          await supabase.from("events").update({ image_url: pub.publicUrl }).eq("id", created.id);
        }
      }
    } catch (e) { console.error("Upload error:", e); }
  }

  return NextResponse.redirect(new URL("/mine", req.url));
}
