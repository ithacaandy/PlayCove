import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBetaAccess } from '../lib/beta-access.js';

test('disabled gate leaves existing deployments usable without a database change', async () => {
  assert.deepEqual(await checkBetaAccess({ rpc() { throw new Error('must not call'); } }, false), { allowed: true, unavailable: false });
});
test('only an explicit successful database authorization grants access', async () => {
  for (const data of [false, null, undefined, 'true', 1, { allowed: true }]) {
    assert.equal((await checkBetaAccess({ rpc: async () => ({ data, error: null }) }, true)).allowed, false);
  }
  assert.equal((await checkBetaAccess({ rpc: async () => ({ data: true, error: null }) }, true)).allowed, true);
});
test('database errors and unavailable RPCs fail closed', async () => {
  for (const rpc of [async () => ({ data: true, error: { message: 'missing function' } }), async () => { throw new Error('offline'); }]) {
    assert.deepEqual(await checkBetaAccess({ rpc }, true), { allowed: false, unavailable: true });
  }
});
