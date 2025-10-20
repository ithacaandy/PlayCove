// app/auth/signup/page.js
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function SignupPage(){
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);

  async function onSubmit(e){
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Creating account…' });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setStatus({ type: 'error', msg: error.message });
    if (data?.user) {
      setStatus({ type: 'success', msg: 'Account created. Check your email to confirm, then sign in.' });
      router.replace('/auth');
    }
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-ink mb-6">Create account</h1>
      {status?.msg && (
        <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'
        }`}>{status.msg}</div>
      )}
      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full mt-1">Sign up</button>
      </form>
      <p className="text-center text-sm mt-3">Already have an account? <Link href="/auth" className="underline">Sign in</Link></p>
    </>
  );
}
