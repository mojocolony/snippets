import { dbDelete, dbGet, dbGetAll, dbPut, withReadWriteStore } from './db.js';
import { isTrashExpired } from '../domain/trashPolicy.js';
import { enqueueSyncOperation } from '../cloud/syncQueue.js';

function makeSnippet(content, now, options = {}) {
  return {
    id: crypto.randomUUID(),
    content: String(content),
    createdAt: now,
    updatedAt: now,
    starred: false,
    archived: false,
    deletedAt: null,
    pinned: false,
    tags: Array.isArray(options.tags) ? [...options.tags] : [],
    sourceUrl: options.sourceUrl || null
  };
}

export async function createSnippet(content, now = Date.now(), options = {}) {
  const snippet = makeSnippet(content, now, options);
  await dbPut('snippets', snippet);
  await enqueueSyncOperation({ id: `item:${snippet.id}`, type: 'upsert-item', payload: snippet });
  return snippet;
}

export function getSnippet(id) { return dbGet('snippets', id); }

export async function updateSnippet(id, patch, now = Date.now()) {
  const current = await getSnippet(id);
  if (!current) throw new Error(`Snippet not found: ${id}`);
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: now };
  await dbPut('snippets', next);
  await enqueueSyncOperation({ id: `item:${next.id}`, type: 'upsert-item', payload: next });
  return next;
}

export async function removeSnippetIfEmpty(id) {
  const current = await getSnippet(id);
  if (!current || current.content.trim()) return false;
  await dbDelete('snippets', id);
  await enqueueSyncOperation({ id: `item:${id}`, type: 'delete-item', payload: { id } });
  return true;
}

export async function listSnippets({ scope = 'inbox', tag = null, query = '' } = {}) {
  const all = await dbGetAll('snippets');
  const q = String(query).trim().toLowerCase();
  return all.filter(item => {
    if (scope === 'trash') return item.deletedAt != null;
    if (item.deletedAt != null) return false;
    if (scope === 'inbox' && item.archived) return false;
    if (scope === 'starred' && !item.starred) return false;
    if (scope === 'archive' && !item.archived) return false;
    if (!['inbox', 'starred', 'archive', 'all'].includes(scope)) return false;
    if (tag && !item.tags.includes(tag)) return false;
    if (q && !`${item.content}\n${item.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function setPinnedSnippet(id = null) {
  const changed = [];
  await withReadWriteStore('snippets', async (store, toPromise) => {
    const all = await toPromise(store.getAll());
    for (const item of all) {
      const nextPinned = item.id === id && item.deletedAt == null;
      if (item.pinned !== nextPinned) {
        const next = { ...item, pinned: nextPinned, updatedAt: Date.now() };
        store.put(next);
        changed.push(next);
      }
    }
  });
  for (const item of changed) {
    await enqueueSyncOperation({ id: `item:${item.id}`, type: 'upsert-item', payload: item });
  }
}

export async function moveToTrash(id, now = Date.now()) {
  const current = await getSnippet(id);
  if (!current) return;
  const next = { ...current, deletedAt: now, pinned: false, updatedAt: now };
  await dbPut('snippets', next);
  await enqueueSyncOperation({ id: `item:${id}`, type: 'upsert-item', payload: next });
}

export async function restoreSnippet(id) {
  const current = await getSnippet(id);
  if (!current) return;
  const next = { ...current, deletedAt: null, updatedAt: Date.now() };
  await dbPut('snippets', next);
  await enqueueSyncOperation({ id: `item:${id}`, type: 'upsert-item', payload: next });
}

export async function deleteSnippetPermanently(id) {
  await dbDelete('snippets', id);
  await enqueueSyncOperation({ id: `item:${id}`, type: 'delete-item', payload: { id } });
}

export async function purgeExpiredTrash(now = Date.now()) {
  const all = await dbGetAll('snippets');
  const expired = all.filter(item => isTrashExpired(item.deletedAt, now));
  for (const item of expired) {
    await dbDelete('snippets', item.id);
    await enqueueSyncOperation({ id: `item:${item.id}`, type: 'delete-item', payload: { id: item.id } });
  }
  return expired.length;
}
