// app/auth/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function AuthPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = useMemo(() => search?.get('next') || '/account', [search]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'info'|'success'|'error', msg: string }

  // If already signed in, bounce to next (default /account)
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace(next);
    })();
  }, [router, next]);

  async function handleSignIn(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus({ type: 'error', msg: 'Supabase is not configured. Check .env.local and restart dev.' });
      return;
    }
    if (!email || !password) {
      setStatus({ type: 'error', msg: 'Enter both email and password.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', msg: 'Signing in…' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ type: 'error', msg: error.message });
    } else if (data?.session) {
      setStatus({ type: 'success', msg: 'Signed in!' });
      // Nudge the Account/BottomNav to reflect new session immediately
      router.replace(next);
    } else {
      setStatus({ type: 'error', msg: 'Unexpected response. Please try again.' });
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-sm px-3 py-10">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-gray-600">Use your email and password.</p>

      {status?.msg ? (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            status.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : status.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
        >
          {status.msg}
        </div>
      ) : null}

      <form onSubmit={handleSignIn} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none ring-0 focus:border-gray-900"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <div className="mt-1 flex items-stretch rounded-md border">
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-l-md px-3 py-2 text-sm outline-none ring-0 focus:border-gray-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="rounded-r-md border-l px-3 text-xs text-gray-600 hover:bg-gray-50"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-400 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 text-right text-xs">
        <Link href="/auth/reset" className="text-gray-600 underline">Forgot password?</Link>
      </div>

      <div className="mt-8 flex items-center gap-3 text-sm">
        <Link href="/" className="underline">Home</Link>
        <Link href="/account" className="underline">Account</Link>
        <Link href="/auth/debug" className="underline">Auth Debug</Link>
      </div>
    </div>
  );
}
