import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const wantsJson = req.headers.get('accept')?.includes('application/json');
  const response = wantsJson ? NextResponse.json({ signedOut: true })
    : NextResponse.redirect(new URL('/auth', req.url), 303);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) }, cookies: {
      get(name) { return req.cookies.get(name)?.value; },
      set(name, value, options) { response.cookies.set({ name, value, ...options }); },
      remove(name, options) { response.cookies.set({ name, value: '', ...options, maxAge: 0 }); },
    } }
  );
  let error;
  try {
    ({ error } = await supabase.auth.signOut({ scope: 'local' }));
  } catch {
    return NextResponse.json({ error: 'Sign-out service did not respond. Please try again.' }, { status: 502 });
  }
  if (error) {
    return NextResponse.json({ error: 'Could not sign out. Please try again.' }, { status: 502 });
  }
  return response;
}