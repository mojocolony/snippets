import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLaunchTarget } from '../../src/domain/launchPolicy.js';

const snippet = (id, updatedAt, pinned = false) => ({ id, updatedAt, pinned, deletedAt: null });

test('pinned snippet overrides return-window behavior', () => {
  assert.deepEqual(
    chooseLaunchTarget({ snippets: [snippet('a', 1, true), snippet('b', 9999)], now: 10000, returnWindow: 'fresh' }),
    { type: 'snippet', id: 'a' }
  );
});

test('recent snippet reopens inside configured return window', () => {
  assert.deepEqual(
    chooseLaunchTarget({ snippets: [snippet('a', 50_000)], now: 100_000, returnWindow: '60s' }),
    { type: 'snippet', id: 'a' }
  );
});

test('old snippet returns to Inbox outside configured return window', () => {
  assert.deepEqual(
    chooseLaunchTarget({ snippets: [snippet('a', 1)], now: 100_000, returnWindow: '60s' }),
    { type: 'inbox' }
  );
});
