import { createSheet } from './sheet.js';
import {
  DEFAULT_SHORTCUTS,
  shortcutFromEvent,
  findShortcutConflict,
  formatShortcut,
  isLikelyReservedShortcut
} from '../domain/keyboardShortcuts.js';

const ACTIONS = [
  ['newSnippet', 'New snippet'],
  ['inbox', 'Inbox'],
  ['starred', 'Starred'],
  ['archive', 'Archive'],
  ['toggleStar', 'Star / unstar'],
  ['tags', 'Tags'],
  ['toggleSidebar', 'Toggle sidebar']
];

function isMacPlatform() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
}

export function openShortcutSheet({ shortcuts = DEFAULT_SHORTCUTS, onChange = async () => shortcuts, onRestore = async () => DEFAULT_SHORTCUTS } = {}) {
  let current = { ...DEFAULT_SHORTCUTS, ...(shortcuts || {}) };
  const isMac = isMacPlatform();
  let captureAction = null;
  let feedback;
  let list;

  function cleanup() {
    document.removeEventListener('keydown', capture, true);
    delete document.body.dataset.shortcutCapture;
  }

  const sheet = createSheet({ title: 'Keyboard shortcuts', className: 'shortcut-sheet', onClose: cleanup });

  const intro = document.createElement('p');
  intro.className = 'shortcut-intro';
  intro.textContent = 'Select a shortcut, then press a new key combination.';
  sheet.body.append(intro);

  list = document.createElement('div');
  list.className = 'shortcut-list';
  sheet.body.append(list);

  feedback = document.createElement('div');
  feedback.className = 'shortcut-feedback';
  feedback.setAttribute('aria-live', 'polite');
  sheet.body.append(feedback);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'menu-row shortcut-restore';
  restore.textContent = 'Restore defaults';
  restore.addEventListener('click', async () => {
    current = await onRestore();
    feedback.textContent = 'Defaults restored.';
    render();
  });
  sheet.body.append(restore);

  function actionLabel(action) {
    return ACTIONS.find(([id]) => id === action)?.[1] || action;
  }

  function render() {
    list.replaceChildren();
    for (const [action, label] of ACTIONS) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      const name = document.createElement('span');
      name.className = 'shortcut-name';
      name.textContent = label;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shortcut-key';
      button.dataset.shortcutAction = action;
      button.textContent = captureAction === action ? 'Press shortcut…' : formatShortcut(current[action], { isMac });
      button.addEventListener('click', () => {
        captureAction = action;
        feedback.textContent = 'Use Command/Ctrl with another key.';
        document.body.dataset.shortcutCapture = 'true';
        render();
      });
      row.append(name, button);
      list.append(row);
    }
  }

  async function capture(event) {
    if (!captureAction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      captureAction = null;
      delete document.body.dataset.shortcutCapture;
      feedback.textContent = 'Shortcut unchanged.';
      render();
      return;
    }
    const candidate = shortcutFromEvent(event);
    if (!candidate) {
      feedback.textContent = 'Use Command/Ctrl with another key.';
      return;
    }
    const conflict = findShortcutConflict(current, captureAction, candidate);
    if (conflict) {
      feedback.textContent = `${formatShortcut(candidate, { isMac })} is already used by ${actionLabel(conflict)}.`;
      return;
    }
    const warning = isLikelyReservedShortcut(candidate)
      ? ' This combination may be reserved by your browser.'
      : '';
    current = await onChange(captureAction, candidate);
    feedback.textContent = `Shortcut saved.${warning}`;
    captureAction = null;
    delete document.body.dataset.shortcutCapture;
    render();
  }

  document.addEventListener('keydown', capture, true);
  render();
  return sheet;
}
