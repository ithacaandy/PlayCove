// app/mine/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from '../components/Avatar';

const supabase = getSupabaseClient();

export default function MyEventsPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [rsvpCounts, setRsvpCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setErr('Supabase is not configured.');
      setLoading(false);
      return;
    }

    let unsub = () => {};

    (async () => {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) setErr(sErr.message);

      const user = sres?.session?.user || null;
      setSessionUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setMyProfile(profile || null);

      await refresh(user.id);

      const { data: sub } = supabase
        .channel('events-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events', filter: `owner_id=eq.${user.id}` },
          () => refresh(user.id)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rsvps' },
          () => refresh(user.id)
        )
        .subscribe();

      unsub = () => sub?.unsubscribe();
      setLoading(false);
    })();

    return () => unsub();
  }, []);

  async function refresh(userId) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url')
      .eq('owner_id', userId)
      .order('date_iso', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(100);

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('events')
        .select('id, title, description, date_iso, start_time, end_time, city, location_name, created_at')
        .eq('owner_id', userId)
        .order('date_iso', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(100);

      if (fallbackError) {
        setErr(fallbackError.message);
        return;
      }

      const safeFallback = (fallbackData || []).map((ev) => ({ ...ev, image_url: null }));
      setEvents(safeFallback);
      await loadRsvpCounts(safeFallback);
      return;
    }

    const safeEvents = data || [];
    setEvents(safeEvents);
    await loadRsvpCounts(safeEvents);
  }

  async function loadRsvpCounts(eventRows) {
    const ids = (eventRows || []).map((e) => e.id);

    if (!ids.length) {
      setRsvpCounts({});
      return;
    }

    const { data: rsvps, error: rErr } = await supabase
      .from('rsvps')
      .select('event_id')
      .in('event_id', ids);

    if (rErr) {
      setErr(rErr.message);
      return;
    }

    const map = {};
    (rsvps || []).forEach((r) => {
      map[r.event_id] = (map[r.event_id] || 0) + 1;
    });

    setRsvpCounts(map);
  }

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  if (!isAuthed && !loading) {
    return (
      <div className="min-h-screen bg-[#D7D2C9] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-black/20 bg-white/50 px-4 py-4 text-sm text-gray-900">
            You’re not signed in. <Link href="/auth" className="underline">Go to sign in</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D7D2C9] px-4 py-5">
      <div className="mx-auto w-full max-w-md pb-24">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="Go to account">
              <Avatar
                name={myProfile?.full_name || sessionUser?.email || ''}
                src={myProfile?.avatar_url || null}
                size="sm"
                bgClassName="bg-[var(--paper)]"
              />
            </Link>
            <h1 className="text-2xl font-semibold text-black">My Events</h1>
          </div>

          <button
            type="button"
            aria-label="Open event filters"
            className="flex flex-col items-end gap-[4px]"
          >
            <span className="block h-[2px] w-6 rounded-full bg-black" />
            <span className="block h-[2px] w-4 rounded-full bg-black" />
            <span className="block h-[2px] w-2 rounded-full bg-black" />
          </button>
        </div>

        {err ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/new"
            className="overflow-hidden rounded-2xl border border-black/40 bg-[#E8E8E8]"
          >
            <div className="flex h-[160px] items-center justify-center bg-[#E8E8E8]">
              <span className="text-[92px] font-light leading-none text-[#7A7A7A]">+</span>
            </div>
            <div className="bg-[#666666] px-3 py-2 text-center text-sm font-semibold text-white">
              Create Event
            </div>
          </Link>

          {loading ? (
            <>
              <EventSkeleton />
              <EventSkeleton />
              <EventSkeleton />
            </>
          ) : events.length === 0 ? (
            <div className="col-span-1 rounded-2xl border border-black/20 bg-white/40 px-4 py-4 text-sm text-black">
              No events yet.
            </div>
          ) : (
            events.map((ev, index) => (
              <EventTile
                key={ev.id}
                event={ev}
                count={rsvpCounts[ev.id] ?? 0}
                accentDot={index === 0 || index === 2}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EventTile({ event, count, accentDot = false }) {
  const month = formatMonth(event?.date_iso);
  const day = formatDay(event?.date_iso);
  const hasImage = !!event?.image_url;

  return (
    <Link
      href={`/events/${event.id}`}
      className="overflow-hidden rounded-2xl border border-black/40 bg-[#E8E8E8]"
    >
      <div
        className="relative h-[160px] bg-[#E8E8E8] bg-cover bg-center"
        style={hasImage ? { backgroundImage: `url(${event.image_url})` } : undefined}
      >
        {hasImage && (
          <div className="absolute inset-0 bg-white/20" />
        )}

        <div className="absolute left-3 top-3 text-[12px] font-medium leading-[1.5] text-[#C95A1E]">
          <div>{count} Going</div>
          <div>2 Maybe</div>
          <div>1 Declined</div>
        </div>

        <div className="absolute right-3 top-3 overflow-hidden border border-black/50 bg-white text-center text-[11px] font-semibold leading-none text-black shadow-sm">
          <div className="px-2 py-1">{month}</div>
          <div className="border-t border-black/70" />
          <div className="px-2 py-1">{day}</div>
        </div>

        {accentDot ? (
          <div className="absolute bottom-3 right-3 h-4 w-4 rounded-full bg-[#DF2338]" />
        ) : null}
      </div>

      <div className="truncate bg-[#666666] px-3 py-2 text-sm font-semibold text-white">
        {event.title}
      </div>
    </Link>
  );
}

function EventSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/20 bg-white/40 animate-pulse">
      <div className="h-[160px] bg-white/30" />
      <div className="h-9 bg-black/10" />
    </div>
  );
}

function formatMonth(d) {
  try {
    return String(new Date(d).getMonth() + 1).padStart(2, '0');
  } catch {
    return '--';
  }
}

function formatDay(d) {
  try {
    return String(new Date(d).getDate()).padStart(2, '0');
  } catch {
    return '--';
  }
}