import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase-server";

export async function POST(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const group = new URL(req.url).searchParams.get("group");
  if(!group) return NextResponse.json({ error: "Missing group" }, { status: 400 });

  const { error } = await s.from("group_members").upsert({ group_id: group, user_id: user.id, status: "pending", role: "member" });
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL("/groups", req.url));
}
