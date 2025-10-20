// app/auth/update-password/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function UpdatePasswordPage(){
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);

  async function onSubmit(e){
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Updating password…' });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setStatus({ type: 'error', msg: error.message });
    setStatus({ type: 'success', msg: 'Password updated. Redirecting…' });
    setTimeout(() => router.replace('/auth'), 800);
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-ink mb-6">Set a new password</h1>
      {status?.msg && (
        <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'
        }`}>{status.msg}</div>
      )}
      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full mt-1">Update password</button>
      </form>
    </>
  );
}
