import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../../lib/supabase-server";

export async function POST(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  const url = new URL(req.url);
  const group = url.searchParams.get("group");
  const target = url.searchParams.get("user");
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!group || !target) return NextResponse.json({ error: "Missing group/user" }, { status: 400 });

  const { error } = await s.from("group_members")
    .update({ status: "rejected" })
    .eq("group_id", group).eq("user_id", target);
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(new URL(`/groups/${group}/members`, req.url));
}
