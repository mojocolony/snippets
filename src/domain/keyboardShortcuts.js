export const DEFAULT_SHORTCUTS = Object.freeze({
  newSnippet: 'Mod+N',
  inbox: 'Mod+1',
  starred: 'Mod+2',
  archive: 'Mod+3',
  toggleStar: 'Mod+Shift+S',
  tags: 'Mod+Shift+T',
  toggleSidebar: 'Mod+Backslash'
});

const RESERVED = new Set(['Mod+L', 'Mod+T', 'Mod+W', 'Mod+R', 'Mod+Q']);

function normalizedKey(key = '') {
  if (key === '\\') return 'Backslash';
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  if (key === 'Esc') return 'Escape';
  return key;
}

function shortcutParts(event) {
  const usesMod = Boolean(event.metaKey || event.ctrlKey);
  if (!usesMod) return null;
  const key = normalizedKey(event.key);
  if (!key || ['Meta', 'Control', 'Shift', 'Alt'].includes(key)) return null;
  const parts = ['Mod'];
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts;
}

export function shortcutFromEvent(event) {
  const parts = shortcutParts(event);
  return parts ? parts.join('+') : null;
}

export function shortcutMatchesEvent(shortcut, event) {
  if (!shortcut) return false;
  return shortcutFromEvent(event) === shortcut;
}

export function findShortcutConflict(shortcuts, action, candidate) {
  for (const [otherAction, shortcut] of Object.entries(shortcuts || {})) {
    if (otherAction !== action && shortcut === candidate) return otherAction;
  }
  return null;
}

export function isLikelyReservedShortcut(shortcut) {
  return RESERVED.has(shortcut);
}

export function formatShortcut(shortcut, { isMac = false } = {}) {
  if (!shortcut) return 'Not set';
  const parts = shortcut.split('+');
  if (!isMac) {
    return parts.map(part => part === 'Mod' ? 'Ctrl' : part === 'Backslash' ? '\\' : part).join('+');
  }
  const glyphs = { Mod: '⌘', Shift: '⇧', Alt: '⌥', Backslash: '\\', Space: 'Space' };
  return parts.map(part => glyphs[part] ?? part).join('');
}
