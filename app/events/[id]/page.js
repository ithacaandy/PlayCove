'use client';
import { localDateIso } from '../../../lib/event-validation';

import Link from 'next/link';
import ProfileAvatar from '../../components/Avatar';
import { setEventRsvp } from '../../../lib/event-rsvp';
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
  const [confirmCancel,setConfirmCancel]=useState(false);
  const [flash, setFlash] = useState(null);

  const iOwn = useMemo(() => me?.id && ev?.owner_id === me.id, [me, ev]);
  const iRsvpd = useMemo(() => me?.id && rsvps.some((r) => r.user_id === me.id), [me, rsvps]);
  const canSeeRsvps = iOwn;

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
        'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, map_url, capacity, cancelled_at, created_at, image_url'
      )
      .eq('id', eventId)
      .single();

    if (eErr) {
      // If image_url column does not exist yet, retry without it
      const { data: fallbackEvent, error: fallbackErr } = await supabase
        .from('events')
        .select(
          'id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, map_url, capacity, cancelled_at, created_at'
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
    if (busy) return;
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
      await setEventRsvp(supabase, id, me.id, true);

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
    if (busy) return;
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
      await setEventRsvp(supabase, id, me.id, false);

      await refreshAll(id);
      setFlash('RSVP removed.');
    } catch (e) {
      setFlash(e.message || 'Failed to remove RSVP.');
    } finally {
      setBusy(false);
      clearFlashSoon();
    }
  }

  async function cancelEvent() {
    if(busy) return;
    setBusy(true);
    try {
      const response=await fetch('/api/events/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:id})});
      const result=await response.json();if(!response.ok) throw new Error(result.error || 'Could not cancel event.');
      setConfirmCancel(false);await refreshAll(id);setFlash('Event cancelled. Attendees have been notified.');
      window.dispatchEvent(new Event('notifications-changed'));
    } catch(error) {setFlash(error.message);} finally {setBusy(false);}
  }
  function clearFlashSoon() {
    setTimeout(() => setFlash(null), 2000);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-28">
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
          <Link href="/mine" className="mb-4 inline-flex text-sm text-gray-600 underline underline-offset-4">Back to My Events</Link>
          <header className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--paper)] shadow-sm">
            {ev.image_url && <div className="h-48 bg-cover bg-center sm:h-64" style={{ backgroundImage: `url(${ev.image_url})` }} />}
            <div className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-gray-800">{ev.cancelled_at ? 'Cancelled' : iOwn ? 'You’re hosting' : iRsvpd ? 'You’re going' : 'Playdate'}</span>
                {!ev.cancelled_at && ev.date_iso < localDateIso() && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Archived</span>}
              </div>
              <h1 className="break-words text-2xl font-semibold leading-tight text-[var(--ink)] sm:text-3xl">{ev.title}</h1>
              <div className="mt-5 space-y-3 text-sm">
                <div><p className="font-medium text-gray-900">{formatDate(ev.date_iso)}</p><p className="mt-1 text-gray-600">{formatTime12(ev.start_time)}{ev.end_time ? ` – ${formatTime12(ev.end_time)}` : ''}</p></div>
                <div><p className="font-medium text-gray-900">{ev.location_name || 'Location TBD'}</p>{ev.city && <p className="mt-1 text-gray-600">{ev.city}</p>}
                  {ev.map_url && <a href={ev.map_url} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-4">View map</a>}
                </div>
              </div>
            </div>
          </header>

          {ev.cancelled_at && <p role="status" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This event has been cancelled by the host. The original details and attendee history are preserved.</p>}
          {/* Meta + actions */}
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-5 shadow-sm">
            <div className="space-y-5">
              <div className="min-w-0">
                {ev.description ? (
                  <><h2 className="mb-2 text-base font-semibold">About this event</h2><p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                    {ev.description}
                  </p></>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                {iOwn && !ev.cancelled_at && ev.date_iso >= localDateIso() && <Link href={`/events/${ev.id}/invite`} className="btn btn-primary">Invite a parent</Link>}

                {iOwn && <Link href={`/new?clone=${ev.id}`} className="btn btn-ghost">Clone event</Link>}
                {iOwn && !ev.cancelled_at && (
                  <Link
                    href={`/events/${ev.id}/edit`}
                    className="btn btn-ghost"
                  >
                    Edit Event
                  </Link>
                )}

                {iOwn && !ev.cancelled_at && ev.date_iso >= localDateIso() && <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="btn btn-ghost text-red-700">Cancel event</button>}
                {!iOwn && !ev.cancelled_at && me && ev.date_iso >= localDateIso() && (
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

          {confirmCancel && <section role="alertdialog" aria-labelledby="cancel-event-title" className="mt-4 rounded-xl border border-red-200 bg-white p-4">
            <h2 id="cancel-event-title" className="font-semibold">Cancel this event?</h2><p className="mt-2 text-sm">This cancels only this date. Everyone who RSVP’d will receive an in-app notification. New RSVPs will be blocked. To repost later, clone the event.</p>
            <div className="mt-3 flex gap-2"><button disabled={busy} onClick={cancelEvent} className="rounded-lg bg-red-700 px-4 py-2 text-white">{busy ? 'Cancelling…' : 'Yes, cancel event'}</button><button disabled={busy} onClick={() => setConfirmCancel(false)} className="rounded-lg border px-4 py-2">Keep event</button></div>
          </section>}
          {flash ? (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {flash}
            </div>
          ) : null}

          {/* Host */}
          <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[var(--ink)]">Hosted by</h2>
            <div className="mt-3">
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
          <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--ink)]">
                RSVPs{' '}
                <span className="text-gray-500 font-normal">
                  {iOwn ? `(${rsvps.length}${ev.capacity ? ` / ${ev.capacity}` : ''})` : ''}
                </span>
              </h2>
            </div>

            {!canSeeRsvps ? (
              <p className="mt-3 text-sm text-gray-500">Only the host can view the attendee list.</p>
            ) : rsvps.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No one has RSVP’d yet.</p>
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
  return <ProfileAvatar name={profile?.full_name || profile?.initials || ''}
    src={profile?.avatar_url || null} size="sm"
    className={size === 'md' ? 'h-11 w-11 text-sm' : ''} />;
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
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
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