import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';
import { parseBetaAction } from '../../../lib/beta-missions';
const headers = { 'Cache-Control': 'private, no-store' };
async function run(action, payload) {
  try {
    const client = await createServerSupabase();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401, headers });
    const { data, error } = await client.rpc('beta_mission_action', { action, payload });
    if (error) return NextResponse.json({ error: error.code === 'P0001' ? error.message : error.code === '42501' ? 'Beta access is required.' : 'Beta progress is temporarily unavailable. Please try again.' }, { status: error.code === '42501' ? 403 : error.code === 'P0001' ? 409 : 503, headers });
    return NextResponse.json({ ...data, userId: user.id }, { headers });
  } catch { return NextResponse.json({ error: 'Beta progress is temporarily unavailable. Please try again.' }, { status: 503, headers }); }
}
export async function GET() { return run('status', {}); }
export async function POST(req) {
  if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error: 'Invalid request.' }, { status: 403, headers });
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 6000) throw new Error('This request is too long.');
    input = parseBetaAction(JSON.parse(raw));
  } catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid request.' : error.message }, { status: 400, headers }); }
  return run(input.action, input.payload);
}
