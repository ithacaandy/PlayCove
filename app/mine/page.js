// app/mine/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from '../components/Avatar';
import { localDateIso } from '../../lib/event-validation';

const supabase = getSupabaseClient();

export default function MyEventsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTrigger = useRef(null);
  const filterPanel = useRef(null);
  useEffect(() => {
    if (!filtersOpen) return;
    filterPanel.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { setFiltersOpen(false); filterTrigger.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = filterPanel.current?.querySelectorAll('button, input');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === filterPanel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === filterPanel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen]);
  function closeFilters() { setFiltersOpen(false); filterTrigger.current?.focus(); }
  const [filter, setFilter] = useState('all');
  const [archive, setArchive] = useState(false);
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

      const sub = supabase
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
    try {
      const fields = 'id, owner_id, cancelled_at, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url';
      const [hosted, attendance] = await Promise.all([
        supabase.from('events').select(fields).eq('owner_id', userId),
        supabase.from('rsvps').select('event_id').eq('user_id', userId),
      ]);
      if (hosted.error || attendance.error) throw hosted.error || attendance.error;
      const ids = [...new Set((attendance.data || []).map((row) => row.event_id))];
      const joined = ids.length ? await supabase.from('events').select(fields).in('id', ids) : { data: [] };
      if (joined.error) throw joined.error;
      const merged = new Map();
      for (const event of [...(hosted.data || []), ...(joined.data || [])]) {
        merged.set(event.id, { ...event, participation: event.owner_id === userId ? 'hosting' : 'going' });
      }
      const rows = [...merged.values()];
      setEvents(rows);
      setErr(null);
      await loadRsvpCounts(rows.filter((event) => event.participation === 'hosting'));
    } catch (error) {
      setErr(error.message || 'Could not load your events. Please try again.');
    }
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

  const displayedEvents = events.filter((event) => (!!event.cancelled_at || event.date_iso < localDateIso()) === archive && (filter === 'all' || event.participation === filter)).sort((a, b) => archive ? b.date_iso.localeCompare(a.date_iso) : a.date_iso.localeCompare(b.date_iso));
  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  if (!isAuthed && !loading) {
    return (
      <div className="min-h-screen bg-[var(--cream)] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-black/20 bg-white/50 px-4 py-4 text-sm text-gray-900">
            You’re not signed in. <Link href="/auth" className="underline">Go to sign in</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] px-4 py-5">
      <div className="mx-auto w-full max-w-md">
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
            ref={filterTrigger}
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            className="relative flex h-10 w-10 flex-col items-end justify-center gap-[4px] rounded-lg p-2 hover:bg-white/40"
          >
            {(filter !== 'all' || archive) && <span aria-hidden="true" className="absolute right-0 top-0 h-2 w-2 rounded-full bg-blue-600" />}
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

        <div className="mb-4 flex items-center justify-between text-sm">
          <p className="text-gray-700">{filter === 'hosting' ? 'Hosting' : filter === 'going' ? 'Going' : 'All events'} · {archive ? 'Archived' : 'Upcoming'}</p>
          {(filter !== 'all' || archive) && <button type="button" onClick={() => { setFilter('all'); setArchive(false); }} className="underline underline-offset-4">Reset</button>}
        </div>
        {filtersOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 sm:items-center" onClick={(event) => { if (event.target === event.currentTarget) closeFilters(); }}>
          <section ref={filterPanel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="event-filters-title" className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 shadow-xl outline-none sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 id="event-filters-title" className="text-lg font-semibold">Filter events</h2><button type="button" onClick={closeFilters} className="rounded-md border px-3 py-2">Close</button></div>
            <fieldset className="mb-5"><legend className="mb-2 text-sm font-medium">Events</legend><div className="flex flex-wrap gap-2">
              {[['all','All'],['hosting','Hosting'],['going','Going']].map(([value,label]) => <label key={value} className={`cursor-pointer rounded-full border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 px-4 py-2 text-sm ${filter === value ? 'border-black bg-black text-white' : 'bg-white text-black'}`}><input type="radio" name="event-participation" value={value} checked={filter === value} onChange={() => setFilter(value)} className="sr-only" />{label}</label>)}
            </div></fieldset>
            <fieldset><legend className="mb-2 text-sm font-medium">When</legend><div className="flex gap-2">
              {[[false,'Upcoming'],[true,'Archived']].map(([value,label]) => <label key={label} className={`cursor-pointer rounded-full border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 px-4 py-2 text-sm ${archive === value ? 'border-black bg-black text-white' : 'bg-white text-black'}`}><input type="radio" name="event-time" checked={archive === value} onChange={() => setArchive(value)} className="sr-only" />{label}</label>)}
            </div></fieldset>
            <button type="button" onClick={closeFilters} className="mt-6 w-full rounded-xl bg-yellow-300 px-4 py-3 font-medium">Show events</button>
          </section>
        </div>}
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
          ) : displayedEvents.length === 0 ? (
            <div className="col-span-1 rounded-2xl border border-black/20 bg-white/40 px-4 py-4 text-sm text-black">
              {`No ${archive ? 'archived' : 'upcoming'} events${filter === 'hosting' ? ' you’re hosting' : filter === 'going' ? ' you’re going to' : ''}.`}
            </div>
          ) : (
            displayedEvents.map((ev, index) => (
              <EventTile
                key={ev.id}
                event={ev}
                count={rsvpCounts[ev.id] ?? 0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EventTile({ event, count }) {
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
          <div className="mb-1 inline-block rounded-full bg-white/90 px-2 py-1 text-black">{event.cancelled_at ? 'Cancelled' : event.participation === 'hosting' ? 'Hosting' : 'Going'}</div>
          {event.participation === 'hosting' && <div>{count} Going</div>}

        </div>

        <div className="absolute right-3 top-3 overflow-hidden border border-black/50 bg-white text-center text-[11px] font-semibold leading-none text-black shadow-sm">
          <div className="px-2 py-1">{month}</div>
          <div className="border-t border-black/70" />
          <div className="px-2 py-1">{day}</div>
        </div>


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
    return String(new Date(d + 'T12:00:00').getMonth() + 1).padStart(2, '0');
  } catch {
    return '--';
  }
}

function formatDay(d) {
  try {
    return String(new Date(d + 'T12:00:00').getDate()).padStart(2, '0');
  } catch {
    return '--';
  }
}