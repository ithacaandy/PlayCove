'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function GroupDetailsPage() {
  const { id } = useParams(); // group id
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [group, setGroup] = useState(null);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwner = useMemo(() => me?.id && group?.owner_id === me.id, [me, group]);

  useEffect(() => {
    if (!supabase) { setErr('Supabase not configured'); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setMe(user ? { id: user.id, email: user.email } : null);

      try {
        const [{ data: g }, { data: evs }, { data: mems }] = await Promise.all([
          supabase.from('groups').select('id, name, description, owner_id, created_at, is_discoverable').eq('id', id).single(),
          supabase
            .from('events')
            .select('id, title, owner_id, date_iso, start_time')
            .eq('group_id', id)
            .order('date_iso', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('group_members')
            .select('user_id, role, status')
            .eq('group_id', id),
        ]);

        if (!g) { setErr('Group not found'); setLoading(false); return; }
        setGroup(g);

        // member profiles
        const accepted = (mems || []).filter(m => ['member', 'admin', 'owner', 'accepted', 'active'].includes(m.status));
        let profilesMap = {};
        if (accepted.length) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name, city').in('id', accepted.map(m => m.user_id));
          (profs || []).forEach(p => { profilesMap[p.id] = p; });
        }
        setMembers(accepted.map(m => ({ ...m, profile: profilesMap[m.user_id] || null })));

        setEvents(evs || []);
        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="py-6">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="h-20 rounded bg-gray-200" />
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{group.name}</h1>
              {group.description ? (
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{group.description}</p>
              ) : null}
              <p className="mt-2 text-sm text-gray-500">
                Created {new Date(group.created_at).toLocaleDateString()}
                {group.is_discoverable ? ' • Discoverable' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Link href={`/groups/${group.id}/edit`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
                    Edit
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this group? This cannot be undone.')) return;
                      await fetch('/api/admin/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resource: 'group', id: group.id })
                      });
                      router.push('/groups');
                    }}
                    className="rounded-md border px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Group events (compact) */}
          <section className="mt-8">
            <h2 className="text-base font-semibold">Events</h2>
            {events.length === 0 ? (
              <p className="mt-2 text-gray-600">No events yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {events.map(ev => (
                  <li key={ev.id} className="rounded-lg border hover:shadow-sm transition">
                    <Link href={`/events/${ev.id}`} className="block p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (
              <div className="mt-3">
                <Link href="/events/[id]/edit" as={`/groups/${group.id}/edit`} className="hidden" />
                <Link href="/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">New Event</Link>
              </div>
            )}
          </section>

          {/* Members */}
          <section className="mt-10">
            <h2 className="text-base font-semibold">Members</h2>
            {members.length === 0 ? (
              <p className="mt-2 text-gray-600">No members yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {members.map(m => (
                  <li key={m.user_id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{m.profile?.full_name || m.user_id}</div>
                        {m.profile?.city ? <div className="text-gray-600">{m.profile.city}</div> : null}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">{m.role}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatDate(d) { try { return new Date(d).toLocaleDateString(); } catch { return d; } }
function formatTime12(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':'); let h = parseInt(hStr, 10); const m = parseInt(mStr || '0', 10);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.'; h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}
