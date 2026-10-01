// app/new/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { recurrenceDates, recurrenceFromForm } from '../../lib/event-recurrence';
import { parseEventInput } from '../../lib/event-validation';
import { ACTIVE_GROUP_STATUSES } from '../../lib/group-membership';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function NewEventPage() {
  const router = useRouter();
  const [cloneId, setCloneId] = useState('');
  const [weekdays, setWeekdays] = useState(null);
  const [frequency, setFrequency] = useState('none');
  const [interval, setInterval] = useState(1);
  const [endMode, setEndMode] = useState('count');
  const [repeatCount, setRepeatCount] = useState(4);
  const [until, setUntil] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateIso, setDateIso] = useState('');
  const selectedWeekdays = weekdays ?? (dateIso ? [new Date(dateIso + 'T12:00:00Z').getUTCDay()] : []);
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
  const [createdEventId, setCreatedEventId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sres, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sres?.session?.user || null;
        if (!mounted) return;
        setSessionUser(user);
        if (!user) return;
        const [owned, member] = await Promise.all([
          supabase.from('groups').select('id, name').eq('owner_id', user.id),
          supabase.from('group_members').select('group_id, group:groups(id, name)')
            .eq('user_id', user.id).in('status', ACTIVE_GROUP_STATUSES),
        ]);
        if (owned.error || member.error) throw owned.error || member.error;
        if (!mounted) return;
        const options = dedupeById([...(owned.data || []), ...(member.data || []).map((row) => row.group).filter(Boolean)]);
        setGroups(options);
        const sourceId = new URL(window.location.href).searchParams.get('clone');
        if (sourceId) {
          const { data: source, error } = await supabase.from('events').select('*').eq('id', sourceId).eq('owner_id', user.id).maybeSingle();
          if (error || !source) throw new Error('Could not clone this event. You can only clone your own events.');
          if (!mounted) return;
          setCloneId(source.id); setTitle(source.title || ''); setDescription(source.description || '');
          setStartTime((source.start_time || '').slice(0, 5)); setEndTime((source.end_time || '').slice(0, 5));
          setLocationName(source.location_name || ''); setCity(source.city || ''); setMapUrl(source.map_url || '');
          setAgeMin(source.age_min); setAgeMax(source.age_max); setCapacity(source.capacity);
          setTags((source.tags || []).join(', ')); setContact(source.contact || '');
          if (options.some((group) => group.id === source.group_id)) setGroupId(source.group_id);
        }
        const initialGroup = new URL(window.location.href).searchParams.get('group');
        if (initialGroup && options.some((group) => group.id === initialGroup)) setGroupId(initialGroup);
      } catch (e) {
        if (mounted) setStatus({ type: 'error', msg: e.message || 'Could not load your groups. Please reload before creating a group event.' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAuthed || saving || createdEventId) return;
    const fd = new FormData(e.currentTarget);
    try {
      parseEventInput(fd, sessionUser.id);
      recurrenceDates(dateIso, recurrenceFromForm(fd));
    } catch (error) {
      setStatus({ type: 'error', msg: error.message });
      return;
    }
    setSaving(true);
    setStatus({ type: 'info', msg: 'Creating event…' });
    try {
      const response = await fetch('/api/create', { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || 'Could not create your event.');
      setCreatedEventId(result.id);
      setStatus({ type: 'success', msg: `${result.count || 1} event${result.count > 1 ? 's' : ''} created. Each date has its own RSVPs.` });
      router.push('/events/' + result.id);
      router.refresh();
    } catch (error) {
      setStatus({ type: 'error', msg: error.message || 'Could not create your event. Check My Events before retrying.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="p-4">Loading event form…</p>;
  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 pb-24">
        <h1 className="text-xl font-semibold">Create a New Event</h1>
        <p className="mt-3 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Go to /auth</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold">Create a New Event</h1>

      {status?.msg ? (
        <div role={status.type === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <p className="mt-2 text-sm text-gray-600">Events are public and can appear in Discover, including events linked to a group.</p>
      {cloneId && <p className="mt-3 text-sm">Cloned details are ready. Choose a new date before posting. Guests and invitations are not copied.</p>}
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <input type="hidden" name="clone_id" value={cloneId} />
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Park playdate" />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    name="description" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bring scooters and snacks…" />
        </div>

        {/* Date & Start */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date_iso" className="block text-sm font-medium text-gray-700">Date *</label>
            <input type="date" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   name="date_iso" id="date_iso" value={dateIso} onInput={(e) => setDateIso(e.currentTarget.value)} onChange={(e) => setDateIso(e.target.value)} />
          </div>
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start time *</label>
            <input type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   name="start_time" id="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>

        <fieldset className="grid gap-3 rounded-xl border p-3">
          <legend className="px-1 font-medium">Recurring event</legend>
          <label>Repeat
            <select name="repeat_frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 w-full rounded-md border p-2">
              <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </label>
          {frequency !== 'none' && <>
            <label>Repeat every {({daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)', yearly: 'year(s)'})[frequency]}
              <input name="repeat_interval" type="number" min="1" max="30" value={interval} onChange={(e) => setInterval(e.target.value)} className="mt-1 w-full rounded-md border p-2" />
            </label>
            {frequency === 'weekly' && <div>
              <p className="mb-2 text-sm font-medium">Repeat on</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Repeat weekdays">
                {[[1,'Monday','M'],[2,'Tuesday','T'],[3,'Wednesday','W'],[4,'Thursday','T'],[5,'Friday','F'],[6,'Saturday','S'],[0,'Sunday','S']].map(([day, name, initial]) => <button key={day} type="button" aria-label={name} aria-pressed={selectedWeekdays.includes(day)} onClick={() => setWeekdays(selectedWeekdays.includes(day) ? selectedWeekdays.filter((value) => value !== day) : [...selectedWeekdays, day])} className={`h-9 w-9 rounded-full border text-sm ${selectedWeekdays.includes(day) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>{initial}</button>)}
              </div>
              {selectedWeekdays.map((day) => <input key={day} type="hidden" name="repeat_weekday" value={day} />)}
            </div>}
            <label>End series
              <select name="repeat_end_mode" value={endMode} onChange={(e) => setEndMode(e.target.value)} className="mt-1 w-full rounded-md border p-2"><option value="count">After a number of occurrences</option><option value="until">On a date</option></select>
            </label>
            {endMode === 'count' ? <label>Occurrences (including the first)
              <input name="repeat_count" type="number" min="2" max="52" value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} className="mt-1 w-full rounded-md border p-2" />
            </label> : <label>Last date
              <input name="repeat_until" type="date" value={until} onInput={(e) => setUntil(e.currentTarget.value)} onChange={(e) => setUntil(e.target.value)} className="mt-1 w-full rounded-md border p-2" />
            </label>}
            <p className="text-sm text-gray-600">Up to 52 dates. Each date is edited separately and has its own guests and capacity. Monthly and yearly repeats use the last day when the original day does not exist.</p>
            <RecurrencePreview date={dateIso} startTime={startTime} endTime={endTime} settings={{ frequency, interval, endMode, count: repeatCount, until, weekdays: selectedWeekdays }} />
          </>}
        </fieldset>
        {/* End & Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End time</label>
            <input type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   name="end_time" id="end_time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">Capacity</label>
            <input type="number" min="1" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   name="capacity" id="capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>

        {/* Ages */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="age_min" className="block text-sm font-medium text-gray-700">Age min</label>
            <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   max="18" name="age_min" id="age_min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          </div>
          <div>
            <label htmlFor="age_max" className="block text-sm font-medium text-gray-700">Age max</label>
            <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   max="18" name="age_max" id="age_max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location_name" className="block text-sm font-medium text-gray-700">Location name *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="location_name" id="location_name" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Stewart Park Playground" />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">City *</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="city" id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ithaca, NY" />
        </div>

        {/* Map, Contact, Tags */}
        <div>
          <label htmlFor="map_url" className="block text-sm font-medium text-gray-700">Google Maps link</label>
          <input type="url" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="map_url" id="map_url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/?q=..." />
        </div>

        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700">Contact (email or phone)</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="contact" id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="contact@playcove.test" />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                 name="tags" id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="outdoor, park" />
        </div>

        {/* Group (optional) */}
        <div>
          <label htmlFor="group_id" className="block text-sm font-medium text-gray-700">Group</label>
          <select name="group_id" id="group_id" value={groupId} onChange={(e) => setGroupId(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
            <option value="">— None —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="pt-2">
          {status?.msg && <p role={status.type === 'error' ? 'alert' : 'status'} className="mb-3 text-sm">{status.msg}</p>}
          {createdEventId && <a href={'/events/' + createdEventId} className="mb-3 block underline">Open your created event</a>}
          <button type="submit" disabled={saving || !!createdEventId}
                  className="inline-flex items-center rounded-md bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-400 disabled:opacity-60">
            {createdEventId ? 'Event created' : saving ? 'Saving…' : frequency === 'none' ? 'Create event' : 'Create recurring events'}
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

function RecurrencePreview({ date, settings, startTime, endTime }) {
  if (!date) return <p className="text-sm">Choose the first date to preview your series.</p>;
  try {
    const dates = recurrenceDates(date, settings);
    const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const unit = {daily:'day',weekly:'week',monthly:'month',yearly:'year'}[settings.frequency];
    const schedule = Number(settings.interval) === 1 ? `Every ${unit}` : `Every ${settings.interval} ${unit}s`;
    const days = settings.frequency === 'weekly' ? ` on ${[...settings.weekdays].sort((a,b) => ((a+6)%7)-((b+6)%7)).map((day) => weekdayNames[day]).join(', ')}` : '';
    const formatDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric', timeZone:'UTC'});
    const time = (value) => { const [hour,minute] = value.split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour < 12 ? 'AM' : 'PM'}`; };
    return <div role="status" className="rounded-lg bg-blue-50 p-3 text-sm"><p>{schedule}{days}{startTime ? ` at ${time(startTime)}${endTime ? '–' + time(endTime) : ''}` : ''}, from {formatDate(dates[0])} through {formatDate(dates[dates.length - 1])}.</p><p className="mt-1">{dates.length} events: {dates.slice(0, 3).join(', ')}{dates.length > 3 ? ` … ending ${dates[dates.length - 1]}` : ''}</p></div>;
  } catch (error) { return <p className="text-sm text-red-700">{error.message}</p>; }
}
