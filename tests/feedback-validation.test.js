import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeedback, feedbackPagePath } from '../lib/feedback-validation.js';
import { safeReturnPath } from '../lib/auth-navigation.js';

test('feedback strips query tokens and fragments and rejects external destinations', () => {
  assert.equal(feedbackPagePath('/invite?token=secret#fragment'), '/invite');
  for (const value of ['https://example.com', '//example.com', '/invite%3Ftoken=secret', '/a\\b', null]) assert.equal(feedbackPagePath(value), '/');
});
test('feedback requires useful bounded text and known categories; ignores identity fields', () => {
  assert.deepEqual(parseFeedback({ category: 'bug', message: '  The button does not work.  ', page_path: '/mine', reporter_id: 'other' }), { category: 'bug', message: 'The button does not work.', page_path: '/mine' });
  for (const value of [null, { category: 'admin', message: 'A valid long message' }, { category: 'bug', message: 'short' }, { category: 'idea', message: 'x'.repeat(2001) }]) assert.throws(() => parseFeedback(value));
});
test('recovery callback can reach password form while other auth returns stay blocked', () => {
  assert.equal(safeReturnPath('/auth/update-password'), '/auth/update-password');
  assert.equal(safeReturnPath('/auth'), '/');
  assert.equal(safeReturnPath('/auth/callback'), '/');
  assert.equal(safeReturnPath('//evil.example/auth/update-password'), '/');
});
