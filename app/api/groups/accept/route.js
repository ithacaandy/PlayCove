import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase-server";

export async function GET(req){
  const s = createServerSupabase();
  const { data: { user } } = await s.auth.getUser();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if(!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if(!user) {
    const authUrl = new URL(`/auth?next=${encodeURIComponent(url.pathname + url.search)}`, req.url);
    return NextResponse.redirect(authUrl);
  }
  const { data: inv } = await s.from("group_invites").select("*").eq("token", token).maybeSingle();
  if(!inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if(inv.status !== "pending") return NextResponse.json({ error: "Invite not valid" }, { status: 400 });
  if(new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 400 });

  await s.from("group_members").upsert({ group_id: inv.group_id, user_id: user.id, status: "active", role: "member" });
  await s.from("group_invites").update({ status: "accepted" }).eq("id", inv.id);

  return NextResponse.redirect(new URL("/groups", req.url));
}
