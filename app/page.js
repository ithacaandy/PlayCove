'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import EventCard from './components/EventCard';
import Avatar from './components/Avatar';

const supabase = getSupabaseClient();

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [invites, setInvites] = useState([]);
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

        const [mine, rsvpList, inviteList] = await Promise.all([
          id
            ? supabase
                .from('events')
                .select(
                  'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url'
                )
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

        const myEvRaw = mine.data || [];

        const rsvpEventIds = (rsvpList.data || [])
          .map((r) => r.event_id)
          .filter(Boolean);

        let rsvpEventsRaw = [];

        if (rsvpEventIds.length) {
          const { data: evs } = await supabase
            .from('events')
            .select(
              'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url'
            )
            .in('id', rsvpEventIds);

          rsvpEventsRaw = (evs || []).filter((e) => e.owner_id !== id);
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

        const invitesRaw = inviteList.data || [];
        let groupsById = {};

        if (invitesRaw.length) {
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name, description')
            .in(
              'id',
              invitesRaw.map((i) => i.group_id)
            );

          (groups || []).forEach((g) => {
            groupsById[g.id] = g;
          });
        }

        setInvites(
          invitesRaw.map((i) => ({
            ...i,
            group: groupsById[i.group_id] || null,
          }))
        );

        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasAnything = useMemo(() => {
    return (
      (myEvents?.length || 0) +
        (rsvps?.length || 0) +
        (invites?.length || 0) >
      0
    );
  }, [myEvents, rsvps, invites]);

  return (
    <div className="min-h-screen bg-[var(--stone)] px-4 py-5">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              name={myProfile?.full_name || ''}
              src={myProfile?.avatar_url || null}
              size="sm"
              bgClassName="bg-[var(--paper)]"
            />
            <h1 className="text-2xl font-semibold text-white">Home</h1>
          </div>

          <button type="button" aria-label="Open filters" className="flex flex-col items-end gap-[4px]">
            <span className="block h-[2px] w-6 rounded-full bg-white" />
            <span className="block h-[2px] w-4 rounded-full bg-white" />
            <span className="block h-[2px] w-2 rounded-full bg-white" />
          </button>
        </div>

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
          <div className="mt-5 rounded-md border border-white/20 bg-white/10 px-3 py-3 text-white">
            Please <Link href="/auth" className="underline">sign in</Link> to see your feed.
          </div>
        ) : !hasAnything ? (
          <div className="mt-5 text-white">
            Nothing yet. Create an event from <Link href="/new" className="underline">New</Link> or join a group in{' '}
            <Link href="/discover" className="underline">Discover</Link>.
          </div>
        ) : (
          <>
            {invites.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-semibold text-white">Invitations</h2>
                <ul className="mt-3 grid gap-3">
                  {invites.map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-lg border border-white/20 bg-white/10 p-3 text-white"
                    >
                      <div className="font-medium">
                        {inv.group?.name || 'Group Invitation'}
                      </div>
                      <div className="mt-1 text-sm text-gray-200">
                        Status: {inv.status}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div className="grid grid-cols-2 gap-3">
                {myEvents.map((ev) => (
                  <EventCard key={`host-${ev.id}`} event={ev} status="host" />
                ))}

                {rsvps.map((ev) => (
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