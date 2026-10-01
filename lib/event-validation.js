export function localDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

export function parseEventInput(fd, ownerId, { allowPast = false, today = localDateIso() } = {}) {
  const text = (key) => String(fd.get(key) ?? '').trim();
  const required = (key, label, max = 200) => {
    const value = text(key);
    if (!value || value.length > max) throw new Error(label + ' is required and must be at most ' + max + ' characters.');
    return value;
  };
  const integer = (key, fallback, min, max) => {
    const raw = fd.get(key);
    const value = raw === null ? fallback : Number(raw);
    if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(key.replaceAll('_', ' ') + ' must be a whole number from ' + min + ' to ' + max + '.');
    return value;
  };
  const date = text('date_iso');
  const parsed = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid event date.');
  if (!allowPast && date < today) throw new Error('Choose today or a future date.');
  const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
  const start = text('start_time');
  const end = text('end_time');
  if (!validTime(start) || (end && !validTime(end))) throw new Error('Choose a valid start and end time.');
  if (end && end.slice(0, 5) <= start.slice(0, 5)) throw new Error('End time must be after start time.');
  const ageMin = integer('age_min', 0, 0, 18);
  const ageMax = integer('age_max', 16, 0, 18);
  if (ageMin > ageMax) throw new Error('Maximum age must be at least the minimum age.');
  const mapUrl = text('map_url');
  if (mapUrl) {
    let url;
    try { url = new URL(mapUrl); } catch { throw new Error('Use a valid map link.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Map links must start with http or https.');
  }
  const description = text('description');
  if (description.length > 5000) throw new Error('Description must be at most 5,000 characters.');
  return {
    owner_id: ownerId, title: required('title', 'Title'), description: description || null,
    date_iso: date, start_time: start, end_time: end || null,
    location_name: required('location_name', 'Location'), city: required('city', 'City'),
    map_url: mapUrl || null, age_min: ageMin, age_max: ageMax,
    capacity: integer('capacity', 6, 1, 2147483647),
    tags: text('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
    contact: text('contact') || null, group_id: text('group_id') || null,
    visibility: 'public', is_hidden: false,
  };
}