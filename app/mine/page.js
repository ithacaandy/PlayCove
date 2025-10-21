// app/mine/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function MyEventsPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [rsvpCounts, setRsvpCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) { setErr('Supabase is not configured.'); setLoading(false); return; }
    let unsub = () => {};
    (async () => {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) setErr(sErr.message);
      const user = sres?.session?.user || null;
      setSessionUser(user);
      if (!user) { setLoading(false); return; }

      await refresh(user.id);

      const { data: sub } = supabase
        .channel('events-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `owner_id=eq.${user.id}` }, () => refresh(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => refresh(user.id))
        .subscribe();
      unsub = () => sub?.unsubscribe();

      setLoading(false);
    })();

    return () => unsub();
  }, []);

  async function refresh(userId) {
    // 1) load your events
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, date_iso, start_time, end_time, city, location_name, created_at')
      .eq('owner_id', userId)
      .order('date_iso', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(100);
    if (error) { setErr(error.message); return; }
    setEvents(data || []);

    // 2) load RSVP counts for these event ids
    const ids = (data || []).map(e => e.id);
    if (!ids.length) { setRsvpCounts({}); return; }

    const { data: rsvps, error: rErr } = await supabase
      .from('rsvps')
      .select('event_id')
      .in('event_id', ids);
    if (rErr) { setErr(rErr.message); return; }

    const map = {};
    (rsvps || []).forEach(r => {
      map[r.event_id] = (map[r.event_id] || 0) + 1;
    });
    setRsvpCounts(map);
  }

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  if (!isAuthed) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">My Events</h1>
        <p className="mt-3 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Go to /auth</Link>
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton />;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Events</h1>
        <Link href="/new" className="rounded-full border border-yellow-300 bg-yellow-300 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-yellow-400">
          New Event
        </Link>
      </div>

      {err ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="mt-4 text-gray-600">No events yet. Create one!</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {events.map(ev => {
            const count = rsvpCounts[ev.id] ?? 0;
            return (
              <li key={ev.id} className="rounded-lg border hover:shadow-sm transition">
                <Link href={`/events/${ev.id}`} className="block p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="mt-1 text-sm text-gray-700">
                        {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                        {ev.end_time ? `–${formatTime12(ev.end_time)}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ev.location_name}{ev.city ? `, ${ev.city}` : ''}
                      </div>
                      {ev.description ? <div className="mt-2 text-sm text-gray-800 line-clamp-3">{ev.description}</div> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-gray-500">{new Date(ev.created_at).toLocaleDateString()}</div>
                      <div className="mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {count} RSVP{count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="mt-4 h-16 w-full rounded bg-gray-200" />
      <div className="mt-3 h-16 w-full rounded bg-gray-200" />
    </div>
  );
}

// Helpers
function formatDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}
function formatTime12(t) {
  if (!t) return '';
  // Expect "HH:MM:SS" or "HH:MM"
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12; if (h === 0) h = 12;
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm} ${suffix}`;
}
