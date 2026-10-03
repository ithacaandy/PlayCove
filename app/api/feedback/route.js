import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';
import { parseFeedback } from '../../../lib/feedback-validation';

export async function POST(req) {
  if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  let input;
  try {
    const body = await req.text();
    if (body.length > 6000) throw new Error('This report is too long.');
    input = parseFeedback(JSON.parse(body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Could not read this report.' : error.message }, { status: 400 });
  }
  const { data, error } = await supabase.from('beta_feedback').insert({ ...input, reporter_id: user.id }).select('id').single();
  if (error) return NextResponse.json({ error: 'Could not save your report. Please try again.' }, { status: 503 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
