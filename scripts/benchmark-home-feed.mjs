// Synthetic request latency only: no database, credentials, or external requests.
import { performance } from 'node:perf_hooks';
import { loadHomeFeed, createHomeFeedStore } from '../lib/home-feed.js';

const latency = Number(process.argv[2] || 100);
if (!Number.isFinite(latency) || latency < 0 || latency > 5000) throw new Error('Use a latency between 0 and 5000 ms.');
const today = '2026-10-03';
const client = { from(table) {
  let single = false, joined = false;
  return {
    select() { return this; }, eq() { return this; }, gte() { return this; }, order() { return this; },
    in() { joined = true; return this; }, maybeSingle() { single = true; return this; },
    then(resolve, reject) {
      const data = table === 'profiles' ? (single ? { id: 'self', full_name: 'Test' } : []) :
        table === 'rsvps' ? [{ event_id: 'joined' }] : [{ id: joined ? 'joined' : 'hosted', owner_id: joined ? 'other' : 'self', date_iso: today }];
      return new Promise(done => setTimeout(() => done({ data }), latency)).then(resolve, reject);
    },
  };
} };
const start = performance.now();
await client.from('profiles').select().eq().maybeSingle();
await Promise.all([client.from('events').select().eq(), client.from('rsvps').select().eq()]);
await client.from('events').select().in();
await client.from('profiles').select().in();
const before = performance.now() - start;
let cards;
const improvedStart = performance.now();
await loadHomeFeed(client, 'self', today, () => { cards = performance.now() - improvedStart; });
const complete = performance.now() - improvedStart;
const store = createHomeFeedStore();
await store.refresh(client, 'self', today);
const cachedStart = performance.now();
store.read('self', today);
console.log(JSON.stringify({ simulatedRequestLatencyMs: latency, beforeCardsMs: Math.round(before),
  afterCardsMs: Math.round(cards), afterOwnerDetailsMs: Math.round(complete),
  repeatVisitCacheReadMs: +(performance.now() - cachedStart).toFixed(3),
  note: 'Synthetic comparison, excluding auth, JavaScript download, rendering, and actual Supabase latency.' }, null, 2));
