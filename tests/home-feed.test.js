import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeFeedStore, loadHomeFeed } from '../lib/home-feed.js';

const today = '2026-10-03';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function database({ profile, owners, mine, rsvps, going } = {}) {
  const calls = [];
  return { calls, from(table) {
    const filters = {};
    const query = {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; },
      in(key, value) { filters[key] = value; return this; },
      gte(key, value) { filters[key] = value; return this; }, order() { return this; },
      maybeSingle() { filters.single = true; return this; },
      then(resolve, reject) {
        const kind = table === 'profiles' ? (filters.single ? 'profile' : 'owners') :
          table === 'rsvps' ? 'rsvps' : filters.id ? 'going' : 'mine';
        calls.push({ kind, filters });
        const result = { profile, owners, mine, rsvps, going }[kind] || { data: [] };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  } };
}

test('event cards arrive while the account profile and owner names are still loading', async () => {
  const profile = deferred(), owners = deferred(), cards = deferred();
  const db = database({ profile: profile.promise, owners: owners.promise,
    mine: { data: [{ id: 'hosted', owner_id: 'alice', date_iso: today }] } });
  const loading = loadHomeFeed(db, 'alice', today, cards.resolve);
  const initial = await cards.promise;
  assert.equal(initial.hosted[0].id, 'hosted');
  assert.equal(initial.profile, null);
  assert.deepEqual(db.calls.slice(0, 3).map(call => call.kind).sort(), ['mine', 'profile', 'rsvps']);
  profile.resolve({ data: { id: 'alice', full_name: 'Alice' } });
  owners.resolve({ data: [{ id: 'alice', full_name: 'Alice' }] });
  assert.equal((await loading).hosted[0].owner.full_name, 'Alice');
});

test('RSVP details filter upcoming events on the server and exclude hosted duplicates', async () => {
  const db = database({ rsvps: { data: [{ event_id: 'joined' }, { event_id: 'joined' }] },
    going: { data: [{ id: 'joined', owner_id: 'bob' }, { id: 'self', owner_id: 'alice' }] } });
  const feed = await loadHomeFeed(db, 'alice', today);
  assert.deepEqual(feed.going.map(event => event.id), ['joined']);
  assert.deepEqual(db.calls.find(call => call.kind === 'going').filters, { id: ['joined'], date_iso: today });
});

test('repeat visits reuse a snapshot immediately but still refresh changed events', async () => {
  const store = createHomeFeedStore();
  await store.refresh(database({ mine: { data: [{ id: 'old' }] } }), 'alice', today);
  assert.equal(store.read('alice', today).hosted[0].id, 'old');
  await store.refresh(database({ mine: { data: [{ id: 'updated' }] } }), 'alice', today);
  assert.equal(store.read('alice', today).hosted[0].id, 'updated');
});

test('expired snapshots and snapshots from a different date or account are not reused', async () => {
  let clock = 100;
  const store = createHomeFeedStore({ now: () => clock, maxAge: 1000 });
  await store.refresh(database(), 'alice', today);
  assert.ok(store.read('alice', today));
  assert.equal(store.read('bob', today), null);
  assert.equal(store.read('alice', '2026-10-04'), null);
  clock = 1100;
  assert.equal(store.read('alice', today), null);
});

test('account changes and sign-out prevent old in-flight responses from restoring private data', async () => {
  const store = createHomeFeedStore(), delayed = deferred();
  const loading = store.refresh(database({ mine: delayed.promise }), 'alice', today);
  store.setAccount('bob');
  await store.refresh(database({ mine: { data: [{ id: 'bob-event' }] } }), 'bob', today);
  delayed.resolve({ data: [{ id: 'alice-event' }] });
  await loading;
  assert.equal(store.read('alice', today), null);
  assert.equal(store.read('bob', today).hosted[0].id, 'bob-event');
  store.setAccount(null);
  assert.equal(store.read('bob', today), null);
});

test('overlapping refreshes share one request chain', async () => {
  const delayed = deferred(), store = createHomeFeedStore(), db = database({ mine: delayed.promise });
  const first = store.refresh(db, 'alice', today);
  const second = store.refresh(db, 'alice', today);
  assert.equal(first, second);
  delayed.resolve({ data: [] });
  await first;
  assert.equal(db.calls.filter(call => call.kind === 'mine').length, 1);
});

test('failed event reads clear the snapshot instead of presenting stale or unauthorized data', async () => {
  const store = createHomeFeedStore();
  await store.refresh(database(), 'alice', today);
  await assert.rejects(store.refresh(database({ mine: { error: new Error('Access denied') } }), 'alice', today), /Access denied/);
  assert.equal(store.read('alice', today), null);
});
