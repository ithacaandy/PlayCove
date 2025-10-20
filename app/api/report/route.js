import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase-server";

export async function POST(req){
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = new URL(req.url).searchParams.get("event");
  const { error } = await supabase.from("reports").insert({ event_id: event, reporter_id: user.id, reason: "inappropriate" });
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL("/", req.url));
}
