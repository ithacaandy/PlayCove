import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEventInput, localDateIso } from '../lib/event-validation.js';

function form(overrides = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({
    title: 'Park playdate', date_iso: '2026-10-03', start_time: '10:00', end_time: '11:00',
    location_name: 'Stewart Park', city: 'Ithaca, NY', age_min: '0', age_max: '16', capacity: '6',
    ...overrides,
  })) fd.set(key, value);
  return fd;
}
const parse = (values) => parseEventInput(form(values), 'signed-in-owner', { today: '2026-09-30' });

test('event belongs to the authenticated host and ungrouped events use null', () => {
  const result = parse({ owner_id: 'forged-owner' });
  assert.equal(result.owner_id, 'signed-in-owner');
  assert.equal(result.group_id, null);
  assert.equal(result.visibility, 'public');
});
test('zero-year age range is preserved instead of being replaced by defaults', () => {
  const result = parse({ age_min: '0', age_max: '0' });
  assert.equal(result.age_max, 0);
});
test('invalid capacity cannot silently become a default capacity', () => {
  for (const value of ['0', '-1', '', '1.5', 'NaN']) assert.throws(() => parse({ capacity: value }), /capacity/);
});
test('age range must be ordered and within profile-supported ages', () => {
  assert.throws(() => parse({ age_min: '10', age_max: '5' }), /Maximum age/);
  assert.throws(() => parse({ age_max: '19' }), /age max/);
});
test('impossible and past dates are rejected', () => {
  assert.throws(() => parse({ date_iso: '2026-02-30' }), /valid event date/);
  assert.throws(() => parse({ date_iso: '2026-09-29' }), /future date/);
  assert.doesNotThrow(() => parse({ date_iso: '2026-09-30' }));
});
test('time values and same-day end ordering are validated', () => {
  assert.throws(() => parse({ start_time: '25:00' }), /valid start/);
  assert.throws(() => parse({ end_time: '09:00' }), /after start/);
});
test('whitespace titles and unsafe map links are rejected', () => {
  assert.throws(() => parse({ title: '  ' }), /Title/);
  assert.throws(() => parse({ map_url: 'javascript:alert(1)' }), /http/);
});
test('local calendar date stays on the correct day near UTC midnight', () => {
  assert.equal(localDateIso(new Date('2026-10-01T00:30:00Z')), '2026-09-30');
});
test('editing an existing past event can retain its date while still validating ages and capacity', () => {
  const options = { allowPast: true, today: '2026-09-30' };
  assert.equal(parseEventInput(form({ date_iso: '2026-09-29', age_max: '0' }), 'host', options).age_max, 0);
  assert.throws(() => parseEventInput(form({ date_iso: '2026-09-29', capacity: '0' }), 'host', options), /capacity/);
});