'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState(null);
  const [event, setEvent] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [city, setCity] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ageMin, setAgeMin] = useState(0);
  const [ageMax, setAgeMax] = useState(16);
  const [capacity, setCapacity] = useState(6);
  const [tags, setTags] = useState('');
  const [contact, setContact] = useState('');

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setStatus({ type: 'error', msg: 'Supabase not configured.' });
      setLoading(false);
      return;
    }

    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setSessionUser(user);

      // Try with image_url first
      let ev = null;
      let error = null;

      const first = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      ev = first.data;
      error = first.error;

      if (error) {
        setStatus({ type: 'error', msg: error.message });
        setLoading(false);
        return;
      }

      setEvent(ev);

      setTitle(ev.title || '');
      setDescription(ev.description || '');
      setDateIso(ev.date_iso || '');
      setStartTime((ev.start_time || '').slice(0, 5));
      setEndTime(ev.end_time ? ev.end_time.slice(0, 5) : '');
      setLocationName(ev.location_name || '');
      setCity(ev.city || '');
      setMapUrl(ev.map_url || '');
      setImageUrl(ev.image_url || '');
      setAgeMin(ev.age_min ?? 0);
      setAgeMax(ev.age_max ?? 16);
      setCapacity(ev.capacity ?? 6);
      setTags(Array.isArray(ev.tags) ? ev.tags.join(', ') : '');
      setContact(ev.contact || '');

      setLoading(false);
    })();
  }, [id]);

  const isOwner = useMemo(() => {
    return !!sessionUser && !!event && sessionUser.id === event.owner_id;
  }, [sessionUser, event]);

  async function handleSave(e) {
    e.preventDefault();
    if (!isOwner) return;

    if (!title.trim() || !dateIso || !startTime || !locationName.trim() || !city.trim()) {
      setStatus({
        type: 'error',
        msg: 'Title, date, start time, location, and city are required.',
      });
      return;
    }

    setSaving(true);
    setStatus({ type: 'info', msg: 'Saving…' });

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      date_iso: dateIso,
      start_time: startTime + (startTime.length === 5 ? ':00' : ''),
      end_time: endTime ? endTime + (endTime.length === 5 ? ':00' : '') : null,
      location_name: locationName.trim(),
      city: city.trim(),
      map_url: mapUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      age_min: Number(ageMin) || 0,
      age_max: Number(ageMax) || 16,
      capacity: Number(capacity) || 6,
      tags: toTextArray(tags),
      contact: contact.trim() || null,
    };

    const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .eq('owner_id', sessionUser.id);

    if (error) {
      setStatus({ type: 'error', msg: `Update failed: ${error.message}` });
      setSaving(false);
      return;
    }

    setStatus({ type: 'success', msg: 'Saved!' });
    router.replace(`/events/${id}`);
  }

  if (loading) return <Skeleton />;

  if (!event) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Event not found</h1>
        <Link href="/mine" className="btn btn-ghost mt-4 inline-flex">
          Back to My Events
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Edit Event</h1>
        <p className="mt-2 text-gray-600">You’re not the owner of this event.</p>
        <div className="mt-4">
          <Link href={`/events/${id}`} className="btn btn-ghost">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Edit Event</h1>
        <Link href={`/events/${id}`} className="btn btn-ghost">
          Back
        </Link>
      </div>

      {status?.msg ? (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            status.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : status.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
        >
          {status.msg}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="mt-6 grid gap-4">
        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Event Details</h2>

          <div className="mt-4 grid gap-4">
            <Field label="Title *">
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Date & Time</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
              />
            </Field>

            <Field label="Start time *">
              <input
                type="time"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="End time">
              <input
                type="time"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>

            <Field label="Capacity">
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Location</h2>

          <div className="mt-4 grid gap-4">
            <Field label="Location name *">
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </Field>

            <Field label="City *">
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>

            <Field label="Google Maps link">
              <input
                type="url"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Event Card Image</h2>

          <div className="mt-4 grid gap-4">
            <Field label="Image URL">
              <input
                type="url"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </Field>

            <div>
              <div className="block text-sm font-medium text-gray-700">Preview</div>
              <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--paper)]">
                <div
                  className="h-40 w-full bg-cover bg-center"
                  style={
                    imageUrl
                      ? { backgroundImage: `url(${imageUrl})` }
                      : { backgroundColor: 'var(--sand, #E8D8C3)' }
                  }
                />
                <div className="bg-[var(--sunshine)] px-3 py-2 text-xs font-medium text-white">
                  {title || 'Event title preview'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">Audience & Extras</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Age min">
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </Field>

            <Field label="Age max">
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-4">
            <Field label="Contact (email or phone)">
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>

            <Field label="Tags (comma separated)">
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <Link href={`/events/${id}`} className="btn btn-ghost ml-3">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="mt-4 h-24 w-full rounded bg-gray-200" />
      <div className="mt-3 h-24 w-full rounded bg-gray-200" />
      <div className="mt-3 h-24 w-full rounded bg-gray-200" />
    </div>
  );
}

function toTextArray(str) {
  const parts = (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.length ? parts : null;
}