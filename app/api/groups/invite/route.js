import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase-server";
function randomToken(len=40){ const chars = "abcdefghijklmnopqrstuvwxyz0123456789"; let s=""; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }

export async function POST(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fd = await req.formData();
  const group_id = String(fd.get("group_id")||"");
  const email = String(fd.get("email")||"").toLowerCase().trim();
  if(!group_id || !email) return NextResponse.json({ error: "Missing group_id/email" }, { status: 400 });

  const token = randomToken();
  const { data, error } = await s.from("group_invites")
    .insert({ group_id, email, token, invited_by: user.id })
    .select("token").single();
  if(error) return NextResponse.json({ error: error.message }, { status: 400 });

  const acceptUrl = new URL(`/api/groups/accept?token=${data.token}`, req.url).toString();
  return NextResponse.json({ ok: true, acceptUrl });
}
