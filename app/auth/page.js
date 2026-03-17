// app/auth/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectedFrom = params.get('redirectedFrom') || '/';

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMessage('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        router.replace(redirectedFrom || '/');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const newUserId = data?.user?.id;

      if (newUserId) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: newUserId,
            full_name: null,
            city: null,
            kid_ages: [],
            avatar_url: null,
          },
          { onConflict: 'id' }
        );

        if (profileError) throw profileError;
      }

      setMessage('Account created. Check your email for a confirmation link before signing in.');
      setPassword('');
    } catch (e) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <header className="mx-auto mb-6 flex w-full max-w-md items-center gap-2">
        <div
          style={{ backgroundColor: '#F6C74E' }}
          className="h-8 w-8 rounded-full"
        />
        <span style={{ color: '#1F2937' }} className="text-lg font-semibold">
          PlayCove
        </span>
      </header>

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
  );
}