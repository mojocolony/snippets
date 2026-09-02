import { createSheet } from './sheet.js';

export function standardMoreActions({ includeSignOut = false } = {}) {
  const actions = [
    { id: 'select', label: 'Select' },
    { id: 'trash', label: 'Trash' },
    { id: 'web-capture', label: 'Web Capture' },
    { id: 'shortcuts', label: 'Keyboard shortcuts' }
  ];
  if (includeSignOut) actions.push({ id: 'signout', label: 'Sign out' });
  return actions;
}

export function openMoreMenu({ title = 'More', actions = [], onAction = async () => {}, onClose = () => {} } = {}) {
  const sheet = createSheet({ title, className: 'more-sheet', onClose });
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `menu-row${action.danger ? ' is-danger' : ''}`;
    button.setAttribute('role', 'menuitem');
    button.textContent = action.label;
    button.addEventListener('click', async () => {
      sheet.close();
      await onAction(action.id);
    });
    sheet.body.append(button);
  }
  return sheet;
}
