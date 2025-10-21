'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function EventDetailsPage() {
  const { id } = useParams(); // event id
  const [me, setMe] = useState(null);
  const [ev, setEv] = useState(null);
  const [rsvps, setRsvps] = useState([]); // { user_id, profile }
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null); // transient message

  const iOwn = useMemo(() => me?.id && ev?.owner_id === me.id, [me, ev]);
  const iRsvpd = useMemo(() => me?.id && rsvps.some(r => r.user_id === me.id), [me, rsvps]);
  const canSeeRsvps = iOwn || iRsvpd;

  useEffect(() => {
    if (!supabase) { setErr('Supabase not configured'); setLoading(false); return; }
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
      .select('id, owner_id, title, description, date_iso, start_time, end_time, city, location_name, map_url, capacity, created_at')
      .eq('id', eventId)
      .single();
    if (eErr) throw eErr;
    setEv(e || null);

    // RSVPs + profiles
    const { data: r, error: rErr } = await supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', eventId);
    if (rErr) throw rErr;

    const ids = (r || []).map(x => x.user_id);
    let profilesById = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, city')
        .in('id', ids);
      (profs || []).forEach(p => { profilesById[p.id] = p; });
    }
    setRsvps((r || []).map(x => ({ ...x, profile: profilesById[x.user_id] || null })));
  }

  async function handleRsvp() {
    if (!me) { setFlash('Please sign in to RSVP.'); return; }
    if (iOwn) { setFlash('You are the owner of this event.'); return; }
    if (iRsvpd) { setFlash('Already RSVP’d.'); return; }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('rsvps')
        .insert({ event_id: id, user_id: me.id });
      // Ignore duplicate error (unique index), if present
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
    if (!me) { setFlash('Please sign in first.'); return; }
    if (!iRsvpd) { setFlash('You are not RSVP’d.'); return; }

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
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-200" />
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : !ev ? (
        <div className="rounded-md border px-3 py-2">Event not found.</div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{ev.title}</h1>
              <div className="mt-1 text-sm text-gray-700">
                {formatDate(ev.date_iso)} · {formatTime12(ev.start_time)}
                {ev.end_time ? `–${formatTime12(ev.end_time)}` : ''}
              </div>
              <div className="text-sm text-gray-600">
                {ev.location_name}{ev.city ? `, ${ev.city}` : ''}
              </div>
              {ev.map_url ? (
                <div className="mt-1">
                  <a href={ev.map_url} target="_blank" rel="noreferrer" className="text-sm underline">Open map</a>
                </div>
              ) : null}
              {ev.description ? (
                <p className="mt-3 text-gray-800 whitespace-pre-wrap">{ev.description}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {/* Owner can edit */}
              {iOwn && (
                <Link href={`/events/${ev.id}/edit`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Edit Event
                </Link>
              )}

              {/* RSVP / Un-RSVP */}
              {!iOwn && me && (
                iRsvpd ? (
                  <button
                    onClick={handleUnrsvp}
                    disabled={busy}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {busy ? 'Working…' : 'Un-RSVP'}
                  </button>
                ) : (
                  <button
                    onClick={handleRsvp}
                    disabled={busy}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {busy ? 'Working…' : 'RSVP'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Flash message */}
          {flash ? (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{flash}</div>
          ) : null}

          {/* RSVP block */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                RSVPs <span className="text-gray-500 font-normal">({rsvps.length}{ev.capacity ? ` / ${ev.capacity}` : ''})</span>
              </h2>
            </div>

            {!canSeeRsvps ? (
              <p className="mt-2 text-gray-600">RSVP to see the attendee list.</p>
            ) : rsvps.length === 0 ? (
              <p className="mt-2 text-gray-600">No one has RSVP’d yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {rsvps.map(r => (
                  <li key={r.user_id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{r.profile?.full_name || r.user_id}</div>
                        {r.profile?.city ? <div className="text-gray-600">{r.profile.city}</div> : null}
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

function formatDate(d) { try { return new Date(d).toLocaleDateString(); } catch { return d; } }
function formatTime12(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':'); let h = parseInt(hStr, 10); const m = parseInt(mStr || '0', 10);
  const suffix = h >= 12 ? 'p.m.' : 'a.m.'; h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}
