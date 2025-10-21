'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // { id, email }
  const [myEvents, setMyEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]); // events I RSVP'd to (not owned)
  const [invites, setInvites] = useState([]); // group invites for my email
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) { setErr('Supabase not configured'); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      const id = user?.id || null;
      const email = user?.email || null;
      setMe(id ? { id, email } : null);

      try {
        const [mine, rsvpList, inviteList] = await Promise.all([
          id
            ? supabase
                .from('events')
                .select('id, title, description, date_iso, start_time, end_time, city, location_name, created_at')
                .eq('owner_id', id)
                .order('date_iso', { ascending: true })
            : { data: [], error: null },
          id
            ? supabase
                .from('rsvps')
                .select('event_id')
                .eq('user_id', id)
            : { data: [], error: null },
          email
            ? supabase
                .from('group_invites')
                .select('id, group_id, status, expires_at, created_at')
                .eq('email', email)
                .neq('status', 'accepted')
                .order('created_at', { ascending: false })
            : { data: [], error: null },
        ]);

        const myEv = mine.data || [];
        setMyEvents(myEv);

        // fetch events for rsvps (exclude ones I own to avoid duplicates)
        const rsvpEventIds = (rsvpList.data || []).map(r => r.event_id).filter(Boolean);
        let rsvpEvents = [];
        if (rsvpEventIds.length) {
          const { data: evs } = await supabase
            .from('events')
            .select('id, title, description, date_iso, start_time, end_time, city, location_name, created_at, owner_id')
            .in('id', rsvpEventIds);
          rsvpEvents = (evs || []).filter(e => e.owner_id !== id);
        }
        setRsvps(rsvpEvents);

        // hydrate group names for invites
        const invitesRaw = inviteList.data || [];
        let groupsById = {};
        if (invitesRaw.length) {
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name, description')
            .in('id', invitesRaw.map(i => i.group_id));
          (groups || []).forEach(g => { groupsById[g.id] = g; });
        }
        setInvites(invitesRaw.map(i => ({ ...i, group: groupsById[i.group_id] || null })));
        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasAnything = useMemo(() => {
    return (myEvents?.length || 0) + (rsvps?.length || 0) + (invites?.length || 0) > 0;
  }, [myEvents, rsvps, invites]);

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">PlayCove</h1>
      <p className="mt-2 text-gray-600">Your events, RSVPs, and invites — all in one place.</p>

      {err ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : null}

      {loading ? (
        <div className="mt-5 animate-pulse space-y-3">
          <div className="h-16 rounded bg-gray-200" />
          <div className="h-16 rounded bg-gray-200" />
          <div className="h-16 rounded bg-gray-200" />
        </div>
      ) : !me ? (
        <div className="mt-5 rounded-md border px-3 py-3 text-gray-700">
          Please <Link href="/auth" className="underline">sign in</Link> to see your feed.
        </div>
      ) : !hasAnything ? (
        <div className="mt-5 text-gray-700">
          Nothing yet. Create an event from <Link href="/new" className="underline">New</Link> or join a group in{' '}
          <Link href="/discover" className="underline">Discover</Link>.
        </div>
      ) : (
        <>
          {/* Group Invites */}
          {invites.length > 0 && (
            <section className="mt-6">
              <h2 className="text-base font-semibold">Invitations</h2>
              <ul className="mt-3 grid gap-3">
                {invites.map(inv => (
                  <li key={inv.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {inv.group?.name || 'Group Invitation'}
                        </div>
                        <div className="mt-1 text-sm text-gray-700">
                          Status: {inv.status} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </div>
                        {inv.group?.description ? (
                          <div className="mt-1 text-sm text-gray-600 line-clamp-2">{inv.group.description}</div>
                        ) : null}
                      </div>
                      <Link
                        href={`/groups/${inv.group_id}`}
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        View group
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* My Events */}
          <section className="mt-8">
            <h2 className="text-base font-semibold">My Events</h2>
            {myEvents.length === 0 ? (
              <p className="mt-2 text-gray-600">You haven’t created any events yet.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {myEvents.map(ev => (
                  <li key={ev.id} className="rounded-lg border hover:shadow-sm transition">
                    <Link href={`/events/${ev.id}`} className="block p-3">
                      <div className="font-medium">{ev.title}</div>
                      <div className="mt-1 text-sm text-gray-700">
                        {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                        {ev.end_time ? `–${formatTime12(ev.end_time)}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ev.location_name}{ev.city ? `, ${ev.city}` : ''}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* RSVPs */}
          <section className="mt-8">
            <h2 className="text-base font-semibold">I RSVP’d</h2>
            {rsvps.length === 0 ? (
              <p className="mt-2 text-gray-600">No RSVPs yet.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {rsvps.map(ev => (
                  <li key={ev.id} className="rounded-lg border hover:shadow-sm transition">
                    <Link href={`/events/${ev.id}`} className="block p-3">
                      <div className="font-medium">{ev.title}</div>
                      <div className="mt-1 text-sm text-gray-700">
                        {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                        {ev.end_time ? `–${formatTime12(ev.end_time)}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ev.location_name}{ev.city ? `, ${ev.city}` : ''}
                      </div>
                    </Link>
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
