'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();
const PAGE_SIZE = 12;
const ACCEPTED_STATUSES = new Set(['accepted', 'active', 'approved', 'member']);

export default function DiscoverPage() {
  const [q, setQ] = useState('');        // name/description search
  const [loc, setLoc] = useState('');    // city/state search
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // groups
  const [groups, setGroups] = useState([]);
  const [groupOwners, setGroupOwners] = useState({}); // {owner_id: {id, full_name, city}}
  const [memberCounts, setMemberCounts] = useState({});
  const [gPage, setGPage] = useState(0);
  const [gTotal, setGTotal] = useState(null);

  // events
  const [events, setEvents] = useState([]); // discoverable events

  // current user
  const [userId, setUserId] = useState(null);
  const excludeGroupIdsRef = useRef(new Set()); // groups you own or already belong to

  const gFrom = gPage * PAGE_SIZE;

  useEffect(() => {
    if (!supabase) { setErr('Supabase is not configured.'); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: sres } = await supabase.auth.getSession();
      const uid = sres?.session?.user?.id || null;
      setUserId(uid);

      // Build exclusion set for groups (owned or accepted member)
      const exclude = new Set();
      if (uid) {
        const [{ data: owned }, { data: mem }] = await Promise.all([
          supabase.from('groups').select('id').eq('owner_id', uid),
          supabase.from('group_members').select('group_id, status').eq('user_id', uid),
        ]);
        (owned || []).forEach(g => exclude.add(g.id));
        (mem || []).forEach(r => { if (ACCEPTED_STATUSES.has(r.status)) exclude.add(r.group_id); });
      }
      excludeGroupIdsRef.current = exclude;

      await Promise.all([fetchGroups('', '', 0), fetchEvents('', '')]);
      setLoading(false);
    })();
  }, []);

  // Debounced search (name/description + location)
  useEffect(() => {
    if (!supabase) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      await Promise.all([fetchGroups(q, loc, 0), fetchEvents(q, loc)]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [q, loc]);

  async function fetchGroups(term, location, pageIndex) {
    const fromIdx = pageIndex * PAGE_SIZE;
    const toIdx = fromIdx + PAGE_SIZE - 1;

    let query = supabase
      .from('groups')
      .select('id, name, description, created_at, owner_id, is_discoverable', { count: 'exact' })
      .eq('is_discoverable', true);

    if (userId) query = query.neq('owner_id', userId);

    if (term?.trim()) {
      const t = term.trim();
      query = query.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
    }

    const excludeIds = Array.from(excludeGroupIdsRef.current || []);
    if (excludeIds.length) {
      const list = `(${excludeIds.join(',')})`;
      query = query.not('id', 'in', list);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx);

    if (error) {
      setErr(error.message);
      setGroups([]); setGroupOwners({}); setMemberCounts({}); setGTotal(null);
      return;
    }

    // Owner profiles for city/state display + location filter
    const ownerIds = [...new Set((data || []).map(g => g.owner_id).filter(Boolean))];
    let ownersMap = {};
    if (ownerIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, city').in('id', ownerIds);
      (profs || []).forEach(p => { ownersMap[p.id] = p; });
    }

    // Client-side filter for location (owner profile city/state text)
    let filtered = data || [];
    if (location?.trim()) {
      const L = location.trim().toLowerCase();
      filtered = filtered.filter(g => {
        const cityState = ownersMap[g.owner_id]?.city || '';
        return cityState.toLowerCase().includes(L);
      });
    }

    setGroups(filtered);
    setGroupOwners(ownersMap);
    setGTotal(typeof count === 'number' ? count : null);
    setGPage(pageIndex);

    // member counts (accepted only)
    const ids = filtered.map(g => g.id);
    if (ids.length) {
      const { data: gm } = await supabase
        .from('group_members')
        .select('group_id, status')
        .in('group_id', ids);
      const counts = {};
      (gm || []).forEach(r => {
        if (ACCEPTED_STATUSES.has(r.status)) counts[r.group_id] = (counts[r.group_id] || 0) + 1;
      });
      setMemberCounts(counts);
    } else {
      setMemberCounts({});
    }
  }

  async function fetchEvents(term, location) {
    let evQuery = supabase
      .from('events')
      .select('id, title, description, date_iso, start_time, end_time, city, location_name, owner_id, created_at, visibility, is_hidden')
      .eq('visibility', 'public')
      .eq('is_hidden', false);

    if (term?.trim()) {
      const t = term.trim();
      evQuery = evQuery.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
    }
    if (location?.trim()) {
      const L = location.trim();
      evQuery = evQuery.ilike('city', `%${L}%`);
    }

    const { data, error } = await evQuery
      .order('date_iso', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(50);

    if (error) {
      setErr(prev => prev || error.message);
      setEvents([]);
      return;
    }

    setErr(null);
    setEvents(data || []);
  }

  const gCanPrev = useMemo(() => gPage > 0, [gPage]);
  const gCanNext = useMemo(() => {
    if (gTotal == null) return groups.length === PAGE_SIZE;
    return (gPage * PAGE_SIZE) + groups.length < gTotal;
  }, [gPage, groups.length, gTotal]);

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Discover</h1>
      <p className="mt-2 text-gray-600">Find public groups and events.</p>

      {/* Search */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or description…"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-900"
          aria-label="Search by name or description"
        />
        <input
          type="search"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="Filter by location (city or state)…"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-900"
          aria-label="Search by city or state"
        />
      </div>

      {err ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : null}

      {/* Events */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Events</h2>
        {loading ? (
          <EventSkeleton />
        ) : events.length === 0 ? (
          <p className="mt-2 text-gray-600">No events match your search.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {events.map(ev => (
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
                      {ev.description ? (
                        <div className="mt-2 text-sm text-gray-800 line-clamp-2">{ev.description}</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-xs text-gray-500">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Groups */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Groups</h2>
        {loading ? (
          <GroupSkeleton />
        ) : groups.length === 0 ? (
          <p className="mt-2 text-gray-600">No groups match your search.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {groups.map(g => {
              const count = memberCounts[g.id] ?? 0;
              const cityState = groupOwners[g.owner_id]?.city || ''; // e.g., "Ithaca, NY"
              return (
                <li key={g.id} className="rounded-lg border hover:shadow-sm transition">
                  <Link href={`/groups/${g.id}`} className="block p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{g.name}</div>
                        {g.description ? (
                          <div className="mt-1 text-sm text-gray-700 line-clamp-2">{g.description}</div>
                        ) : null}
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                          <span>{count} member{count === 1 ? '' : 's'}</span>
                          {cityState ? <span>• {cityState}</span> : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-gray-500">
                        {new Date(g.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Groups pagination */}
        <div className="mt-6 flex items-center justify-between">
          <button
            disabled={!gCanPrev || loading}
            onClick={() => fetchGroups(q, loc, gPage - 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <div className="text-sm text-gray-600">
            {gTotal != null
              ? `Showing ${gFrom + 1}–${gFrom + groups.length} of ${gTotal}`
              : groups.length ? `Showing ${gFrom + 1}–${gFrom + groups.length}` : '—'}
          </div>
          <button
            disabled={!gCanNext || loading}
            onClick={() => fetchGroups(q, loc, gPage + 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="mt-3 animate-pulse">
      <div className="h-16 w-full rounded bg-gray-200" />
      <div className="mt-3 h-16 w-full rounded bg-gray-200" />
      <div className="mt-3 h-16 w-full rounded bg-gray-200" />
    </div>
  );
}
function EventSkeleton() {
  return (
    <div className="mt-3 animate-pulse">
      <div className="h-16 w-full rounded bg-gray-200" />
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
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12; if (h === 0) h = 12;
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm} ${suffix}`;
}
