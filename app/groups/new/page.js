'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function NewGroupPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setSessionUser(data?.session?.user || null);
      } catch (e) {
        if (mounted) setStatus({ type: 'error', msg: e.message || 'Could not load your session.' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sessionUser || saving || createdId) return;
    if (!name.trim()) {
      setStatus({ type: 'error', msg: 'Group name is required.' });
      return;
    }
    setSaving(true);
    setStatus({ type: 'info', msg: 'Creating group…' });
    try {
      const fd = new FormData();
      fd.set('name', name.trim());
      fd.set('description', description.trim());
      fd.set('is_discoverable', String(discoverable));
      const response = await fetch('/api/groups/create', {
        method: 'POST', headers: { Accept: 'application/json' }, body: fd,
      });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || 'Could not create your group.');
      setCreatedId(result.id);
      if (result.warning) {
        setStatus({ type: 'error', msg: result.warning });
        return;
      }
      window.location.href = '/groups/' + result.id;
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Could not create your group. Check My Groups before retrying.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="p-4">Loading…</p>;

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold">New Group</h1>
      {status?.msg ? (
        <p role={status.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-lg border p-3 text-sm ${status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'bg-white'}`}>
          {status.msg}
        </p>
      ) : null}
      {!sessionUser ? (
        <p className="mt-4">Please <Link href="/auth" className="underline">sign in</Link> to create a group.</p>
      ) : createdId ? (
        <Link href={'/groups/' + createdId} className="mt-4 inline-block rounded-lg border px-4 py-2">Open your created group</Link>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <fieldset disabled={saving} className="grid gap-4">
            <label className="grid gap-1 text-sm">
              Name
              <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
                className="rounded-lg border px-3 py-2" placeholder="Ithaca Play Pals" />
            </label>
            <label className="grid gap-1 text-sm">
              Description
              <textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border px-3 py-2" placeholder="Short intro about your group…" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} />
              Make group discoverable
            </label>
            <p className="text-xs text-gray-600">Discoverable groups appear in Discover. Parents can request to join, and you approve requests.</p>
            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-yellow-300 px-4 py-2 text-sm">
                {saving ? 'Creating…' : 'Create group'}
              </button>
              <Link href="/groups" className="rounded-lg border px-4 py-2 text-sm">Cancel</Link>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}