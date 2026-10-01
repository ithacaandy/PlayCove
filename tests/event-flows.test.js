import test from 'node:test';
import assert from 'node:assert/strict';
import { setEventRsvp } from '../lib/event-rsvp.js';
import { safeReturnPath } from '../lib/auth-navigation.js';
function client({ event = { id: 'event', owner_id: 'host', is_hidden: false }, readError = null, writeError = null } = {}) {
  const writes = [];
  return { writes, from(table) {
    if (table === 'events') return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: event, error: readError }; } };
    return { async insert(row) { writes.push(['insert', row]); return { error: writeError }; }, delete() { return { async match(row) { writes.push(['delete', row]); return { error: writeError }; } }; } };
  } };
}
test('RSVP rejects hidden, missing, host-owned events before writing', async () => {
  for (const event of [null, { is_hidden: true }, { owner_id: 'guest' }]) {
    const db = client({ event });
    await assert.rejects(setEventRsvp(db, 'event', 'guest', true));
    assert.equal(db.writes.length, 0);
  }
});
test('capacity errors surface while repeat RSVPs remain successful', async () => {
  await assert.rejects(setEventRsvp(client({ writeError: { message: 'This event is full.', code: 'P0001' } }), 'event', 'guest', true), { message: 'This event is full.' });
  await assert.doesNotReject(setEventRsvp(client({ writeError: { code: '23505' } }), 'event', 'guest', true));
});
test('cancellation targets only the current user and surfaces failure', async () => {
  const db = client();
  await setEventRsvp(db, 'event', 'guest', false);
  assert.deepEqual(db.writes, [['delete', { event_id: 'event', user_id: 'guest' }]]);
  await assert.rejects(setEventRsvp(client({ writeError: new Error('Permission denied') }), 'event', 'guest', false), /Permission denied/);
});
test('read errors and signed-out requests do not write RSVPs', async () => {
  const db = client({ readError: new Error('Network failure') });
  await assert.rejects(setEventRsvp(db, 'event', 'guest', true), /Network failure/);
  await assert.rejects(setEventRsvp(db, 'event', null, false), /sign in/);
  assert.equal(db.writes.length, 0);
});
test('sign-in return path retains local destinations and blocks external navigation', () => {
  assert.equal(safeReturnPath('/new?group=123'), '/new?group=123');
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/auth', '/auth/reset', null, '/\nevil']) assert.equal(safeReturnPath(path), '/');
});
test('cancelled events reject new RSVPs before writing', async () => {
 const db=client({event:{id:'event',owner_id:'host',cancelled_at:'2026-10-01T12:00:00Z'}});
 await assert.rejects(setEventRsvp(db,'event','guest',true),/cancelled/);
 assert.equal(db.writes.length,0);
});
