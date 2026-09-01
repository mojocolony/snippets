import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnippet, listSnippets } from '../../src/storage/snippetRepository.js';
import { deleteSnippetsDb } from '../../src/storage/db.js';
import { prepareCacheForUser } from '../../src/cloud/cacheOwner.js';

function localStorageStub() {
  return {
    data: new Map(),
    getItem(k) { return this.data.has(k) ? this.data.get(k) : null; },
    setItem(k,v) { this.data.set(k,String(v)); },
    removeItem(k) { this.data.delete(k); }
  };
}

test('first authenticated user adopts an existing local prototype cache', async () => {
  await deleteSnippetsDb();
  globalThis.localStorage = localStorageStub();
  await createSnippet('local prototype note', 1000);
  const result = await prepareCacheForUser('user-a');
  assert.equal(result.adoptedExistingCache, true);
  assert.equal((await listSnippets({ scope: 'all' })).length, 1);
  assert.equal(localStorage.getItem('snippets:ownerId'), 'user-a');
});

test('a different authenticated user gets an empty isolated local cache', async () => {
  await deleteSnippetsDb();
  globalThis.localStorage = localStorageStub();
  localStorage.setItem('snippets:ownerId', 'user-a');
  await createSnippet('user a', 1000);
  const result = await prepareCacheForUser('user-b');
  assert.equal(result.clearedForDifferentUser, true);
  assert.equal((await listSnippets({ scope: 'all' })).length, 0);
  assert.equal(localStorage.getItem('snippets:ownerId'), 'user-b');
});
