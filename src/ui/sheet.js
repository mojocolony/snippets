export function createSheet({ title = '', className = '', onClose = () => {} } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.setAttribute('role', 'presentation');

  const sheet = document.createElement('section');
  sheet.className = `sheet ${className}`.trim();
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  if (title) sheet.setAttribute('aria-label', title);

  const head = document.createElement('div');
  head.className = 'sheet-head';
  const heading = document.createElement('div');
  heading.className = 'sheet-title';
  heading.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'quiet-button';
  close.setAttribute('aria-label', `Close ${title || 'dialog'}`);
  close.textContent = '×';
  head.append(heading, close);

  const body = document.createElement('div');
  body.className = 'sheet-body';
  sheet.append(head, body);
  backdrop.append(sheet);

  function destroy() {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    onClose();
  }
  function onKey(event) {
    if (event.key === 'Escape') destroy();
  }
  close.addEventListener('click', destroy);
  backdrop.addEventListener('pointerdown', event => {
    if (event.target === backdrop) destroy();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);

  return { backdrop, sheet, body, close: destroy };
}
