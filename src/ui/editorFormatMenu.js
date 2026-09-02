export function editorFormatActions() {
  return [
    { id: 'todo', label: 'Todo' },
    { id: 'settings', label: 'Settings' }
  ];
}

export function openEditorFormatMenu({
  anchor,
  onTodo = () => {},
  onSettings = () => {},
  onClose = () => {}
} = {}) {
  if (!anchor) throw new Error('Editor format menu requires an anchor');

  const menu = document.createElement('div');
  menu.className = 'editor-format-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Formatting and settings');

  const handlers = { todo: onTodo, settings: onSettings };
  for (const action of editorFormatActions()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'editor-format-menu-button';
    button.dataset.editorFormatAction = action.id;
    button.setAttribute('role', 'menuitem');
    button.setAttribute('aria-label', action.label);

    const icon = document.createElement('span');
    icon.className = `editor-format-menu-icon editor-format-menu-icon--${action.id}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = action.id === 'todo' ? '☐' : 'Aa';

    const label = document.createElement('span');
    label.textContent = action.label;
    button.append(icon, label);
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => {
      handlers[action.id]?.();
      close();
    });
    menu.append(button);
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', close);
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    onClose();
  }

  function onDocumentPointerDown(event) {
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    close();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') close();
  }

  function onVisibilityChange() {
    if (document.hidden) close();
  }

  document.body.append(menu);
  anchor.setAttribute('aria-expanded', 'true');

  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth || 188;
  const left = Math.max(8 + width / 2, Math.min(window.innerWidth - 8 - width / 2, rect.left + rect.width / 2));
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(8, rect.top - 8)}px`;

  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', close);

  return { close, element: menu };
}
