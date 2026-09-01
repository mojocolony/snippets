import { getSnippetTitle, getSnippetPreview } from '../domain/snippetText.js';

function bindTrashSelection(row, id, {
  selectionMode = false, onStartSelection = () => {}, onToggleSelection = () => {}, onRangeSelect = () => {}
} = {}) {
  let longPressTimer = null;
  let suppressClick = false;
  const cancelLongPress = () => { clearTimeout(longPressTimer); longPressTimer = null; };
  row.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || selectionMode || event.pointerType === 'mouse') return;
    longPressTimer = setTimeout(() => { suppressClick = true; onStartSelection(id); }, 450);
  });
  row.addEventListener('pointerup', cancelLongPress);
  row.addEventListener('pointercancel', cancelLongPress);
  row.addEventListener('pointerleave', cancelLongPress);
  row.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
    if (selectionMode) {
      if (event.shiftKey) onRangeSelect(id);
      else onToggleSelection(id);
      return;
    }
    if (event.metaKey || event.ctrlKey) { onStartSelection(id); return; }
    if (event.shiftKey) onRangeSelect(id);
  });
}

function batchStripMarkup(count) {
  const disabled = count ? '' : ' disabled';
  return `<nav class="control-strip batch-control-strip" aria-label="Selected Trash actions">
    <span class="batch-count" aria-live="polite">${count}</span>
    <button class="control-button" data-batch-action="restore"${disabled} aria-label="Restore selected" title="Restore">↺</button>
    <button class="control-button is-danger" data-batch-action="delete"${disabled} aria-label="Delete selected permanently" title="Delete permanently">⌫</button>
    <button class="control-button" data-batch-action="done" aria-label="Done selecting" title="Done">×</button>
  </nav>`;
}

export function renderTrashView(root, {
  items = [], selectionMode = false, selectedIds = new Set(),
  onBack = () => {}, onRestore = () => {}, onDeletePermanently = () => {},
  onStartSelection = () => {}, onToggleSelection = () => {}, onRangeSelect = () => {},
  onSelect = () => {}, onDoneSelection = () => {}, onBatchRestore = () => {}, onBatchDelete = () => {}
} = {}) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  root.innerHTML = `
    <main class="trash-screen${selectionMode ? ' is-selection-mode' : ''}">
      <div class="trash-inner">
        <header class="trash-header">
          <button class="quiet-button" data-action="back" aria-label="Back">←</button>
          <div class="trash-title">Trash</div>
          <button class="quiet-button trash-select-button" data-action="select" aria-label="Select snippets">${selectionMode ? 'Done' : 'Select'}</button>
        </header>
        <section class="trash-list"></section>
      </div>
      ${selectionMode ? batchStripMarkup(selected.size) : ''}
    </main>`;
  root.querySelector('[data-action="back"]').addEventListener('click', onBack);
  root.querySelector('[data-action="select"]').addEventListener('click', selectionMode ? onDoneSelection : onSelect);
  const list = root.querySelector('.trash-list');
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.textContent = 'Trash is empty';
    list.append(empty);
  } else {
    for (const snippet of items) {
      const row = document.createElement('div');
      row.className = `trash-row${selectionMode ? ' is-selection-mode' : ''}${selected.has(snippet.id) ? ' is-selected' : ''}`;
      row.dataset.testid = 'trash-row';
      row.dataset.snippetId = snippet.id;
      if (selectionMode) {
        const indicator = document.createElement('span');
        indicator.className = 'selection-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        if (selected.has(snippet.id)) indicator.textContent = '✓';
        row.append(indicator);
      }
      const text = document.createElement('div');
      text.className = 'trash-row-text';
      const title = document.createElement('div');
      title.className = 'trash-row-title'; title.textContent = getSnippetTitle(snippet.content) || 'Untitled';
      const preview = document.createElement('div');
      preview.className = 'trash-row-preview'; preview.textContent = getSnippetPreview(snippet.content);
      text.append(title, preview);
      row.append(text);
      if (!selectionMode) {
        const actions = document.createElement('div'); actions.className = 'trash-actions';
        const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'small-action'; restore.textContent = 'Restore';
        const del = document.createElement('button'); del.type = 'button'; del.className = 'small-action is-danger'; del.textContent = 'Delete';
        restore.addEventListener('click', () => onRestore(snippet.id));
        del.addEventListener('click', () => onDeletePermanently(snippet.id));
        actions.append(restore, del);
        row.append(actions);
      }
      bindTrashSelection(row, snippet.id, { selectionMode, onStartSelection, onToggleSelection, onRangeSelect });
      list.append(row);
    }
  }

  if (selectionMode) {
    root.querySelector('[data-batch-action="restore"]').addEventListener('click', onBatchRestore);
    root.querySelector('[data-batch-action="delete"]').addEventListener('click', onBatchDelete);
    root.querySelector('[data-batch-action="done"]').addEventListener('click', onDoneSelection);
  }
}
