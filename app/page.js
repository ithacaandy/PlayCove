'use client';
import { localDateIso } from '../lib/event-validation';

import Link from 'next/link';
import { useNotifications } from './components/NotificationProvider';
import SectionFilters from './components/SectionFilters';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import EventCard from './components/EventCard';
import OutingList from './components/OutingList';
import Avatar from './components/Avatar';
import LemonMark from './components/LemonMark';
import BetaWelcome from './components/BetaWelcome';

const supabase = getSupabaseClient();

export default function HomePage() {
  const { items: notifications } = useNotifications();
  const [sectionFilters, setSectionFilters] = useState({participation:'all'});
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setErr('Supabase not configured');
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      const id = user?.id || null;
      const email = user?.email || null;

      setMe(id ? { id, email } : null);

      try {
        let myProfileData = null;

        if (id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', id)
            .maybeSingle();

          myProfileData = profile || null;
        }

        setMyProfile(myProfileData);

        const [mine, rsvpList] = await Promise.all([
          id
            ? supabase
                .from('events')
                .select(
                  'id, owner_id, cancelled_at, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url'
                )
                .eq('owner_id', id)
                .gte('date_iso', localDateIso())
                .order('date_iso', { ascending: true })
            : { data: [], error: null },

          id
            ? supabase
                .from('rsvps')
                .select('event_id')
                .eq('user_id', id)
            : { data: [], error: null },

        ]);

        const myEvRaw = mine.data || [];

        const rsvpEventIds = (rsvpList.data || [])
          .map((r) => r.event_id)
          .filter(Boolean);

        let rsvpEventsRaw = [];

        if (rsvpEventIds.length) {
          const { data: evs } = await supabase
            .from('events')
            .select(
              'id, owner_id, cancelled_at, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url'
            )
            .in('id', rsvpEventIds);

          rsvpEventsRaw = (evs || []).filter((e) => e.owner_id !== id && e.date_iso >= localDateIso());
        }

        const allOwnerIds = Array.from(
          new Set(
            [...myEvRaw, ...rsvpEventsRaw]
              .map((ev) => ev.owner_id)
              .filter(Boolean)
          )
        );

        let ownersById = {};

        if (allOwnerIds.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', allOwnerIds);

          (profiles || []).forEach((profile) => {
            ownersById[profile.id] = profile;
          });
        }

        const myEv = myEvRaw.map((ev) => ({
          ...ev,
          owner: ownersById[ev.owner_id] || {
            full_name: '',
            avatar_url: null,
          },
        }));

        const rsvpEvents = rsvpEventsRaw.map((ev) => ({
          ...ev,
          owner: ownersById[ev.owner_id] || {
            full_name: '',
            avatar_url: null,
          },
        }));

        setMyEvents(myEv);
        setRsvps(rsvpEvents);

        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleHosted = sectionFilters.participation === 'going' ? [] : myEvents;
  const visibleGoing = sectionFilters.participation === 'hosting' ? [] : rsvps;
  const hasAnything = useMemo(() => {
    return (
      (visibleHosted?.length || 0) +
        (visibleGoing?.length || 0) >
      0
    );
  }, [visibleHosted, visibleGoing]);

  return (
    <div className="min-h-screen bg-[var(--cream)] px-4 py-5">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="Go to account" className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            <Avatar
              name={myProfile?.full_name || ''}
              src={myProfile?.avatar_url || null}
              size="sm"
              bgClassName="bg-[var(--paper)]"
            />
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--ink)]"><LemonMark className="h-8 w-8"/>Home</h1>
          </div>

          <SectionFilters title="Home" sections={[{key:'participation',label:'Your plans',options:[['all','All'],['hosting','Hosting'],['going','Going']]}]} values={sectionFilters} onChange={setSectionFilters} light={false} />
        </div>

        <nav aria-label="Your hub" className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/notifications" className="rounded-2xl border bg-white p-4"><span className="flex items-center justify-between gap-2 font-semibold">Inbox{notifications.length > 0 && <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-xs">{notifications.length}</span>}</span><span className="mt-1 block text-sm text-gray-600">Invitations and updates</span></Link>
          <Link href="/connections" className="rounded-2xl border bg-white p-4"><span className="block font-semibold">Connections</span><span className="mt-1 block text-sm text-gray-600">Your circle and requests</span></Link>
        </nav>
        <Link href="/notification-settings" className="mb-5 block text-sm text-gray-600 underline">Availability and notification settings</Link>
        {me && <BetaWelcome userId={me.id} />}
        {me && <OutingList />}
        <h2 className="mb-3 font-semibold">Your upcoming events</h2>
        {err && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-5 space-y-3 animate-pulse">
            <div className="h-40 rounded-2xl bg-white/20" />
            <div className="h-40 rounded-2xl bg-white/20" />
          </div>
        ) : !me ? (
          <div className="mt-5 rounded-md border border-white/20 bg-white/10 px-3 py-3 text-[var(--ink)]">
            Please <Link href="/auth" className="underline">sign in</Link> to see your feed.
          </div>
        ) : !hasAnything ? (
          <div className="mt-5 text-[var(--ink)]">
            No upcoming events match this view. <Link href="/new" className="underline">Create an event</Link> or find something to join in{' '}
            <Link href="/discover" className="underline">Discover</Link>.
          </div>
        ) : (
          <>
            <section>
              <div className="grid grid-cols-2 gap-3">
                {visibleHosted.map((ev) => (
                  <EventCard key={`host-${ev.id}`} event={ev} status="host" />
                ))}

                {visibleGoing.map((ev) => (
                  <EventCard key={`rsvp-${ev.id}`} event={ev} status="going" />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}