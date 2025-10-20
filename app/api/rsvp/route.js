import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase-server";

export async function POST(req){
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = new URL(req.url).searchParams.get("event");
  if(!event) return NextResponse.json({ error: "Missing event" }, { status: 400 });
  const { data: existing } = await supabase.from("rsvps").select("*").eq("event_id", event).eq("user_id", user.id).maybeSingle();
  if(existing){
    await supabase.from("rsvps").delete().eq("event_id", event).eq("user_id", user.id);
  } else {
    const { data: eventRow } = await supabase.from("events").select("capacity, id, is_hidden").eq("id", event).single();
    const { count } = await supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", event);
    if(eventRow?.is_hidden) return NextResponse.json({ error: "Event hidden" }, { status: 400 });
    if((count||0) >= (eventRow?.capacity||0)) return NextResponse.json({ error: "Event full" }, { status: 400 });
    await supabase.from("rsvps").insert({ event_id: event, user_id: user.id });
  }
  return NextResponse.redirect(new URL("/", req.url));
}
