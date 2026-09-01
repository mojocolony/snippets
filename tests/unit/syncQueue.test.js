import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueSyncOperation, listSyncOperations, removeSyncOperation } from '../../src/cloud/syncQueue.js';
import { deleteSnippetsDb } from '../../src/storage/db.js';

test('sync queue coalesces later mutations for the same entity', async () => {
  await deleteSnippetsDb();
  await enqueueSyncOperation({ id: 'item:abc', type: 'upsert-item', payload: { id: 'abc', content: 'first' } });
  await enqueueSyncOperation({ id: 'item:abc', type: 'upsert-item', payload: { id: 'abc', content: 'second' } });
  const operations = await listSyncOperations();
  assert.equal(operations.length, 1);
  assert.equal(operations[0].payload.content, 'second');
});

test('sync queue removes completed operation', async () => {
  await deleteSnippetsDb();
  await enqueueSyncOperation({ id: 'tag:todo', type: 'upsert-tag', payload: { name: 'todo' } });
  await removeSyncOperation('tag:todo');
  assert.deepEqual(await listSyncOperations(), []);
});
