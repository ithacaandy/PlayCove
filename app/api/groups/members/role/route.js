import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../../lib/supabase-server";

export async function POST(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  const url = new URL(req.url);
  const group = url.searchParams.get("group");
  const target = url.searchParams.get("user");
  const role = url.searchParams.get("role");
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!group || !target || !role) return NextResponse.json({ error: "Missing group/user/role" }, { status: 400 });
  if(!["member","admin"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { error } = await s.from("group_members")
    .update({ role })
    .eq("group_id", group).eq("user_id", target).eq("status", "active");
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(new URL(`/groups/${group}/members`, req.url));
}
