export function openHeadingLevelMenu({ anchor, onSelect = () => {}, onClose = () => {} } = {}) {
  document.querySelector('.heading-level-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'heading-level-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Heading level');

  const levels = [
    { level: 1, label: 'Heading 1' },
    { level: 2, label: 'Heading 2' },
    { level: 3, label: 'Heading 3' },
    { level: 4, label: 'Heading 4' }
  ];
  for (const { level, label } of levels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'heading-level-button';
    button.dataset.headingLevel = String(level);
    button.setAttribute('role', 'menuitem');
    button.setAttribute('aria-label', label);
    button.textContent = `H${level}`;
    button.title = label;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      const chosen = Number(button.dataset.headingLevel);
      close(false);
      onSelect(chosen);
    });
    menu.append(button);
  }

  document.body.append(menu);
  const rect = anchor?.getBoundingClientRect?.() || { left: 12, top: 56, bottom: 56, width: 44 };
  const width = menu.offsetWidth || 188;
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
  const top = Math.max(8, rect.top - (menu.offsetHeight || 48) - 8);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  const outside = event => {
    if (menu.contains(event.target)) return;
    close(true);
  };
  const escape = event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close(true);
  };
  requestAnimationFrame(() => document.addEventListener('pointerdown', outside, true));
  document.addEventListener('keydown', escape, true);

  function close(notify = true) {
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', escape, true);
    menu.remove();
    if (notify) onClose();
  }

  return { close };
}
