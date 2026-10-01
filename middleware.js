// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = new Set([
  '/auth',
  '/auth/',
  '/auth/forgot',
  '/auth/reset',
  '/auth/signup',
  '/auth/callback',
  '/api/signout',
  '/invite',
  '/api/groups/accept',
  '/event-invite',
  '/api/events/accept',
]);

export async function middleware(req) {
  const { nextUrl, headers, cookies: reqCookies } = req;
  // Logout validates origin and manages its own cookies; do not refresh a session before clearing it.
  if (nextUrl.pathname.startsWith('/brand/') || nextUrl.pathname === '/api/signout' || nextUrl.pathname === '/auth/callback' || nextUrl.pathname === '/api/auth/callback') return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return reqCookies.get(name)?.value;
        },
        set(name, value, opts) {
          res.cookies.set({ name, value, ...opts });
        },
        remove(name, opts) {
          res.cookies.set({ name, value: '', ...opts, maxAge: 0 });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = [...PUBLIC_PATHS].some((p) => nextUrl.pathname.startsWith(p));
  const isAsset = nextUrl.pathname.startsWith('/_next') || nextUrl.pathname.startsWith('/public');

  if (!session && !isPublic && !isAsset) {
    const url = new URL('/auth', nextUrl.origin);
    url.searchParams.set('redirectedFrom', nextUrl.pathname || '/');
    return NextResponse.redirect(url);
  }

  if (session && nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', nextUrl.origin));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|public).*)'],
};
