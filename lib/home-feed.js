const EVENT_FIELDS = 'id, owner_id, cancelled_at, title, description, date_iso, start_time, end_time, city, location_name, created_at, image_url';
const PROFILE_FIELDS = 'id, full_name, avatar_url';

function rows(result) {
  if (result.error) throw result.error;
  return result.data || [];
}

// Profile reads run alongside the event reads. Cards can render before names arrive.
export async function loadHomeFeed(client, userId, today, onEvents = () => {}) {
  const profilePromise = Promise.resolve(client.from('profiles').select(PROFILE_FIELDS)
    .eq('id', userId).maybeSingle()).catch(() => ({ data: null }));
  const [mine, rsvpList] = await Promise.all([
    client.from('events').select(EVENT_FIELDS).eq('owner_id', userId)
      .gte('date_iso', today).order('date_iso', { ascending: true }),
    client.from('rsvps').select('event_id').eq('user_id', userId),
  ]);
  const hosted = rows(mine);
  const ids = [...new Set(rows(rsvpList).map(row => row.event_id).filter(Boolean))];
  const going = ids.length ? rows(await client.from('events').select(EVENT_FIELDS)
    .in('id', ids).gte('date_iso', today).order('date_iso', { ascending: true }))
    .filter(event => event.owner_id !== userId) : [];
  const initial = { profile: null, hosted, going };
  onEvents(initial);
  const ownerIds = [...new Set([...hosted, ...going].map(event => event.owner_id).filter(Boolean))];
  const [profileResult, ownersResult] = await Promise.all([
    profilePromise,
    ownerIds.length ? Promise.resolve(client.from('profiles').select(PROFILE_FIELDS)
      .in('id', ownerIds)).catch(() => ({ data: [] })) : { data: [] },
  ]);
  const owners = new Map((ownersResult.data || []).map(profile => [profile.id, profile]));
  const withOwners = events => events.map(event => ({ ...event,
    owner: owners.get(event.owner_id) || { full_name: '', avatar_url: null },
  }));
  return { profile: profileResult.data || null, hosted: withOwners(hosted), going: withOwners(going) };
}

// One account, one recent snapshot, no localStorage or cross-user persistence.
export function createHomeFeedStore({ now = Date.now, maxAge = 60000 } = {}) {
  let account = null, generation = 0, snapshot = null, pending = null;
  const listeners = new Set();
  const notify = value => listeners.forEach(listener => listener(value));
  return {
    setAccount(userId) {
      if (account === userId) return;
      account = userId;
      generation++;
      snapshot = pending = null;
      notify(null);
    },
    clear() {
      generation++;
      snapshot = pending = null;
      notify(null);
    },
    read(userId, today) {
      return userId && account === userId && snapshot?.today === today &&
        now() - snapshot.updatedAt < maxAge ? snapshot.value : null;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refresh(client, userId, today) {
      this.setAccount(userId);
      if (!userId) return Promise.resolve(null);
      if (pending?.today === today) return pending.promise;
      const version = generation;
      const publish = value => {
        if (version !== generation || account !== userId) return;
        snapshot = { today, updatedAt: now(), value };
        notify(value);
      };
      const promise = loadHomeFeed(client, userId, today, publish).then(value => {
        publish(value);
        return value;
      }).catch(error => {
        if (version === generation) { snapshot = null; notify(null); }
        throw error;
      }).finally(() => { if (pending?.promise === promise) pending = null; });
      pending = { today, promise };
      return promise;
    },
  };
}

export const homeFeedStore = createHomeFeedStore();
