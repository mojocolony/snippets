export const REFRESH_EDITOR_SESSION_KEY = 'snippets.refreshEditor.v1';

export function readRefreshEditorSession(storage, fallbackActiveAt = null) {
  try {
    const raw = storage?.getItem?.(REFRESH_EDITOR_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value?.screen !== 'editor') return null;
    if (value.snippetId != null && typeof value.snippetId !== 'string') return null;
    const result = { screen: 'editor', snippetId: value.snippetId ?? null };
    if (Number.isFinite(value.activeAt)) result.activeAt = Number(value.activeAt);
    else if (Number.isFinite(fallbackActiveAt)) result.activeAt = Number(fallbackActiveAt);
    return result;
  } catch {
    return null;
  }
}

export function writeRefreshEditorSession(storage, snippetId = null, activeAt = null) {
  try {
    const value = { screen: 'editor', snippetId: snippetId ?? null };
    if (Number.isFinite(activeAt)) value.activeAt = Number(activeAt);
    storage?.setItem?.(REFRESH_EDITOR_SESSION_KEY, JSON.stringify(value));
  } catch {
    // Session storage may be unavailable; launch policy still works normally.
  }
}

export function clearRefreshEditorSession(storage) {
  try {
    storage?.removeItem?.(REFRESH_EDITOR_SESSION_KEY);
  } catch {
    // Session storage may be unavailable; launch policy still works normally.
  }
}

export function isReloadNavigation(performanceLike) {
  try {
    const entry = performanceLike?.getEntriesByType?.('navigation')?.[0];
    if (entry?.type) return entry.type === 'reload';
  } catch {
    // Fall back to the legacy navigation timing API below.
  }
  return performanceLike?.navigation?.type === 1;
}
