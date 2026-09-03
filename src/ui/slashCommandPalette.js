function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function keyboardIsOpen(visualViewport, baselineHeight) {
  if (!visualViewport || !baselineHeight) return false;
  return baselineHeight - visualViewport.height > 120;
}

export function createSlashCommandPalette({ host = document.body, onExecute = () => {}, onDismiss = () => {} } = {}) {
  const panel = document.createElement('div');
  panel.className = 'slash-command-palette';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-label', 'Commands');
  panel.hidden = true;
  host.append(panel);

  let commands = [];
  let activeIndex = 0;
  let lastRect = null;
  let touchLayout = false;
  let baselineHeight = Math.max(window.visualViewport?.height || 0, window.innerHeight || 0);

  function position(rect = lastRect) {
    if (panel.hidden) return;
    lastRect = rect || lastRect;
    const vv = window.visualViewport;
    if (vv?.height > baselineHeight) baselineHeight = vv.height;
    const panelWidth = Math.min(320, Math.max(260, window.innerWidth - 24));
    const panelHeight = panel.offsetHeight || 300;

    if (touchLayout && keyboardIsOpen(vv, baselineHeight)) {
      const left = (vv?.offsetLeft || 0) + 12;
      const width = Math.max(220, (vv?.width || window.innerWidth) - 24);
      const top = Math.max((vv?.offsetTop || 0) + 12, (vv?.offsetTop || 0) + (vv?.height || window.innerHeight) - panelHeight - 12);
      Object.assign(panel.style, { left: `${left}px`, top: `${top}px`, width: `${width}px` });
      panel.classList.add('is-keyboard-accessory');
      return;
    }

    panel.classList.remove('is-keyboard-accessory');
    panel.style.width = `${panelWidth}px`;
    const anchor = lastRect || { left: 16, right: 16, top: 56, bottom: 56, width: 0, height: 0 };
    const viewportTop = vv?.offsetTop || 0;
    const viewportLeft = vv?.offsetLeft || 0;
    const viewportWidth = vv?.width || window.innerWidth;
    const viewportHeight = vv?.height || window.innerHeight;
    const left = clamp(anchor.left, viewportLeft + 8, viewportLeft + viewportWidth - panelWidth - 8);
    const roomBelow = viewportTop + viewportHeight - anchor.bottom;
    const top = roomBelow >= Math.min(panelHeight, 300) + 12
      ? anchor.bottom + 8
      : Math.max(viewportTop + 8, anchor.top - panelHeight - 8);
    Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
  }

  function render() {
    panel.replaceChildren();
    if (!commands.length) {
      const empty = document.createElement('div');
      empty.className = 'slash-command-empty';
      empty.textContent = 'No commands';
      panel.append(empty);
      position();
      return;
    }

    commands.forEach((command, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'slash-command-row';
      row.dataset.commandId = command.id;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(index === activeIndex));
      if (index === activeIndex) row.classList.add('is-active');
      const label = document.createElement('span');
      label.className = 'slash-command-label';
      label.textContent = command.label;
      const alias = document.createElement('span');
      alias.className = 'slash-command-alias';
      alias.textContent = command.aliases?.[0] ? `/${command.aliases[0]}` : '';
      row.append(label, alias);
      row.addEventListener('pointerdown', event => {
        event.preventDefault();
        activeIndex = index;
        render();
        void onExecute(command.id);
      });
      panel.append(row);
    });
    position();
    panel.querySelector('.slash-command-row.is-active')?.scrollIntoView?.({ block: 'nearest' });
  }

  function open({ commands: nextCommands = [], rect = null, isTouch = false } = {}) {
    commands = [...nextCommands];
    activeIndex = 0;
    lastRect = rect || lastRect;
    touchLayout = Boolean(isTouch);
    panel.hidden = false;
    render();
  }

  function update({ commands: nextCommands = commands, rect = lastRect, isTouch = touchLayout } = {}) {
    commands = [...nextCommands];
    activeIndex = Math.min(activeIndex, Math.max(0, commands.length - 1));
    lastRect = rect || lastRect;
    touchLayout = Boolean(isTouch);
    if (!panel.hidden) render();
  }

  function moveActive(delta) {
    if (!commands.length) return;
    activeIndex = (activeIndex + delta + commands.length) % commands.length;
    render();
  }

  function executeActive() {
    const command = commands[activeIndex];
    if (!command) return false;
    void onExecute(command.id);
    return true;
  }

  function close({ notify = false } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    commands = [];
    activeIndex = 0;
    panel.classList.remove('is-keyboard-accessory');
    if (notify) onDismiss();
  }

  const outsidePointer = event => {
    if (panel.hidden || panel.contains(event.target)) return;
    close({ notify: true });
  };
  const viewportHandler = () => position();
  document.addEventListener('pointerdown', outsidePointer, true);
  window.visualViewport?.addEventListener('resize', viewportHandler);
  window.visualViewport?.addEventListener('scroll', viewportHandler);
  window.addEventListener('resize', viewportHandler);

  return {
    open,
    update,
    moveActive,
    executeActive,
    close,
    position,
    isOpen: () => !panel.hidden,
    contains: target => panel.contains(target),
    destroy() {
      document.removeEventListener('pointerdown', outsidePointer, true);
      window.visualViewport?.removeEventListener('resize', viewportHandler);
      window.visualViewport?.removeEventListener('scroll', viewportHandler);
      window.removeEventListener('resize', viewportHandler);
      panel.remove();
    }
  };
}
