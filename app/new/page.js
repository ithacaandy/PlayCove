// app/new/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function NewEventPage() {
  const [sessionUser, setSessionUser] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [city, setCity] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [ageMin, setAgeMin] = useState(0);
  const [ageMax, setAgeMax] = useState(16);
  const [capacity, setCapacity] = useState(6);
  const [tags, setTags] = useState('');
  const [contact, setContact] = useState('');
  const [groupId, setGroupId] = useState('');

  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) { setStatus({ type: 'error', msg: 'Supabase is not configured.' }); return; }
    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setSessionUser(user);
      if (!user) return;

      const [{ data: owned }, { data: mem }] = await Promise.all([
        supabase.from('groups').select('id, name').eq('owner_id', user.id),
        supabase.from('group_members').select('group_id, group:groups(id, name)').eq('user_id', user.id),
      ]);
      const memberGroups = (mem || []).map(r => r.group).filter(Boolean);
      setGroups(dedupeById([...(owned || []), ...memberGroups]));
    })();
  }, []);

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase || !isAuthed) return;

    if (!title.trim() || !dateIso || !startTime || !locationName.trim() || !city.trim()) {
      setStatus({ type: 'error', msg: 'Title, date, start time, location, and city are required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'info', msg: 'Creating event…' });

    const payload = {
      owner_id: sessionUser.id,
      title: title.trim(),
      description: description.trim() || null,
      date_iso: dateIso,
      start_time: startTime + (startTime.length === 5 ? ':00' : ''),
      end_time: endTime ? endTime + (endTime.length === 5 ? ':00' : '') : null,
      location_name: locationName.trim(),
      city: city.trim(),
      map_url: mapUrl.trim() || null,
      age_min: Number(ageMin) || 0,
      age_max: Number(ageMax) || 16,
      capacity: Number(capacity) || 6,
      tags: toTextArray(tags),
      contact: contact.trim() || null,
      is_hidden: false,
      group_id: groupId || null,
      // visibility defaults to 'public'
    };

    const { error } = await supabase.from('events').insert(payload).single();

    if (error) {
      setStatus({ type: 'error', msg: `Could not create event: ${error.message}` });
      setSaving(false);
      return;
    }

    setStatus({ type: 'success', msg: 'Event created!' });
    window.location.href = '/mine';
  }

  if (!isAuthed) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">Create a New Event</h1>
        <p className="mt-3 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Go to /auth</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Create a New Event</h1>

      {status?.msg ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Park playdate" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bring scooters and snacks…" />
        </div>

        {/* Date & Start */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date *</label>
            <input type="date" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start time *</label>
            <input type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>

        {/* End & Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">End time</label>
            <input type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity</label>
            <input type="number" min="1" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>

        {/* Ages */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Age min</label>
            <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Age max</label>
            <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Location name *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Stewart Park Playground" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ithaca, NY" />
        </div>

        {/* Map, Contact, Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Google Maps link</label>
          <input type="url" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/?q=..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contact (email or phone)</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={contact} onChange={(e) => setContact(e.target.value)} placeholder="contact@playcove.test" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 value={tags} onChange={(e) => setTags(e.target.value)} placeholder="outdoor, park" />
        </div>

        {/* Group (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
            <option value="">— None —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving}
                  className="inline-flex items-center rounded-md bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-400 disabled:opacity-60">
            {saving ? 'Saving…' : 'Create event'}
          </button>
          <Link href="/mine" className="ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function toTextArray(str) {
  const parts = (str || '').split(',').map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}
function dedupeById(arr) {
  const seen = new Set();
  return arr.filter(x => (x && !seen.has(x.id) && seen.add(x.id)));
}
