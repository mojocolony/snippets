import { dbGetAll, dbPut } from './db.js';
import { getSnippet, updateSnippet } from './snippetRepository.js';
import { enqueueSyncOperation } from '../cloud/syncQueue.js';

export function normalizeTag(rawName = '') {
  return String(rawName).trim().replace(/^#/, '').replace(/[<>&\"']/g, '').replace(/\s+/g, '-').toLowerCase();
}

export async function ensureTag(rawName) {
  const name = normalizeTag(rawName);
  if (!name) throw new Error('Tag name cannot be empty');
  const tag = { name, createdAt: Date.now() };
  await dbPut('tags', tag);
  await enqueueSyncOperation({ id: `tag:${name}`, type: 'upsert-tag', payload: tag });
  return name;
}

export async function toggleSnippetTag(snippetId, rawName) {
  const name = await ensureTag(rawName);
  const snippet = await getSnippet(snippetId);
  if (!snippet) throw new Error(`Snippet not found: ${snippetId}`);
  const hasTag = snippet.tags.includes(name);
  const tags = hasTag ? snippet.tags.filter(tag => tag !== name) : [...snippet.tags, name].sort();
  return updateSnippet(snippetId, { tags });
}

export async function listTagsWithCounts() {
  const [tags, snippets] = await Promise.all([dbGetAll('tags'), dbGetAll('snippets')]);
  return tags.map(({ name }) => ({
    name,
    count: snippets.filter(snippet => snippet.deletedAt == null && snippet.tags.includes(name)).length
  })).sort((a, b) => a.name.localeCompare(b.name));
}
