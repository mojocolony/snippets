import { dbDelete, dbGetAll, dbPut } from '../storage/db.js';

export async function enqueueSyncOperation(operation) {
  if (!operation?.id || !operation?.type) throw new Error('Sync operation requires id and type');
  const next = {
    id: String(operation.id),
    type: String(operation.type),
    payload: operation.payload ?? null,
    queuedAt: Date.now()
  };
  await dbPut('syncQueue', next);
  return next;
}

export async function listSyncOperations() {
  const rows = await dbGetAll('syncQueue');
  return rows.sort((a, b) => a.queuedAt - b.queuedAt);
}

export function removeSyncOperation(id) {
  return dbDelete('syncQueue', id);
}
