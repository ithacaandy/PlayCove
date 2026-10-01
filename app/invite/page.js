'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AccountAvatar from '../components/AccountAvatar';
import { getSupabaseClient } from '../../lib/supabaseClient';
const supabase = getSupabaseClient();
function Invitation() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [wrongAccount, setWrongAccount] = useState(false);
  const [accepted, setAccepted] = useState(null);
  const valid = /^[a-zA-Z0-9]{40,128}$/.test(token);
  const returnPath = '/invite?token=' + encodeURIComponent(token);
  const signInPath = '/auth?next=' + encodeURIComponent(returnPath);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error && !['AuthSessionMissingError'].includes(error.name)) setError('Could not check your account. Please reload this page.');
      setUser(data?.user || null);
    }).catch(() => { if (mounted) setError('Could not check your account. Please reload this page.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  async function switchAccount() {
    if (busy || switching) return;
    setSwitching(true); setError('');
    try {
      const response = await fetch('/api/signout', { method: 'POST', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || !result.signedOut) throw new Error(result.error || 'Could not switch accounts.');
      setUser(null);
      router.replace(signInPath);
      router.refresh();
    } catch (error) { setError(error.message || 'Could not switch accounts. Please try again.'); setSwitching(false); }
  }
  async function accept() {
    if (busy || switching || accepted || !valid || !user || wrongAccount) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData(); fd.set('token', token);
      const response = await fetch('/api/groups/accept', { method: 'POST', body: fd, signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.status === 401) setUser(null);
      if (response.status === 403) setWrongAccount(true);
      if (!response.ok || !result.groupId) throw new Error(response.status === 403
        ? 'This account cannot accept this invitation. Switch to the email address that received it. If that is already your account, ask the group owner to check the invitation.'
        : result.error || 'Could not accept this invitation.');
      setAccepted(result.groupId);
      router.push('/groups/' + result.groupId);
    } catch (error) { setError(error.message || 'Could not accept this invitation.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-4 py-6 pb-24 space-y-4">
    <div className="flex items-center gap-3"><AccountAvatar /><h1 className="text-xl font-semibold">Group invitation</h1></div>
    <p className="text-sm">This invitation is for one email address. Use the account that received the link.</p>
    {!valid && <p role="alert">This invitation link is invalid.</p>}
    {loading ? <p role="status">Checking your account…</p> : user ? <div className="rounded-lg border bg-white p-4 space-y-2">
      <p className="text-sm text-gray-600">Signed in as</p><p className="font-medium break-all">{user.email}</p>
      <button onClick={switchAccount} disabled={busy || switching} className="underline text-sm disabled:opacity-50">{switching ? 'Switching accounts…' : 'Use a different account'}</button>
    </div> : <p className="text-sm">You’re signed out. Sign in or create an account with the invited email to continue.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {accepted ? <Link href={'/groups/' + accepted} className="underline">Open your group</Link> : !loading && user && valid && !wrongAccount ? <div className="space-y-2">
      <button onClick={accept} disabled={busy || switching} className="btn btn-primary">{busy ? 'Accepting…' : 'Accept with this account'}</button>
      <p className="text-xs text-gray-600">We’ll verify that this account matches the invitation before joining you to the group.</p>
    </div> : !loading && !user && valid ? <Link href={signInPath} className="btn btn-primary inline-flex">Sign in to continue</Link> : null}
  </main>;
}
export default function InvitationPage() { return <Suspense fallback={<p className="p-4">Loading invitation…</p>}><Invitation /></Suspense>; }