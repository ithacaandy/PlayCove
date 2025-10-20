import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase-server";

export async function POST(req){
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = new URL(req.url).searchParams.get("event");
  const { data: row } = await supabase.from("events").select("is_hidden, owner_id").eq("id", event).single();
  if(row?.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await supabase.from("events").update({ is_hidden: !row?.is_hidden }).eq("id", String(event));
  return NextResponse.redirect(new URL("/mine", req.url));
}
