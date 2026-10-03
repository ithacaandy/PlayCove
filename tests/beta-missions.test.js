import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBetaAction, missionStatus } from '../lib/beta-missions.js';

test('mission API accepts only supported actions and bounded welcome steps', () => {
  for (const value of [null, [], { action: 'complete' }, { action: 'status' }, { action: 'welcome_next', payload: { step: 5 } }, { action: 'welcome_next', payload: { step: '4' } }, { action: 'start', payload: [] }]) assert.throws(() => parseBetaAction(value));
  assert.deepEqual(parseBetaAction({ action: 'welcome_next', payload: { step: 2, userId: 'forged' } }), { action: 'welcome_next', payload: { step: 2 } });
  assert.deepEqual(parseBetaAction({ action: 'start', payload: { completedAt: 'forged' } }), { action: 'start', payload: {} });
});
test('feedback validates choices and length and strips identity overrides', () => {
  assert.deepEqual(parseBetaAction({ action: 'feedback', payload: { rating: 'blocked', message: ' stuck ', userId: 'other' } }), { action: 'feedback', payload: { rating: 'blocked', message: 'stuck' } });
  for (const payload of [{ rating: 'bad', message: '' }, { rating: 'easy', message: null }, { rating: 'easy', message: 'x'.repeat(2001) }]) assert.throws(() => parseBetaAction({ action: 'feedback', payload }));
});
test('mission display distinguishes assignment, response wait, deferred and completed evidence', () => {
  assert.equal(missionStatus(null), 'Not assigned');
  assert.equal(missionStatus({}), 'Assigned');
  assert.equal(missionStatus({ startedAt: 'now' }), 'Started');
  assert.equal(missionStatus({ startedAt: 'now', outing: { ended: true } }), 'Started');
  assert.equal(missionStatus({ outing: { cancelled: false, ended: false } }), 'Waiting for a group response');
  assert.equal(missionStatus({ deferredAt: 'now' }), 'Saved for later');
  assert.equal(missionStatus({ completedAt: 'now', deferredAt: 'before' }), 'Completed');
});
