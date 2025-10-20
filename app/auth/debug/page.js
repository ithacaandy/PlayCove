// app/auth/debug/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

function maskKey(k = '', keep = 6) {
  if (!k) return '';
  return k.length <= keep * 2 ? k : `${k.slice(0, keep)}…${k.slice(-keep)}`;
}

const supabase = getSupabaseClient();

export default function AuthDebugPage() {
  const [origin, setOrigin] = useState('');
  const [env, setEnv] = useState({ url: '', anon: '' });
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
    setEnv({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    });

    if (!supabase) {
      setStatus({ type: 'error', msg: 'Supabase client not configured (check .env.local and restart dev server).' });
      return;
    }

    let unsub = () => {};

    async function init() {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) setStatus({ type: 'error', msg: `getSession error: ${sErr.message}` });
      setSession(sres?.session || null);
      setUser(sres?.session?.user || null);

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
        setSession(sess || null);
        setUser(sess?.user || null);
      });
      unsub = () => sub?.subscription?.unsubscribe();
    }
    init();
    return () => unsub();
  }, []);

  async function refresh() {
    setStatus({ type: 'info', msg: 'Refreshing…' });
    const { data: sres, error } = await supabase.auth.getSession();
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({ type: 'success', msg: 'Refreshed.' });
    setSession(sres?.session || null);
    setUser(sres?.session?.user || null);
  }

  async function signOut() {
    if (!supabase) return;
    setStatus({ type: 'info', msg: 'Signing out…' });
    const { error } = await supabase.auth.signOut();
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({ type: 'success', msg: 'Signed out.' });
  }

  return (
    <div className="mx-auto max-w-screen-md px-3 py-8">
      <h1 className="text-xl font-semibold">Auth Debug</h1>

      {status?.msg ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
          status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' :
          'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <section className="mt-6 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-600">Current origin</span>
          <code className="rounded bg-gray-50 px-2 py-1">{origin || '(unknown)'}</code>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-600">NEXT_PUBLIC_SUPABASE_URL</span>
          <code className="rounded bg-gray-50 px-2 py-1">{env.url || '(unset)'}</code>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
          <code className="rounded bg-gray-50 px-2 py-1">{maskKey(env.anon)}</code>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Refresh session</button>
          <button onClick={signOut} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Sign out</button>
          <Link href="/auth" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Go to /auth</Link>
          <Link href="/account" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Go to /account</Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium">Session JSON</h2>
        <pre className="mt-2 overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(session, null, 2)}</pre>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium">User JSON</h2>
        <pre className="mt-2 overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(user, null, 2)}</pre>
      </section>
    </div>
  );
}
