// Calendar dates are computed in UTC to keep local wall-clock times unchanged across DST.
export function recurrenceDates(start, settings = {}) {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  if (!validDate(start)) throw new Error('Choose a valid first date.');
  const frequency = settings.frequency || 'none';
  if (frequency === 'none') return [start];
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) throw new Error('Choose a valid repeat pattern.');
  const interval = Number(settings.interval || 1);
  if (!Number.isInteger(interval) || interval < 1 || interval > 30) throw new Error('Repeat interval must be from 1 to 30.');
  const byCount = settings.endMode === 'count';
  const count = Number(settings.count);
  if (byCount && (!Number.isInteger(count) || count < 2 || count > 52)) throw new Error('Choose 2 to 52 occurrences.');
  if (!byCount && (!validDate(settings.until) || settings.until < start)) throw new Error('Choose an end date on or after the first date.');
  const base = new Date(start + 'T12:00:00Z');
  const dates = [];
  if (frequency === 'weekly') {
    const weekdays = settings.weekdays == null ? [base.getUTCDay()] : settings.weekdays.map(Number);
    if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('Select at least one valid weekday.');
    const mondayOffset = (base.getUTCDay() + 6) % 7;
    // Week intervals are anchored to Monday of the first date's calendar week.
    for (let offset = 0; offset <= 52 * 30 * 7 + 7; offset++) {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + offset);
      const iso = date.toISOString().slice(0, 10);
      if (!byCount && iso > settings.until) break;
      if (Math.floor((offset + mondayOffset) / 7) % interval !== 0 || !weekdays.includes(date.getUTCDay())) continue;
      if (dates.length === 52) throw new Error('Limit a series to 52 occurrences. Choose an earlier end date.');
      dates.push(iso);
      if (byCount && dates.length === count) break;
    }
    if (dates.length < 2) throw new Error('The repeat pattern must include at least two dates.');
    return dates;
  }
  for (let index = 0; index <= 52; index++) {
    let date = new Date(base);
    if (frequency === 'daily' || frequency === 'weekly') date.setUTCDate(base.getUTCDate() + index * interval * (frequency === 'weekly' ? 7 : 1));
    else {
      const month = base.getUTCMonth() + (frequency === 'monthly' ? index * interval : 0);
      const year = base.getUTCFullYear() + (frequency === 'yearly' ? index * interval : 0);
      // Short months use their last day; each later occurrence returns to the original day.
      date = new Date(Date.UTC(year, month, 1, 12));
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCDate(Math.min(base.getUTCDate(), lastDay));
    }
    const iso = date.toISOString().slice(0, 10);
    if (byCount ? dates.length === count : iso > settings.until) break;
    if (dates.length === 52) throw new Error('Limit a series to 52 occurrences. Choose an earlier end date.');
    dates.push(iso);
  }
  if (dates.length < 2) throw new Error('The repeat pattern must include at least two dates.');
  return dates;
}
export function recurrenceFromForm(fd) {
  return { frequency: fd.get('repeat_frequency'), interval: fd.get('repeat_interval'), endMode: fd.get('repeat_end_mode'), count: fd.get('repeat_count'), until: fd.get('repeat_until'), weekdays: fd.get('repeat_frequency') === 'weekly' ? fd.getAll('repeat_weekday') : undefined };
}
