'use client';
import { localDateIso } from '../../lib/event-validation';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SectionFilters from '../components/SectionFilters';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from '../components/Avatar';

const supabase = getSupabaseClient();
const PAGE_SIZE = 24;
const ACCEPTED_STATUSES = new Set(['accepted', 'active', 'approved', 'member']);

export default function DiscoverPage() {
  const [sectionFilters, setSectionFilters] = useState({type:'all',when:'all'});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [sessionUser, setSessionUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  const [groups, setGroups] = useState([]);
  const [groupOwners, setGroupOwners] = useState({});
  const [memberCounts, setMemberCounts] = useState({});

  const [events, setEvents] = useState([]);
  const [eventCounts, setEventCounts] = useState({});

  const excludeGroupIdsRef = useRef(new Set());

  useEffect(() => {
    if (!supabase) {
      setErr('Supabase is not configured.');
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      const uid = user?.id || null;

      setSessionUser(user);

      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', uid)
          .maybeSingle();

        setMyProfile(profile || null);
      }

      const exclude = new Set();

      if (uid) {
        const [{ data: owned }, { data: mem }] = await Promise.all([
          supabase.from('groups').select('id').eq('owner_id', uid),
          supabase.from('group_members').select('group_id, status').eq('user_id', uid),
        ]);

        (owned || []).forEach((g) => exclude.add(g.id));
        (mem || []).forEach((r) => {
          if (ACCEPTED_STATUSES.has(r.status)) exclude.add(r.group_id);
        });
      }

      excludeGroupIdsRef.current = exclude;

      await Promise.all([fetchGroups(''), fetchEvents('')]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const handle = setTimeout(async () => {
      setLoading(true);
      await Promise.all([fetchGroups(q), fetchEvents(q)]);
      setLoading(false);
    }, 250);

    return () => clearTimeout(handle);
  }, [q]);

  async function fetchGroups(term) {
    let query = supabase
      .from('groups')
      .select('id, name, description, created_at, owner_id, is_discoverable')
      .eq('is_discoverable', true)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (sessionUser?.id) {
      query = query.neq('owner_id', sessionUser.id);
    }

    if (term?.trim()) {
      const t = term.trim();
      query = query.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
    }

    const excludeIds = Array.from(excludeGroupIdsRef.current || []);
    if (excludeIds.length) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      setErr((prev) => prev || error.message);
      setGroups([]);
      setGroupOwners({});
      setMemberCounts({});
      return;
    }

    const rows = data || [];
    setGroups(rows);

    const ownerIds = [...new Set(rows.map((g) => g.owner_id).filter(Boolean))];
    const ownersMap = {};

    if (ownerIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, city, avatar_url')
        .in('id', ownerIds);

      (profs || []).forEach((p) => {
        ownersMap[p.id] = p;
      });
    }

    setGroupOwners(ownersMap);

    if (rows.length) {
      const { data: gm } = await supabase
        .from('group_members')
        .select('group_id, status')
        .in('group_id', rows.map((g) => g.id));

      const counts = {};
      (gm || []).forEach((r) => {
        if (ACCEPTED_STATUSES.has(r.status)) {
          counts[r.group_id] = (counts[r.group_id] || 0) + 1;
        }
      });

      setMemberCounts(counts);
    } else {
      setMemberCounts({});
    }
  }

  async function fetchEvents(term) {
    let query = supabase
      .from('events')
      .select(
        'id, title, description, date_iso, start_time, end_time, city, location_name, owner_id, created_at, visibility, is_hidden, image_url'
      )
      .eq('visibility', 'public')
      .eq('is_hidden', false)
      .is('cancelled_at', null)
      .gte('date_iso', localDateIso())
      .order('date_iso', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(PAGE_SIZE);

    if (term?.trim()) {
      const t = term.trim();
      query = query.or(
        `title.ilike.%${t}%,description.ilike.%${t}%,city.ilike.%${t}%,location_name.ilike.%${t}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      setErr((prev) => prev || error.message);
      setEvents([]);
      setEventCounts({});
      return;
    }

    const rows = data || [];
    setEvents(rows);

    if (rows.length) {
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('event_id')
        .in('event_id', rows.map((e) => e.id));

      const counts = {};
      (rsvps || []).forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });

      setEventCounts(counts);
    } else {
      setEventCounts({});
    }

    setErr(null);
  }

  const cards = useMemo(() => {
    const eventCards = events.map((ev, index) => ({
      type: 'event',
      id: ev.id,
      href: `/events/${ev.id}`,
      title: ev.title,
      image_url: ev.image_url || null,
      date_iso: ev.date_iso,
      countLabel: `${eventCounts[ev.id] ?? 0} going`,
      featured: index === 0 && !!ev.image_url,
      sponsored: index === 0,
      raw: ev,
    }));

    const groupCards = groups.map((g, index) => ({
      type: 'group',
      id: g.id,
      href: `/groups/${g.id}`,
      title: g.name,
      image_url: null,
      countLabel: `${memberCounts[g.id] ?? 0} members`,
      featured: false,
      sponsored: false,
      colorClass:
        index % 3 === 0
          ? 'bg-[#E11D35]'
          : index % 3 === 1
            ? 'bg-[#F4C20D]'
            : 'bg-[#6B7280]',
      raw: g,
    }));

    const merged = [];
    const max = Math.max(eventCards.length, groupCards.length);

    for (let i = 0; i < max; i += 1) {
      if (i === 0 && eventCards[0]) merged.push(eventCards[0]);
      if (groupCards[i]) merged.push(groupCards[i]);
      if (i > 0 && eventCards[i]) merged.push(eventCards[i]);
    }

    const last = new Date(localDateIso() + 'T12:00:00Z');
    last.setUTCDate(last.getUTCDate() + (Number(sectionFilters.when) || 0));
    const until = last.toISOString().slice(0,10);
    return merged.filter((card) => (sectionFilters.type === 'all' || card.type === sectionFilters.type) && (sectionFilters.when === 'all' || card.type === 'group' || card.date_iso < until));
  }, [events, groups, eventCounts, memberCounts, sectionFilters]);

  return (
    <div className="min-h-screen bg-[var(--cream)] px-4 py-5">
      <div className="mx-auto w-full max-w-md pb-24">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="Go to account">
              <Avatar
                name={myProfile?.full_name || sessionUser?.email || ''}
                src={myProfile?.avatar_url || null}
                size="sm"
                bgClassName="bg-[var(--paper)]"
              />
            </Link>
            <h1 className="text-2xl font-semibold text-black">Discover</h1>
          </div>

          <SectionFilters title="Discover" sections={[{key:'type',label:'Show',options:[['all','All'],['event','Events'],['group','Groups']]},{key:'when',label:'Event dates',options:[['all','Any upcoming date'],['7','Next 7 days'],['30','Next 30 days']]}]} values={sectionFilters} onChange={setSectionFilters} light={false} />
        </div>

        <div className="mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events and groups"
            aria-label="Search events and groups"
            className="w-full rounded-2xl border border-black/30 bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {err ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 h-[190px] animate-pulse rounded-2xl bg-white/50" />
            <div className="h-[160px] animate-pulse rounded-2xl bg-white/50" />
            <div className="h-[160px] animate-pulse rounded-2xl bg-white/50" />
            <div className="h-[160px] animate-pulse rounded-2xl bg-white/50" />
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-black/20 bg-white/50 px-4 py-4 text-sm text-black">
            Nothing matches your search yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) =>
              card.type === 'event' ? (
                <DiscoverEventCard key={`event-${card.id}`} card={card} />
              ) : (
                <DiscoverGroupCard
                  key={`group-${card.id}`}
                  card={card}
                  owner={groupOwners[card.raw.owner_id]}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverEventCard({ card }) {
  const month = formatMonth(card.date_iso);
  const day = formatDay(card.date_iso);
  const hasImage = !!card.image_url;

  return (
    <Link
      href={card.href}
      className={`relative overflow-hidden rounded-2xl border border-black/35 bg-[var(--paper)] ${
        card.featured ? 'col-span-2' : ''
      }`}
    >
      <div
        className={`relative w-full bg-cover bg-center ${
          card.featured ? 'h-[165px]' : 'h-[160px]'
        }`}
        style={
          hasImage
            ? { backgroundImage: `url(${card.image_url})` }
            : { backgroundColor: 'var(--paper)' }
        }
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto">
              <span className="inline-flex rounded-full border border-black/20 bg-[#4B5E46] px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                Event
              </span>
            </div>

            <div className="pointer-events-auto flex flex-col items-end gap-2">
              {card.sponsored ? (
                <span className="rounded-full bg-[#F4C20D] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-black shadow-sm">
                  Sponsored
                </span>
              ) : null}

              <div className="rounded-lg border border-black/20 bg-white px-2 py-1 text-right text-[10px] font-semibold leading-tight text-[#D45724] shadow-sm">
                {card.countLabel}
              </div>
            </div>
          </div>

          {!hasImage && (
            <div className="absolute bottom-[10px] left-3 right-[72px]">
              <div className="text-lg font-semibold leading-tight text-[var(--ink)]">
                {card.title}
              </div>
            </div>
          )}

          <div className="flex items-end justify-end">
            {!card.featured ? (
              <div className="relative translate-y-[14px]">
                <div className="rounded border border-black bg-white px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[var(--ink)] shadow">
                  <div>{month}</div>
                  <div className="my-[2px] border-t border-black" />
                  <div>{day}</div>
                </div>
              </div>
            ) : (
              <div className="h-4 w-4 rounded-full bg-[#DF2338]" />
            )}
          </div>
        </div>
      </div>

      <div className="truncate border-t border-black bg-[#666666] px-3 py-2 text-center text-sm font-semibold text-white">
        {card.title}
      </div>
    </Link>
  );
}

function DiscoverGroupCard({ card, owner }) {
  const initials = getInitials(card.title);
  const city = owner?.city || '';

  return (
    <Link
      href={card.href}
      className="relative overflow-hidden rounded-2xl border border-black/35 bg-[var(--paper)]"
    >
      <div className="relative h-[160px] bg-[var(--paper)] p-3">
        <div className="absolute left-3 top-3">
          <span className="inline-flex rounded-full border border-black/20 bg-[#111111] px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
            Group
          </span>
        </div>

        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {card.sponsored ? (
            <span className="rounded-full bg-[#F4C20D] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-black shadow-sm">
              Sponsored
            </span>
          ) : null}

          <div className="rounded-lg border border-black/20 bg-white px-2 py-1 text-right text-[10px] font-semibold leading-tight text-[#D45724] shadow-sm">
            {card.countLabel}
          </div>
        </div>

        <div className="flex h-full flex-col justify-end">
          <div className="mb-2 pr-14 text-[18px] font-bold leading-tight text-[#496144]">
            {card.title}
          </div>

          {city ? (
            <div className="text-xs text-black/70">{city}</div>
          ) : null}
        </div>

        <div
          className={`absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-xl ${card.colorClass}`}
        >
          <span className="text-xl font-bold uppercase text-white">{initials}</span>
        </div>
      </div>

      <div className="truncate border-t border-black bg-[#666666] px-3 py-2 text-center text-sm font-semibold text-white">
        {card.title}
      </div>
    </Link>
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

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'G';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}