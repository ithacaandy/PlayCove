// app/auth/page.js
'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import LemonMark from '../components/LemonMark';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeReturnPath } from '../../lib/auth-navigation';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function AuthPage() { return <Suspense fallback={<p className="p-6">Loading sign in…</p>}><AuthForm /></Suspense>; }
function AuthForm() {
  const router = useRouter();

  const params = useSearchParams();
  const redirectedFrom = safeReturnPath(params.get('redirectedFrom') || params.get('next'));

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(params.get('error') === 'google' ? 'Google sign-in could not be completed. Please try again.' : '');
  const [message, setMessage] = useState('');

  // Middleware handles existing sessions; avoid stale browser session redirects after logout.

  async function signInWithGoogle() {
    if(busy) return;
    setBusy(true);setErr('');
    try {
      const callback=new URL('/auth/callback',window.location.origin);
      callback.searchParams.set('next',redirectedFrom);
      let timeout;
      try {
        const {data,error}=await Promise.race([
          supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString(),skipBrowserRedirect:true}}),
          new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Sign-in took too long. Reload this page and try again.')),12000);}),
        ]);
        if(error) throw error;
        if(!data?.url) throw new Error('Google sign-in is unavailable. Please try again.');
        window.location.assign(data.url);
      } finally { clearTimeout(timeout); }
    } catch(error) {setErr(error.message || 'Google sign-in is unavailable.');setBusy(false);}
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMessage('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        router.replace(redirectedFrom);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Create the profile through Account after confirmation; do not overwrite existing profiles.
      if (data?.session) {
        router.replace(redirectedFrom);
        router.refresh();
        return;
      }
      setMessage('Check your email for a confirmation link before signing in.');
      setPassword('');
    } catch (e) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-5 sm:p-8 shadow-lg">
        <header className="mx-auto mb-6 flex w-full max-w-md items-center gap-2">
          <LemonMark className="h-9 w-9" />
          <span style={{ color: '#1F2937' }} className="text-lg font-semibold">
            LinkLemon
          </span>
        </header>

        <section className="mb-6 overflow-hidden rounded-xl border border-yellow-100"><Image src="/brand/linklemon-neighborhood-v1.png" alt="Isometric lemon-themed neighborhood park with families meeting and playing" width={1536} height={1024} className="h-32 w-full object-cover" priority /><div className="p-3"><h1 className="font-semibold">Life’s busy, squeeze in some fun.</h1></div></section>
        <button type="button" disabled={busy} onClick={signInWithGoogle} className="mb-5 flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50">Continue with Google</button>
        <p className="mb-4 text-center text-xs text-gray-500">or continue with email</p>
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-black/10 bg-black/5 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErr('');
              setMessage('');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'signin' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErr('');
              setMessage('');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-gray-900">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@family.com"
              className="w-full border-0 border-b border-gray-800/30 bg-transparent px-1 py-2 outline-none ring-yellow-300 focus:border-gray-900 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-gray-900">Password</span>
            <input
              type="password"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="w-full border-0 border-b border-gray-800/30 bg-transparent px-1 py-2 outline-none ring-yellow-300 focus:border-gray-900 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {err && <p className="text-sm text-red-600">{err}</p>}

          {message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="mt-2 text-right text-sm">
            <a className="text-gray-900 underline" href="/auth/forgot">
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}