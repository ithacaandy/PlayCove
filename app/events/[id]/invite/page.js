'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
export default function InvitePage() {
  const params = useParams();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acceptUrl, setAcceptUrl] = useState('');
  async function generate(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setAcceptUrl('');
    try {
      const fd = new FormData(); fd.set('event_id', params.id); fd.set('email', email);
      const response = await fetch('/api/events/invite', { method: 'POST', body: fd, signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || !result.acceptUrl) throw new Error(result.error || 'Could not generate an invitation.');
      setAcceptUrl(result.acceptUrl);
    } catch (error) { setError(error.message || 'Could not generate an invitation.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-4 py-6 space-y-4">
    <h1 className="text-lg font-semibold">Invite to Event</h1>
    <form onSubmit={generate} className="grid gap-3">
      <label className="text-sm">Parent’s email<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded border p-3" /></label>
      <button disabled={busy} className="btn btn-primary">{busy ? 'Generating…' : 'Generate invite link'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {acceptUrl && <div role="status" className="rounded border p-3 space-y-2"><p className="text-sm">Share this link with the invited parent. Only that email address can accept it.</p><a href={acceptUrl} className="underline break-all">{acceptUrl}</a></div>}
    <Link href={`/events/${params.id}`} className="underline text-sm">Back to Event</Link>
  </main>;
}