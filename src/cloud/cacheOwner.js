import { dbGetAll, deleteSnippetsDb } from '../storage/db.js';

const OWNER_KEY = 'snippets:ownerId';

async function hasLocalData() {
  const [snippets, tags, preferences, queue] = await Promise.all([
    dbGetAll('snippets'), dbGetAll('tags'), dbGetAll('preferences'), dbGetAll('syncQueue')
  ]);
  return snippets.length + tags.length + preferences.length + queue.length > 0;
}

export async function prepareCacheForUser(userId) {
  const owner = localStorage.getItem(OWNER_KEY);
  if (!owner) {
    const adoptedExistingCache = await hasLocalData();
    localStorage.setItem(OWNER_KEY, userId);
    return { adoptedExistingCache, clearedForDifferentUser: false };
  }
  if (owner === userId) return { adoptedExistingCache: false, clearedForDifferentUser: false };

  await deleteSnippetsDb();
  localStorage.removeItem?.('snippets:themeMode');
  localStorage.setItem(OWNER_KEY, userId);
  return { adoptedExistingCache: false, clearedForDifferentUser: true };
}
