import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageGroup, requestGroupMembership } from '../lib/group-membership.js';

function fakeDatabase({ membership = null, discoverable = true, owner = 'owner', writeError = null } = {}) {
  const writes = [];
  const filters = [];
  return {
    writes, filters,
    from(table) {
      let write = false;
      const query = {
        select() { return query; },
        eq(field, value) { if (write) filters.push([field, value]); return query; },
        maybeSingle() {
          return Promise.resolve({ data: table === 'groups'
            ? { id: 'group', owner_id: owner, is_discoverable: discoverable } : membership, error: null });
        },
        insert(payload) { write = true; writes.push({ kind: 'insert', payload }); return query; },
        update(payload) { write = true; writes.push({ kind: 'update', payload }); return query; },
        single() { return Promise.resolve({ data: { status: 'pending' }, error: writeError }); },
      };
      return query;
    },
  };
}

test('owners and existing members are never downgraded by a join request', async () => {
  for (const status of ['active', 'accepted', 'approved', 'member']) {
    const db = fakeDatabase({ membership: { role: 'admin', status } });
    assert.deepEqual(await requestGroupMembership(db, 'group', 'user'), { status: 'active' });
    assert.equal(db.writes.length, 0);
  }
  const db = fakeDatabase();
  await requestGroupMembership(db, 'group', 'owner');
  assert.equal(db.writes.length, 0);
});

test('repeat pending requests do not insert or overwrite rows', async () => {
  const db = fakeDatabase({ membership: { role: 'member', status: 'pending' } });
  assert.deepEqual(await requestGroupMembership(db, 'group', 'user'), { status: 'pending' });
  assert.equal(db.writes.length, 0);
});

test('private groups cannot be joined through discovery requests', async () => {
  const db = fakeDatabase({ discoverable: false });
  await assert.rejects(requestGroupMembership(db, 'group', 'user'), (e) => e.status === 403);
  assert.equal(db.writes.length, 0);
});

test('new request always uses current user and pending member role', async () => {
  const db = fakeDatabase();
  assert.deepEqual(await requestGroupMembership(db, 'group', 'user'), { status: 'pending' });
  assert.deepEqual(db.writes, [{ kind: 'insert', payload: {
    group_id: 'group', user_id: 'user', role: 'member', status: 'pending',
  } }]);
});

test('rejected request retry is conditional so a concurrent approval cannot be overwritten', async () => {
  const db = fakeDatabase({ membership: { role: 'member', status: 'rejected' } });
  await requestGroupMembership(db, 'group', 'user');
  assert.deepEqual(db.writes[0], { kind: 'update', payload: { status: 'pending', role: 'member' } });
  assert.ok(db.filters.some(([field, value]) => field === 'status' && value === 'rejected'));
});

test('database write failures never report a successful join', async () => {
  const db = fakeDatabase({ writeError: { message: 'Permission denied' } });
  await assert.rejects(requestGroupMembership(db, 'group', 'user'), /Permission denied/);
});

test('membership management requires owner or an active admin', () => {
  const group = { owner_id: 'owner' };
  assert.equal(canManageGroup(group, 'owner', null), true);
  assert.equal(canManageGroup(group, 'user', { role: 'admin', status: 'active' }), true);
  assert.equal(canManageGroup(group, 'user', { role: 'admin', status: 'pending' }), false);
  assert.equal(canManageGroup(group, 'user', { role: 'member', status: 'active' }), false);
  assert.equal(canManageGroup(group, null, { role: 'admin', status: 'active' }), false);
});