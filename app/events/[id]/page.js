'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function EventDetailsPage() {
  const { id } = useParams();
  const [me, setMe] = useState(null);
  const [ev, setEv] = useState(null);
  const [owner, setOwner] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const iOwn = useMemo(() => me?.id && ev?.owner_id === me.id, [me, ev]);
  const iRsvpd = useMemo(() => me?.id && rsvps.some((r) => r.user_id === me.id), [me, rsvps]);
  const canSeeRsvps = iOwn || iRsvpd;

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
      setMe(user ? { id: user.id, email: user.email } : null);

      try {
        await refreshAll(id);
        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function refreshAll(eventId) {
    // Event
    const { data: e, error: eErr } = await supabase
      .from('events')
      .select(
        'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, map_url, capacity, created_at, image_url'
      )
      .eq('id', eventId)
      .single();

    if (eErr) {
      // If image_url column does not exist yet, retry without it
      const { data: fallbackEvent, error: fallbackErr } = await supabase
        .from('events')
        .select(
          'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, map_url, capacity, created_at'
        )
        .eq('id', eventId)
        .single();

      if (fallbackErr) throw fallbackErr;

      setEv({ ...(fallbackEvent || {}), image_url: null });
    } else {
      setEv(e || null);
    }

    const eventData = eErr
      ? null
      : e;

    const resolvedOwnerId = eventData?.owner_id || (eErr ? null : null);

    // Since fallback path may not have eventData above, fetch current ev owner from the table result again if needed
    const ownerId =
      eventData?.owner_id ||
      (eErr ? (await supabase.from('events').select('owner_id').eq('id', eventId).single()).data?.owner_id : null);

    // Owner profile
    if (ownerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, city, avatar_url')
        .eq('id', ownerId)
        .single();

      setOwner(
        profile
          ? {
              ...profile,
              initials: getInitials(profile.full_name),
            }
          : {
              id: ownerId,
              full_name: null,
              city: null,
              avatar_url: null,
              initials: '?',
            }
      );
    } else {
      setOwner(null);
    }

    // RSVPs + attendee profiles
    const { data: r, error: rErr } = await supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', eventId);

    if (rErr) throw rErr;

    const ids = (r || []).map((x) => x.user_id).filter(Boolean);

    let profilesById = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, city, avatar_url')
        .in('id', ids);

      (profs || []).forEach((p) => {
        profilesById[p.id] = {
          ...p,
          initials: getInitials(p.full_name),
        };
      });
    }

    setRsvps(
      (r || []).map((x) => ({
        ...x,
        profile: profilesById[x.user_id] || {
          id: x.user_id,
          full_name: null,
          city: null,
          avatar_url: null,
          initials: '?',
        },
      }))
    );
  }

  async function handleRsvp() {
    if (!me) {
      setFlash('Please sign in to RSVP.');
      clearFlashSoon();
      return;
    }
    if (iOwn) {
      setFlash('You are the owner of this event.');
      clearFlashSoon();
      return;
    }
    if (iRsvpd) {
      setFlash('Already RSVP’d.');
      clearFlashSoon();
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('rsvps')
        .insert({ event_id: id, user_id: me.id });

      if (error && error.code !== '23505') throw error;

      await refreshAll(id);
      setFlash('RSVP’d!');
    } catch (e) {
      setFlash(e.message || 'Failed to RSVP.');
    } finally {
      setBusy(false);
      clearFlashSoon();
    }
  }

  async function handleUnrsvp() {
    if (!me) {
      setFlash('Please sign in first.');
      clearFlashSoon();
      return;
    }
    if (!iRsvpd) {
      setFlash('You are not RSVP’d.');
      clearFlashSoon();
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .match({ event_id: id, user_id: me.id });

      if (error) throw error;

      await refreshAll(id);
      setFlash('RSVP removed.');
    } catch (e) {
      setFlash(e.message || 'Failed to remove RSVP.');
    } finally {
      setBusy(false);
      clearFlashSoon();
    }
  }

  function clearFlashSoon() {
    setTimeout(() => setFlash(null), 2000);
  }

  return (
    <div className="py-6">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-56 rounded-2xl bg-gray-200" />
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-200" />
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : !ev ? (
        <div className="rounded-md border px-3 py-2">Event not found.</div>
      ) : (
        <>
          {/* Hero / image */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--paper)]">
            <div
              className="h-56 w-full bg-cover bg-center"
              style={
                ev.image_url
                  ? { backgroundImage: `url(${ev.image_url})` }
                  : { backgroundColor: 'var(--sand, #E8D8C3)' }
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="px-2 py-1 text-[11px] rounded-full bg-white border border-[var(--border)] text-[var(--ink)] shadow-sm">
                  {iOwn ? 'Hosted by You' : iRsvpd ? 'Going' : 'Event'}
                </div>

                <div className="flex items-center gap-2">
                  {owner && (
                    <div className="flex items-center gap-2 rounded-full bg-white/90 pl-1 pr-3 py-1 shadow-sm">
                      <Avatar profile={owner} size="sm" />
                      <div className="text-xs font-medium text-[var(--ink)]">
                        {owner.full_name || 'Host'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-white drop-shadow-md">
                    {ev.title}
                  </h1>
                  <div className="mt-1 text-sm text-white/90">
                    {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                    {ev.end_time ? `–${formatTime12(ev.end_time)}` : ''}
                  </div>
                </div>

                <div className="bg-white text-[var(--ink)] text-xs font-semibold rounded px-3 py-2 text-center leading-tight shadow">
                  <div>{formatMonth(ev.date_iso)}</div>
                  <div>{formatDay(ev.date_iso)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Meta + actions */}
          <div className="mt-4 card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-gray-700">
                  {ev.location_name || 'Location TBD'}
                  {ev.city ? `, ${ev.city}` : ''}
                </div>

                {ev.map_url ? (
                  <div className="mt-1">
                    <a
                      href={ev.map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      Open map
                    </a>
                  </div>
                ) : null}

                {ev.description ? (
                  <p className="mt-3 text-gray-800 whitespace-pre-wrap">
                    {ev.description}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {iOwn && (
                  <Link
                    href={`/events/${ev.id}/edit`}
                    className="btn btn-ghost"
                  >
                    Edit Event
                  </Link>
                )}

                {!iOwn && me && (
                  iRsvpd ? (
                    <button
                      onClick={handleUnrsvp}
                      disabled={busy}
                      className="btn btn-ghost disabled:opacity-50"
                    >
                      {busy ? 'Working…' : 'Un-RSVP'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRsvp}
                      disabled={busy}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {busy ? 'Working…' : 'RSVP'}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {flash ? (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {flash}
            </div>
          ) : null}

          {/* Host */}
          <section className="mt-8">
            <h2 className="text-base font-semibold text-[var(--ink)]">Hosted by</h2>
            <div className="mt-3 card p-3">
              <div className="flex items-center gap-3">
                <Avatar profile={owner} size="md" />
                <div className="min-w-0">
                  <div className="font-medium">{owner?.full_name || 'Host'}</div>
                  {owner?.city ? (
                    <div className="text-sm text-gray-600">{owner.city}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* RSVP block */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--ink)]">
                RSVPs{' '}
                <span className="text-gray-500 font-normal">
                  ({rsvps.length}{ev.capacity ? ` / ${ev.capacity}` : ''})
                </span>
              </h2>
            </div>

            {!canSeeRsvps ? (
              <p className="mt-2 text-gray-600">RSVP to see the attendee list.</p>
            ) : rsvps.length === 0 ? (
              <p className="mt-2 text-gray-600">No one has RSVP’d yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {rsvps.map((r) => (
                  <li key={r.user_id} className="card p-3">
                    <div className="flex items-center gap-3">
                      <Avatar profile={r.profile} size="sm" />
                      <div className="min-w-0 text-sm">
                        <div className="font-medium">
                          {r.profile?.full_name || r.user_id}
                        </div>
                        {r.profile?.city ? (
                          <div className="text-gray-600">{r.profile.city}</div>
                        ) : null}
                      </div>
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

function Avatar({ profile, size = 'sm' }) {
  const sizes = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
  };

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden border border-[var(--border)] bg-gray-200 flex items-center justify-center shrink-0`}>
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-medium text-gray-700">
          {profile?.initials || '?'}
        </span>
      )}
    </div>
  );
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
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

function formatTime12(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}