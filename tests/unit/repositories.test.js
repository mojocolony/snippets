import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnippet, getSnippet, listSnippets, updateSnippet, setPinnedSnippet,
  moveToTrash, restoreSnippet, purgeExpiredTrash
} from '../../src/storage/snippetRepository.js';
import { toggleSnippetTag, setSnippetTag, listTagsWithCounts, normalizeTag } from '../../src/storage/tagRepository.js';
import { getPreferences, setPreference } from '../../src/storage/preferencesRepository.js';
import { deleteSnippetsDb } from '../../src/storage/db.js';

async function reset() {
  await deleteSnippetsDb();
  globalThis.localStorage = {
    _data: new Map(),
    getItem(k) { return this._data.has(k) ? this._data.get(k) : null; },
    setItem(k, v) { this._data.set(k, String(v)); },
    clear() { this._data.clear(); }
  };
}

test('repository creates and lists modified-first', async () => {
  await reset();
  const a = await createSnippet('older', 1_000);
  const b = await createSnippet('newer', 2_000);
  assert.deepEqual((await listSnippets({ scope: 'inbox' })).map(x => x.id), [b.id, a.id]);
});

test('only one snippet may be pinned', async () => {
  await reset();
  const a = await createSnippet('a', 1_000);
  const b = await createSnippet('b', 2_000);
  await setPinnedSnippet(a.id);
  await setPinnedSnippet(b.id);
  assert.equal((await getSnippet(a.id)).pinned, false);
  assert.equal((await getSnippet(b.id)).pinned, true);
});

test('archive and star remain independent properties', async () => {
  await reset();
  const item = await createSnippet('both', 1_000);
  await updateSnippet(item.id, { starred: true, archived: true }, 2_000);
  assert.equal((await listSnippets({ scope: 'inbox' })).length, 0);
  assert.equal((await listSnippets({ scope: 'starred' })).length, 1);
  assert.equal((await listSnippets({ scope: 'archive' })).length, 1);
});

test('trash restore and purge preserve metadata', async () => {
  await reset();
  const item = await createSnippet('trash me', 1_000);
  await updateSnippet(item.id, { starred: true, tags: ['keep'] }, 1_500);
  await moveToTrash(item.id, 2_000);
  await restoreSnippet(item.id);
  const restored = await getSnippet(item.id);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.starred, true);
  assert.deepEqual(restored.tags, ['keep']);
  await moveToTrash(item.id, 0);
  assert.equal(await purgeExpiredTrash(31 * 24 * 60 * 60 * 1000), 1);
  assert.equal(await getSnippet(item.id), undefined);
});

test('tags toggle globally with counts', async () => {
  await reset();
  const a = await createSnippet('a', 1_000);
  const b = await createSnippet('b', 2_000);
  await toggleSnippetTag(a.id, '#Macbeth');
  await toggleSnippetTag(b.id, 'macbeth');
  assert.deepEqual(await listTagsWithCounts(), [{ name: 'macbeth', count: 2 }]);
});

test('batch tag primitive can force a tag on or off without toggling mixed state', async () => {
  await reset();
  const item = await createSnippet('tag me', 1_000);
  await setSnippetTag(item.id, 'research', true);
  await setSnippetTag(item.id, 'research', true);
  assert.deepEqual((await getSnippet(item.id)).tags, ['research']);
  await setSnippetTag(item.id, 'research', false);
  assert.deepEqual((await getSnippet(item.id)).tags, []);
});

test('tag normalization removes HTML metacharacters from user input', () => {
  assert.equal(normalizeTag(' #<Macbeth>&" '), 'macbeth');
});

test('preferences have approved defaults and persist', async () => {
  await reset();
  assert.equal((await getPreferences()).returnWindow, '60s');
  assert.equal((await getPreferences()).editorFont, 'ia-writer-duo');
  assert.equal((await getPreferences()).sidebarCollapsed, false);
  assert.equal((await getPreferences()).keyboardShortcuts.newSnippet, 'Mod+N');
  await setPreference('themeMode', 'dark');
  assert.equal((await getPreferences()).themeMode, 'dark');
  assert.equal(localStorage.getItem('snippets:themeMode'), 'dark');
});

test('repository mutations enqueue cloud sync operations without delaying local writes', async () => {
  await reset();
  const { listSyncOperations } = await import('../../src/cloud/syncQueue.js');
  const item = await createSnippet('sync me', 1_000);
  await updateSnippet(item.id, { starred: true }, 2_000);
  await toggleSnippetTag(item.id, 'cloud');
  await setPreference('fontSize', 20);
  const operations = await listSyncOperations();
  const itemOp = operations.find(op => op.id === `item:${item.id}`);
  assert.equal(itemOp.type, 'upsert-item');
  assert.equal(itemOp.payload.starred, true);
  assert.deepEqual(itemOp.payload.tags, ['cloud']);
  assert.equal(operations.some(op => op.id === 'tag:cloud' && op.type === 'upsert-tag'), true);
  assert.equal(operations.some(op => op.id === 'preferences' && op.type === 'upsert-preferences'), true);
});
