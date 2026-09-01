import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrashExpired, TRASH_RETENTION_MS } from '../../src/domain/trashPolicy.js';

test('trash expires at thirty days, not before', () => {
  assert.equal(isTrashExpired(1_000, 1_000 + TRASH_RETENTION_MS - 1), false);
  assert.equal(isTrashExpired(1_000, 1_000 + TRASH_RETENTION_MS), true);
});
