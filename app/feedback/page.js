'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { feedbackPagePath } from '../../lib/feedback-validation';

export default function FeedbackPage() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><FeedbackForm /></Suspense>;
}
function FeedbackForm() {
  const params = useSearchParams();
  const page = feedbackPagePath(params.get('from'));
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, page_path: page }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your report.');
      setSaved(true); setMessage('');
    } catch (err) { setError(err.name === 'AbortError' ? 'Saving took too long. Please try again.' : err.message); }
    finally { clearTimeout(timer); setBusy(false); }
  }
  return <main className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-6">
    <h1 className="text-2xl font-bold">Report a problem</h1>
    {saved ? <div className="space-y-4"><p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">Thanks! Your feedback has been saved for review.</p>
      <Link href={page === '/feedback' ? '/' : page} className="block rounded-xl bg-yellow-300 px-4 py-3 text-center font-semibold">Return to the app</Link></div>
      : <form onSubmit={submit} className="space-y-5">
        <p className="text-gray-600">Tell us what happened, what you expected, and how we can reproduce it. Ideas are welcome too.</p>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block space-y-2">Feedback type<select value={category} onChange={e => setCategory(e.target.value)} className="block w-full rounded-xl border p-3">
            <option value="bug">Something isn’t working</option><option value="idea">An idea or suggestion</option><option value="other">Something else</option>
          </select></label>
          <label className="block space-y-2">What would you like us to know?<textarea required minLength={10} maxLength={2000} rows={6} value={message} onChange={e => setMessage(e.target.value)} className="block w-full rounded-xl border p-3" aria-describedby="feedback-help" /></label>
          <p id="feedback-help" className="text-sm text-gray-600">Please leave out passwords, invitation links, and private information about children. Your account and the page you came from will be attached to help us investigate.</p>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
          <button className="w-full rounded-xl bg-yellow-300 px-4 py-3 font-semibold disabled:opacity-60">{busy ? 'Saving…' : 'Send feedback'}</button>
        </fieldset>
      </form>}
  </main>;
}
