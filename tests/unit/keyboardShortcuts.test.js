import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHORTCUTS,
  shortcutFromEvent,
  shortcutMatchesEvent,
  findShortcutConflict,
  formatShortcut,
  isLikelyReservedShortcut
} from '../../src/domain/keyboardShortcuts.js';

test('approved keyboard actions have stable default shortcuts', () => {
  assert.deepEqual(DEFAULT_SHORTCUTS, {
    newSnippet: 'Mod+N',
    inbox: 'Mod+1',
    starred: 'Mod+2',
    archive: 'Mod+3',
    toggleStar: 'Mod+Shift+S',
    tags: 'Mod+Shift+T',
    toggleSidebar: 'Mod+Backslash'
  });
});

test('shortcutFromEvent stores platform-independent Mod combinations', () => {
  assert.equal(shortcutFromEvent({ key: 'n', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), 'Mod+N');
  assert.equal(shortcutFromEvent({ key: 'S', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false }), 'Mod+Shift+S');
  assert.equal(shortcutFromEvent({ key: '\\', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), 'Mod+Backslash');
});

test('shortcut capture rejects bare typing keys', () => {
  assert.equal(shortcutFromEvent({ key: 'n', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), null);
});

test('shortcut matching treats Command and Control as Mod', () => {
  assert.equal(shortcutMatchesEvent('Mod+1', { key: '1', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), true);
  assert.equal(shortcutMatchesEvent('Mod+1', { key: '1', metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }), true);
  assert.equal(shortcutMatchesEvent('Mod+1', { key: '1', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), false);
});

test('duplicate keyboard shortcuts are detected', () => {
  const shortcuts = { ...DEFAULT_SHORTCUTS, inbox: 'Mod+N' };
  assert.equal(findShortcutConflict(shortcuts, 'inbox', 'Mod+N'), 'newSnippet');
  assert.equal(findShortcutConflict(DEFAULT_SHORTCUTS, 'inbox', 'Mod+9'), null);
});

test('shortcut labels use familiar Mac glyphs when requested', () => {
  assert.equal(formatShortcut('Mod+Shift+S', { isMac: true }), '⌘⇧S');
  assert.equal(formatShortcut('Mod+Backslash', { isMac: false }), 'Ctrl+\\');
});


test('common browser-reserved shortcuts are identified for warnings', () => {
  assert.equal(isLikelyReservedShortcut('Mod+L'), true);
  assert.equal(isLikelyReservedShortcut('Mod+N'), false);
});
