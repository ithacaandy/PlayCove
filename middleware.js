// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkBetaAccess } from './lib/beta-access';

const PUBLIC_PATHS = new Set([
  '/auth',
  '/auth/',
  '/auth/forgot',
  '/auth/reset',
  '/auth/update-password',
  '/auth/signup',
  '/auth/callback',
  '/beta-access',
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

  const { data: { user } } = await supabase.auth.getUser();
  const withCookies = (response) => {
    for (const cookie of res.cookies.getAll()) response.cookies.set(cookie);
    return response;
  };
  const isPasswordReset = ['/auth/reset', '/auth/update-password'].includes(nextUrl.pathname);
  if (user && !isPasswordReset && process.env.LINKLEMON_BETA_GATE_ENABLED === 'true' && nextUrl.pathname !== '/beta-access') {
    const access = await checkBetaAccess(supabase, true);
    if (!access.allowed) {
      if (nextUrl.pathname.startsWith('/api/')) {
        return withCookies(NextResponse.json(
          { error: access.unavailable ? 'Beta access could not be checked. Please try again.' : 'This account does not have beta access.' },
          { status: access.unavailable ? 503 : 403 }
        ));
      }
      return withCookies(NextResponse.redirect(new URL('/beta-access', nextUrl.origin)));
    }
  }

  const isPublic = PUBLIC_PATHS.has(nextUrl.pathname);
  const isAsset = nextUrl.pathname.startsWith('/_next') || nextUrl.pathname.startsWith('/public');

  if (!user && !isPublic && !isAsset) {
    const url = new URL('/auth', nextUrl.origin);
    url.searchParams.set('redirectedFrom', nextUrl.pathname || '/');
    return withCookies(NextResponse.redirect(url));
  }

  if (user && !isPasswordReset && nextUrl.pathname.startsWith('/auth')) {
    return withCookies(NextResponse.redirect(new URL('/', nextUrl.origin)));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|public).*)'],
};
