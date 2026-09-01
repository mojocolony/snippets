function toIso(value) {
  if (value == null) return null;
  return new Date(value).toISOString();
}

function toMillis(value) {
  if (value == null) return null;
  return new Date(value).getTime();
}

export function snippetToRow(snippet, userId) {
  return {
    id: snippet.id,
    user_id: userId,
    content: String(snippet.content ?? ''),
    tags: Array.isArray(snippet.tags) ? [...snippet.tags] : [],
    starred: Boolean(snippet.starred),
    archived: Boolean(snippet.archived),
    pinned: Boolean(snippet.pinned),
    source_url: snippet.sourceUrl || null,
    deleted_at: toIso(snippet.deletedAt),
    created_at: toIso(snippet.createdAt),
    updated_at: toIso(snippet.updatedAt)
  };
}

export function rowToSnippet(row) {
  return {
    id: row.id,
    content: String(row.content ?? ''),
    tags: Array.isArray(row.tags) ? [...row.tags] : [],
    starred: Boolean(row.starred),
    archived: Boolean(row.archived),
    pinned: Boolean(row.pinned),
    sourceUrl: row.source_url || null,
    deletedAt: toMillis(row.deleted_at),
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at)
  };
}

export function preferencesToRow(preferences, userId) {
  return {
    user_id: userId,
    theme_mode: preferences.themeMode,
    editor_font: preferences.editorFont,
    font_size: Number(preferences.fontSize),
    return_window: preferences.returnWindow,
    sidebar_collapsed: Boolean(preferences.sidebarCollapsed),
    keyboard_shortcuts: { ...(preferences.keyboardShortcuts || {}) }
  };
}

export function rowToPreferences(row) {
  return {
    themeMode: row.theme_mode,
    editorFont: row.editor_font,
    fontSize: Number(row.font_size),
    returnWindow: row.return_window,
    sidebarCollapsed: Boolean(row.sidebar_collapsed),
    keyboardShortcuts: { ...(row.keyboard_shortcuts || {}) }
  };
}
