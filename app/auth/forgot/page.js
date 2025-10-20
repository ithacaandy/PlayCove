// app/auth/forgot/page.js
'use client';
import { useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function ForgotPassword(){
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    setMsg('');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
    });
    setMsg(error ? error.message : 'Check your email for a reset link.');
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-ink mb-6">Reset password</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full mt-1">Send reset link</button>
      </form>
      {msg && <p className="text-sm text-stone mt-3 text-center">{msg}</p>}
    </>
  );
}
