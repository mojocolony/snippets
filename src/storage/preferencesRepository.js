import { dbGetAll, dbPut } from './db.js';
import { DEFAULT_SHORTCUTS } from '../domain/keyboardShortcuts.js';
import { enqueueSyncOperation } from '../cloud/syncQueue.js';

export const DEFAULT_PREFERENCES = Object.freeze({
  themeMode: 'system',
  editorFont: 'ia-writer-duo',
  fontSize: 20,
  returnWindow: '60s',
  sidebarCollapsed: false,
  keyboardShortcuts: { ...DEFAULT_SHORTCUTS }
});

export async function getPreferences() {
  const rows = await dbGetAll('preferences');
  const prefs = rows.reduce((current, row) => ({ ...current, [row.key]: row.value }), { ...DEFAULT_PREFERENCES });
  return {
    ...prefs,
    keyboardShortcuts: { ...DEFAULT_SHORTCUTS, ...(prefs.keyboardShortcuts || {}) }
  };
}

export async function setPreference(key, value) {
  if (!(key in DEFAULT_PREFERENCES)) throw new Error(`Unknown preference: ${key}`);
  await dbPut('preferences', { key, value });
  if (key === 'themeMode') localStorage.setItem('snippets:themeMode', value);
  const preferences = await getPreferences();
  await enqueueSyncOperation({ id: 'preferences', type: 'upsert-preferences', payload: preferences });
  return preferences;
}
