import test from 'node:test';
import assert from 'node:assert/strict';
import { recurrenceDates } from '../lib/event-recurrence.js';
const settings = (frequency, count = 4, interval = 1) => ({ frequency, count, interval, endMode: 'count' });
test('daily interval and weekly DST keep calendar days', () => {
 assert.deepEqual(recurrenceDates('2026-03-07', settings('daily', 3, 2)), ['2026-03-07', '2026-03-09', '2026-03-11']);
 assert.deepEqual(recurrenceDates('2026-03-01', settings('weekly', 3)), ['2026-03-01', '2026-03-08', '2026-03-15']);
});
test('short months clamp without drifting the original day', () => {
 assert.deepEqual(recurrenceDates('2026-01-31', settings('monthly', 3)), ['2026-01-31', '2026-02-28', '2026-03-31']);
});
test('yearly leap day returns on the next leap year', () => {
 assert.deepEqual(recurrenceDates('2028-02-29', settings('yearly', 3, 2)), ['2028-02-29', '2030-02-28', '2032-02-29']);
});
test('end date is inclusive and occurrence limits are enforced', () => {
 assert.deepEqual(recurrenceDates('2026-10-01', { frequency: 'weekly', until: '2026-10-15' }), ['2026-10-01', '2026-10-08', '2026-10-15']);
 assert.throws(() => recurrenceDates('2026-10-01', { frequency: 'daily', until: '2027-10-01' }), /52/);
 assert.throws(() => recurrenceDates('2026-10-01', settings('weekly', 100)), /52/);
});
test('invalid dates and incomplete or forged patterns are rejected', () => {
 for (const start of ['garbage', '2026-02-30']) assert.throws(() => recurrenceDates(start));
 assert.throws(() => recurrenceDates('2026-10-01', {frequency: 'daily'}));
 assert.throws(() => recurrenceDates('2026-10-01', settings('hourly')));
 assert.throws(() => recurrenceDates('2026-10-01', settings('weekly', 3, -1)));
});

test('multiple weekdays use Monday anchored alternate weeks', () => {
 assert.deepEqual(recurrenceDates('2026-10-01', {...settings('weekly', 4, 2), weekdays:[1,5]}), ['2026-10-02','2026-10-12','2026-10-16','2026-10-26']);
});
test('weekday selection excludes earlier days and respects the inclusive end date', () => {
 assert.deepEqual(recurrenceDates('2026-10-01', {frequency:'weekly',weekdays:[2,4],until:'2026-10-08'}), ['2026-10-01','2026-10-06','2026-10-08']);
 assert.throws(() => recurrenceDates('2026-10-01', {...settings('weekly'),weekdays:[]}), /weekday/);
 assert.throws(() => recurrenceDates('2026-10-01', {...settings('weekly'),weekdays:[7]}), /weekday/);
});
