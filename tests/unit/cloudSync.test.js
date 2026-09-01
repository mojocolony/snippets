import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteSnippetsDb } from '../../src/storage/db.js';
import { enqueueSyncOperation, listSyncOperations } from '../../src/cloud/syncQueue.js';
import { flushCloudQueue } from '../../src/cloud/cloudSync.js';

function fakeClient(log) {
  return {
    from(table) {
      return {
        async upsert(row) { log.push({ action: 'upsert', table, row }); return { error: null }; },
        delete() {
          return {
            eq(column, value) {
              return {
                async eq(column2, value2) {
                  log.push({ action: 'delete', table, filters: [[column, value],[column2, value2]] });
                  return { error: null };
                }
              };
            }
          };
        }
      };
    }
  };
}

test('flushCloudQueue writes isolated snippets tables and removes successful operations', async () => {
  await deleteSnippetsDb();
  await enqueueSyncOperation({
    id: 'item:11111111-1111-4111-8111-111111111111', type: 'upsert-item',
    payload: { id: '11111111-1111-4111-8111-111111111111', content: 'cloud', tags: [], starred: false, archived: false, pinned: false, sourceUrl: null, deletedAt: null, createdAt: 1000, updatedAt: 2000 }
  });
  await enqueueSyncOperation({ id: 'tag:todo', type: 'upsert-tag', payload: { name: 'todo', createdAt: 1000 } });
  const log = [];
  const result = await flushCloudQueue(fakeClient(log), '22222222-2222-4222-8222-222222222222');
  assert.equal(result.completed, 2);
  assert.deepEqual(await listSyncOperations(), []);
  assert.equal(log[0].table, 'snippets_items');
  assert.equal(log[0].row.user_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(log[1].table, 'snippets_tags');
});

test('flushCloudQueue keeps failed operations for a later retry', async () => {
  await deleteSnippetsDb();
  await enqueueSyncOperation({ id: 'preferences', type: 'upsert-preferences', payload: { themeMode: 'dark', editorFont: 'ia-writer-duo', fontSize: 18, returnWindow: '60s', sidebarCollapsed: false, keyboardShortcuts: {} } });
  const client = { from: () => ({ async upsert() { return { error: new Error('offline') }; } }) };
  const result = await flushCloudQueue(client, '22222222-2222-4222-8222-222222222222');
  assert.equal(result.failed, 1);
  assert.equal((await listSyncOperations()).length, 1);
});
