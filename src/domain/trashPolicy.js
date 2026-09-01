export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function isTrashExpired(deletedAt, now = Date.now()) {
  return deletedAt != null && now - deletedAt >= TRASH_RETENTION_MS;
}
