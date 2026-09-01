import { dbClear, dbGetAll, dbPut } from '../storage/db.js';
import { getPreferences } from '../storage/preferencesRepository.js';
import { snippetToRow, rowToSnippet, preferencesToRow, rowToPreferences } from './cloudModels.js';
import { enqueueSyncOperation, listSyncOperations, removeSyncOperation } from './syncQueue.js';

function throwIfError(result) {
  if (result?.error) throw result.error;
  return result;
}

async function executeOperation(client, userId, operation) {
  if (operation.type === 'upsert-item') {
    return throwIfError(await client.from('snippets_items').upsert(snippetToRow(operation.payload, userId)));
  }
  if (operation.type === 'delete-item') {
    return throwIfError(await client.from('snippets_items').delete().eq('id', operation.payload.id).eq('user_id', userId));
  }
  if (operation.type === 'upsert-tag') {
    const row = { user_id: userId, name: operation.payload.name };
    if (operation.payload.createdAt) row.created_at = new Date(operation.payload.createdAt).toISOString();
    return throwIfError(await client.from('snippets_tags').upsert(row, { onConflict: 'user_id,name' }));
  }
  if (operation.type === 'upsert-preferences') {
    return throwIfError(await client.from('snippets_preferences').upsert(preferencesToRow(operation.payload, userId)));
  }
  throw new Error(`Unknown sync operation: ${operation.type}`);
}

export async function flushCloudQueue(client, userId) {
  const operations = await listSyncOperations();
  let completed = 0;
  let failed = 0;
  const errors = [];
  for (const operation of operations) {
    try {
      await executeOperation(client, userId, operation);
      await removeSyncOperation(operation.id);
      completed += 1;
    } catch (error) {
      failed += 1;
      errors.push({ operationId: operation.id, error });
    }
  }
  return { completed, failed, errors };
}

async function fetchOwnRows(client, table, userId) {
  const result = await client.from(table).select('*').eq('user_id', userId);
  throwIfError(result);
  return result.data || [];
}

export async function pullCloudState(client, userId) {
  const [itemRows, tagRows, preferenceRows] = await Promise.all([
    fetchOwnRows(client, 'snippets_items', userId),
    fetchOwnRows(client, 'snippets_tags', userId),
    fetchOwnRows(client, 'snippets_preferences', userId)
  ]);

  await dbClear('snippets');
  for (const row of itemRows) await dbPut('snippets', rowToSnippet(row));

  await dbClear('tags');
  for (const row of tagRows) {
    await dbPut('tags', { name: row.name, createdAt: new Date(row.created_at || Date.now()).getTime() });
  }

  if (preferenceRows[0]) {
    const preferences = rowToPreferences(preferenceRows[0]);
    await dbClear('preferences');
    for (const [key, value] of Object.entries(preferences)) await dbPut('preferences', { key, value });
    if (preferences.themeMode) localStorage.setItem('snippets:themeMode', preferences.themeMode);
  }

  return { itemCount: itemRows.length, tagCount: tagRows.length, preferencesMissing: !preferenceRows[0] };
}

export async function enqueueLocalSnapshot() {
  const [snippets, tags, preferences] = await Promise.all([
    dbGetAll('snippets'), dbGetAll('tags'), getPreferences()
  ]);
  for (const snippet of snippets) {
    await enqueueSyncOperation({ id: `item:${snippet.id}`, type: 'upsert-item', payload: snippet });
  }
  for (const tag of tags) {
    await enqueueSyncOperation({ id: `tag:${tag.name}`, type: 'upsert-tag', payload: tag });
  }
  await enqueueSyncOperation({ id: 'preferences', type: 'upsert-preferences', payload: preferences });
}

export async function initialCloudSync(client, userId, { adoptExistingCache = false } = {}) {
  if (adoptExistingCache) await enqueueLocalSnapshot();
  const flushed = await flushCloudQueue(client, userId);
  if (flushed.failed) return { online: false, flushed, pulled: null };

  const pulled = await pullCloudState(client, userId);
  if (pulled.preferencesMissing) {
    await enqueueSyncOperation({ id: 'preferences', type: 'upsert-preferences', payload: await getPreferences() });
    await flushCloudQueue(client, userId);
  }
  return { online: true, flushed, pulled };
}

export function startCloudSync(client, userId, { intervalMs = 2500, onError = console.warn } = {}) {
  let stopped = false;
  let running = false;
  async function flush() {
    if (stopped || running) return;
    running = true;
    try { await flushCloudQueue(client, userId); }
    catch (error) { onError(error); }
    finally { running = false; }
  }
  async function reconcile() {
    if (stopped || running) return;
    running = true;
    try {
      const result = await flushCloudQueue(client, userId);
      if (!result.failed) await pullCloudState(client, userId);
    } catch (error) { onError(error); }
    finally { running = false; }
  }
  const timer = setInterval(flush, intervalMs);
  const onOnline = () => reconcile();
  const onFocus = () => reconcile();
  globalThis.addEventListener?.('online', onOnline);
  globalThis.addEventListener?.('focus', onFocus);
  return () => {
    stopped = true;
    clearInterval(timer);
    globalThis.removeEventListener?.('online', onOnline);
    globalThis.removeEventListener?.('focus', onFocus);
  };
}
