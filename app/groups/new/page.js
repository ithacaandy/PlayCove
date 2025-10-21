// app/groups/new/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function NewGroupPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) { setStatus({ type: 'error', msg: 'Supabase is not configured.' }); return; }
    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      setSessionUser(sres?.session?.user || null);
    })();
  }, []);

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAuthed) return;
    if (!name.trim()) {
      setStatus({ type: 'error', msg: 'Group name is required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'info', msg: 'Creating group…' });

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      owner_id: sessionUser.id,
      is_discoverable: !!discoverable,
      // created_at defaults server-side
    };

    const { data, error } = await supabase.from('groups').insert(payload).select('id').single();
    if (error) {
      setStatus({ type: 'error', msg: `Could not create group: ${error.message}` });
      setSaving(false);
      return;
    }

    setStatus({ type: 'success', msg: 'Group created!' });
    window.location.href = `/groups/${data.id}`; // jump to edit page
  }

  if (!isAuthed) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">New Group</h1>
        <p className="mt-3 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Go to /auth</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">New Group</h1>

      {status?.msg ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ithaca Play Pals"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short intro about your group…"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={discoverable}
            onChange={(e) => setDiscoverable(e.target.checked)}
          />
          Make group discoverable
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create group'}
          </button>
          <Link href="/groups" className="ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
