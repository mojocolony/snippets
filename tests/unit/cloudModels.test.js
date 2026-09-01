import test from 'node:test';
import assert from 'node:assert/strict';
import { snippetToRow, rowToSnippet, preferencesToRow, rowToPreferences } from '../../src/cloud/cloudModels.js';

test('snippet cloud mapping preserves content, metadata and millisecond timestamps', () => {
  const snippet = {
    id: '11111111-1111-4111-8111-111111111111', content: 'hello', tags: ['one','two'],
    starred: true, archived: false, pinned: true, sourceUrl: 'https://example.com',
    deletedAt: 3000, createdAt: 1000, updatedAt: 2000
  };
  const row = snippetToRow(snippet, 'user-1');
  assert.deepEqual(row, {
    id: snippet.id,
    user_id: 'user-1',
    content: 'hello',
    tags: ['one','two'],
    starred: true,
    archived: false,
    pinned: true,
    source_url: 'https://example.com',
    deleted_at: new Date(3000).toISOString(),
    created_at: new Date(1000).toISOString(),
    updated_at: new Date(2000).toISOString()
  });
  assert.deepEqual(rowToSnippet(row), snippet);
});

test('preferences cloud mapping uses approved storage field names', () => {
  const prefs = {
    themeMode: 'dark', editorFont: 'literata', fontSize: 20,
    returnWindow: '5m', sidebarCollapsed: true,
    keyboardShortcuts: { newSnippet: 'Mod+N' }
  };
  const row = preferencesToRow(prefs, 'user-1');
  assert.deepEqual(row, {
    user_id: 'user-1', theme_mode: 'dark', editor_font: 'literata', font_size: 20,
    return_window: '5m', sidebar_collapsed: true,
    keyboard_shortcuts: { newSnippet: 'Mod+N' }
  });
  assert.deepEqual(rowToPreferences({ ...row, updated_at: '2026-09-01T00:00:00.000Z' }), prefs);
});
