import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase-server";

export async function POST(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fd = await req.formData();
  const name = String(fd.get("name")||"").trim();
  const description = String(fd.get("description")||"");
  const is_discoverable = fd.get("is_discoverable") ? true : false;

  const { data: g, error } = await s.from("groups")
    .insert({ name, description, is_discoverable, owner_id: user.id })
    .select("*").single();
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });

  await s.from("group_members").insert({ group_id: g.id, user_id: user.id, role: "owner", status: "active" });
  return NextResponse.redirect(new URL("/groups", req.url));
}
