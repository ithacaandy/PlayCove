// app/groups/[id]/edit/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function EditGroupPage() {
  const { id } = useParams();
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState(null);
  const [group, setGroup] = useState(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discoverable, setDiscoverable] = useState(false);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!supabase) { setStatus({ type: 'error', msg: 'Supabase is not configured.' }); setLoading(false); return; }
    let unsub = () => {};
    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setSessionUser(user);

      const { data: g, error } = await supabase
        .from('groups')
        .select('id, name, description, is_discoverable, owner_id, created_at')
        .eq('id', id)
        .single();

      if (error) {
        setStatus({ type: 'error', msg: error.message });
        setLoading(false);
        return;
      }

      setGroup(g);
      setName(g.name || '');
      setDescription(g.description || '');
      setDiscoverable(!!g.is_discoverable);

      // realtime refresh while editing
      const { data: sub } = supabase
        .channel('group-edit')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${id}` }, async () => {
          const { data: g2 } = await supabase.from('groups').select('id, name, description, is_discoverable, owner_id').eq('id', id).single();
          if (g2) {
            setGroup(g2);
            setName(g2.name || '');
            setDescription(g2.description || '');
            setDiscoverable(!!g2.is_discoverable);
          }
        })
        .subscribe();
      unsub = () => sub?.unsubscribe();

      setLoading(false);
    })();
    return () => unsub();
  }, [id]);

  const isOwner = useMemo(
    () => !!sessionUser && !!group && sessionUser.id === group.owner_id,
    [sessionUser, group]
  );

  async function handleSave(e) {
    e.preventDefault();
    if (!isOwner) return;

    if (!name.trim()) {
      setStatus({ type: 'error', msg: 'Group name is required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'info', msg: 'Saving…' });

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_discoverable: !!discoverable,
    };

    const { error } = await supabase.from('groups').update(payload).eq('id', id).eq('owner_id', sessionUser.id);
    if (error) {
      setStatus({ type: 'error', msg: `Update failed: ${error.message}` });
      setSaving(false);
      return;
    }

    setStatus({ type: 'success', msg: 'Saved!' });
    router.replace(`/groups/${id}`);
  }

  async function handleDelete() {
    if (!isOwner || deleting) return;
    const ok = confirm('Delete this group? This cannot be undone.');
    if (!ok) return;

    setDeleting(true);
    setStatus({ type: 'info', msg: 'Deleting group…' });

    // Best-effort cleanup if you don’t have ON DELETE CASCADE
    await Promise.all([
      supabase.from('group_members').delete().eq('group_id', id),
      supabase.from('events').update({ group_id: null }).eq('group_id', id),
    ]);

    const { error } = await supabase.from('groups').delete().eq('id', id).eq('owner_id', sessionUser.id);
    if (error) {
      setStatus({ type: 'error', msg: `Delete failed: ${error.message}` });
      setDeleting(false);
      return;
    }

    router.replace('/groups');
  }

  if (loading) return <Skeleton />;

  if (!group) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">Group not found</h1>
        <Link href="/groups" className="mt-4 inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Back to My Groups</Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">Edit Group</h1>
        <p className="mt-2 text-gray-600">You’re not the owner of this group.</p>
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/groups/${id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Back to group</Link>
          <Link href="/groups" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">My Groups</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Group</h1>
        <div className="flex items-center gap-2">
          <Link href={`/groups/${id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Back</Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete group'}
          </button>
        </div>
      </div>

      {status?.msg ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people about this group…"
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
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link href={`/groups/${id}`} className="ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="mt-4 h-16 w-full rounded bg-gray-200" />
      <div className="mt-3 h-16 w-full rounded bg-gray-200" />
    </div>
  );
}
