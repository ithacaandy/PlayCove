import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req){
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user?.id).maybeSingle();
  if(!user || !admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const event = new URL(req.url).searchParams.get("event");
  const { data: row } = await supabase.from("events").select("is_hidden").eq("id", event).single();
  await supabase.from("events").update({ is_hidden: !row?.is_hidden }).eq("id", String(event));
  return NextResponse.redirect(new URL("/admin", req.url));
}
