'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BetaWelcome from './BetaWelcome';
import { betaRequest, missionStatus } from '../../lib/beta-missions';

export default function BetaProgram({ userId, standalone = false }) {
  const router = useRouter();
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState('easy');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    const version = ++revision.current;
    const controller = new AbortController();
    setProgress(null); setError(''); setSaved(false); setMessage('');
    async function load(importLocal = false) {
      try {
        let data = await betaRequest('status', {}, controller.signal);
        if (importLocal && data.welcome.step === 0 && !data.welcome.completedAt) {
          try {
            const local = JSON.parse(localStorage.getItem('linklemon-beta-welcome:' + data.userId) || 'null');
            if (Number.isInteger(local?.step) && local.step > 0 && local.step <= 4) data = await betaRequest('welcome_import', { step: local.step }, controller.signal);
          } catch { /* Server progress remains authoritative; a failed import can be retried. */ }
        }
        if (version === revision.current) { setProgress(data); setError(''); }
      } catch (e) { if (e.name !== 'AbortError' && version === revision.current) setError(e.message); }
    }
    load(true);
    const focus = () => { if (document.visibilityState !== 'hidden') load(); };
    window.addEventListener('focus', focus);
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 60000);
    return () => { revision.current++; controller.abort(); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [userId]);
  async function act(action, payload = {}) {
    if (busy) return false;
    const version = revision.current;
    setBusy(true); setError('');
    try {
      const data = await betaRequest(action, payload);
      if (version !== revision.current) return false;
      setProgress(data);
      return true;
    } catch (e) { if (version === revision.current) setError(e.message); return false; }
    finally { if (version === revision.current) setBusy(false); }
  }
  if (!progress) return error ? <section className="mb-5 rounded-2xl border bg-white p-4"><p role="alert" className="text-sm text-red-700">{error}</p><button onClick={() => window.location.reload()} className="mt-2 underline">Reload beta progress</button></section> : standalone ? <p className="p-4" role="status">Loading beta setup…</p> : null;
  if (!progress.welcome.completedAt) return <BetaWelcome userId={userId} standalone={standalone} progress={progress.welcome} onAction={act} saving={busy} progressError={error} />;
  const mission = progress.mission;
  if (!mission) return null;
  async function start() { if (await act('start')) router.push('/heading-out'); }
  async function feedback(event) { event.preventDefault(); if (await act('feedback', { rating, message })) { setSaved(true); setMessage(''); } }
  return <section aria-labelledby="beta-mission-title" className="mb-5 rounded-2xl border border-yellow-200 bg-white p-5">
    <p className="text-xs font-semibold uppercase text-gray-500">Beta mission · {missionStatus(mission)}</p>
    <h2 id="beta-mission-title" className="mt-2 text-xl font-semibold">Let your group know you’re heading out</h2>
    <p className="mt-3 text-sm">Choose a real plan, share a Heading out outing with a group, and ask someone in that group to respond. Either response counts. We’ll track the saved actions automatically.</p>
    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm"><li>Create an outing and share it with a group.</li><li>Ask a group member to open the invitation and respond.</li></ol>
    <p className="mt-3 text-xs text-gray-500">Your welcome completion, mission progress, and feedback are saved to your account for the beta team to review. No click-by-click tracking.</p>
    {mission.completedAt ? <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-green-900">Mission completed. Thanks for testing the whole flow!</p> : <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} onClick={start} className="rounded-xl bg-yellow-300 px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Saving…' : mission.startedAt ? 'Create another outing' : 'Start mission'}</button><button disabled={busy} onClick={() => act('defer')} className="text-sm underline">Save for later</button></div>}
    {mission.outing && !mission.outing.cancelled && !mission.outing.ended && <Link href={'/outings/' + mission.outing.id} className="mt-3 block text-sm underline">View your shared outing</Link>}
    {!mission.completedAt && <button disabled={busy} onClick={() => act('status')} className="mt-3 block text-sm underline">Check mission progress</button>}
    {mission.outing && !mission.completedAt && (mission.outing.cancelled || mission.outing.ended) && <p className="mt-3 text-sm">That outing ended or was cancelled before a group response. Try again with a new plan when you’re ready.</p>}
    <Link href="/groups" className="mt-3 block text-sm underline">Find or create a group</Link>
    <form onSubmit={feedback} className="mt-5 space-y-3 border-t pt-4"><h3 className="font-semibold">How did it go?</h3><label className="block text-sm">Your experience<select disabled={busy} value={rating} onChange={e => { setRating(e.target.value); setSaved(false); }} className="mt-1 block w-full rounded-xl border p-2"><option value="easy">Easy to use</option><option value="confusing">Something was confusing or slow</option><option value="blocked">I couldn’t finish</option></select></label><label className="block text-sm">Anything we should improve? (optional)<textarea disabled={busy} maxLength={2000} rows={3} value={message} onChange={e => { setMessage(e.target.value); setSaved(false); }} className="mt-1 block w-full rounded-xl border p-2" /></label><p className="text-xs text-gray-500">Leave out passwords, invitation links, and private information about children.</p><button disabled={busy} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Send mission feedback</button>{saved && <p role="status" className="text-sm text-green-800">Thanks—your feedback is saved.</p>}</form>
    <Link href="/feedback?from=/heading-out" className="mt-3 block text-sm underline">Report a problem</Link>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
