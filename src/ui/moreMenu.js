import { createSheet } from './sheet.js';

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
