import { makeLibraryItem } from '../domain/libraryItem.js';
import { batchIconMarkup } from './batchIcons.js';

function makeSegmented(options, active, onSelect, label) {
  const wrap = document.createElement('div');
  wrap.className = 'segmented';
  wrap.setAttribute('role', 'tablist');
  wrap.setAttribute('aria-label', label);
  for (const [value, text] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(value === active));
    button.textContent = text;
    button.addEventListener('click', () => onSelect(value));
    wrap.append(button);
  }
  return wrap;
}

function bindSelectableRow(row, id, {
  selectionMode = false,
  onOpen = () => {}, onStartSelection = () => {}, onToggleSelection = () => {}, onRangeSelect = () => {}
} = {}) {
  let longPressTimer = null;
  let suppressClick = false;
  const cancelLongPress = () => {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  row.addEventListener('pointerdown', event => {
    if (selectionMode || event.pointerType === 'mouse') return;
    cancelLongPress();
    longPressTimer = setTimeout(() => {
      suppressClick = true;
      onStartSelection(id);
    }, 450);
  });
  row.addEventListener('pointerup', cancelLongPress);
  row.addEventListener('pointercancel', cancelLongPress);
  row.addEventListener('pointerleave', cancelLongPress);

  row.addEventListener('click', event => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    if (selectionMode) {
      event.preventDefault();
      if (event.shiftKey) onRangeSelect(id);
      else onToggleSelection(id);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      onStartSelection(id);
      return;
    }
    if (event.shiftKey) {
      event.preventDefault();
      onRangeSelect(id);
      return;
    }
    onOpen(id);
  });
}

function batchStripMarkup(count) {
  const disabled = count ? '' : ' disabled';
  return `<nav class="control-strip batch-control-strip" data-testid="batch-control-strip" aria-label="Selected snippet actions">
    <span class="batch-count" aria-live="polite">${count}</span>
    <button class="control-button" data-batch-action="star"${disabled} aria-label="Star or unstar selected" title="Star or unstar">${batchIconMarkup('star')}</button>
    <button class="control-button" data-batch-action="archive"${disabled} aria-label="Archive or unarchive selected" title="Archive or unarchive">${batchIconMarkup('archive')}</button>
    <button class="control-button" data-batch-action="tags"${disabled} aria-label="Tag selected" title="Tags">${batchIconMarkup('tag')}</button>
    <button class="control-button is-danger" data-batch-action="delete"${disabled} aria-label="Move selected to Trash" title="Trash">${batchIconMarkup('trash')}</button>
    <button class="control-button" data-batch-action="done" aria-label="Done selecting" title="Done">${batchIconMarkup('x')}</button>
  </nav>`;
}

export function renderLibraryView(root, {
  scope = 'inbox', items = [], activeTag = null, tagScope = 'all', query = '', searchOpen = false,
  focusSearch = false, selectionMode = false, selectedIds = new Set(),
  onScope = () => {}, onTagScope = () => {}, onClearTag = () => {},
  onOpen = () => {}, onNew = () => {}, onTags = () => {}, onSearch = () => {},
  onToggleSearch = () => {}, onAppearance = () => {}, onMore = () => {},
  onStartSelection = () => {}, onToggleSelection = () => {}, onRangeSelect = () => {},
  onBatchStar = () => {}, onBatchArchive = () => {}, onBatchTags = () => {}, onBatchDelete = () => {},
  onDoneSelection = () => {}
} = {}) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  root.innerHTML = `
    <main class="library-screen${selectionMode ? ' is-selection-mode' : ''}" data-testid="library-screen">
      <div class="library-inner">
        <header class="library-header"></header>
        <section class="library-list" data-testid="library-list"></section>
      </div>
      ${selectionMode ? batchStripMarkup(selected.size) : `<nav class="control-strip" data-testid="control-strip" aria-label="Library controls">
        <button class="control-button" data-action="new" aria-label="New" title="New">＋</button>
        <button class="control-button" data-action="tags" aria-label="Tags" title="Tags">#</button>
        <button class="control-button" data-action="search" aria-label="Search" title="Search">⌕</button>
        <button class="control-button control-aa" data-action="appearance" aria-label="Appearance" title="Appearance">Aa</button>
        <button class="control-button control-more" data-action="more" aria-label="More" title="More">•••</button>
      </nav>`}
    </main>`;
  const header = root.querySelector('.library-header');
  const list = root.querySelector('.library-list');

  if (activeTag) {
    const titleRow = document.createElement('div');
    titleRow.className = 'tag-filter-header';
    const title = document.createElement('div');
    title.className = 'tag-filter-title';
    title.textContent = `#${activeTag}`;
    const clear = document.createElement('button');
    clear.type = 'button'; clear.className = 'quiet-button'; clear.setAttribute('aria-label', 'Clear tag filter'); clear.textContent = '×';
    clear.addEventListener('click', onClearTag);
    titleRow.append(title, clear);
    header.append(titleRow, makeSegmented([['all', 'All'], ['inbox', 'Inbox'], ['starred', 'Starred'], ['archive', 'Archive']], tagScope, onTagScope, 'Tag scope'));
  } else {
    header.append(makeSegmented([['inbox', 'Inbox'], ['starred', 'Starred'], ['archive', 'Archive']], scope, onScope, 'Library view'));
  }

  if (searchOpen) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    const input = document.createElement('input');
    input.className = 'search-input';
    input.type = 'search';
    input.placeholder = 'Search snippets';
    input.value = query;
    input.addEventListener('input', () => onSearch(input.value));
    searchWrap.append(input);
    header.append(searchWrap);
    if (focusSearch) requestAnimationFrame(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
  }

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.textContent = query ? 'No matching snippets' : activeTag ? `No snippets tagged ${activeTag}` : scope === 'archive' ? 'Archive is empty' : scope === 'starred' ? 'Nothing starred yet' : 'Inbox is empty';
    list.append(empty);
  } else {
    for (const snippet of items) {
      const item = makeLibraryItem(snippet);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `library-row${selectionMode ? ' is-selection-mode' : ''}${selected.has(item.id) ? ' is-selected' : ''}`;
      row.dataset.testid = 'library-row';
      row.dataset.snippetId = item.id;
      if (selectionMode) {
        const indicator = document.createElement('span');
        indicator.className = 'selection-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        if (selected.has(item.id)) indicator.textContent = '✓';
        row.append(indicator);
      }
      const title = document.createElement('span');
      title.className = 'library-title';
      title.textContent = item.title || 'Untitled';
      const preview = document.createElement('span');
      preview.className = 'library-preview';
      preview.textContent = item.preview;
      const tags = document.createElement('span');
      tags.className = 'library-tags';
      for (const tag of item.tags) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        tags.append(chip);
      }
      const meta = document.createElement('span');
      meta.className = 'library-meta';
      const star = document.createElement('span');
      star.className = 'library-star';
      star.textContent = item.starred ? '★' : '';
      star.setAttribute('aria-hidden', 'true');
      const modified = document.createElement('time');
      modified.className = 'library-modified';
      modified.dateTime = new Date(item.updatedAt).toISOString();
      modified.textContent = item.modified;
      meta.append(star, modified);
      row.append(title, preview, tags, meta);
      bindSelectableRow(row, item.id, { selectionMode, onOpen, onStartSelection, onToggleSelection, onRangeSelect });
      list.append(row);
    }
  }

  if (selectionMode) {
    root.querySelector('[data-batch-action="star"]').addEventListener('click', onBatchStar);
    root.querySelector('[data-batch-action="archive"]').addEventListener('click', onBatchArchive);
    root.querySelector('[data-batch-action="tags"]').addEventListener('click', onBatchTags);
    root.querySelector('[data-batch-action="delete"]').addEventListener('click', onBatchDelete);
    root.querySelector('[data-batch-action="done"]').addEventListener('click', onDoneSelection);
    return;
  }

  const searchButton = root.querySelector('[data-action="search"]');
  searchButton.classList.toggle('is-active', searchOpen || Boolean(query));
  root.querySelector('[data-action="new"]').addEventListener('click', onNew);
  root.querySelector('[data-action="tags"]').addEventListener('click', onTags);
  searchButton.addEventListener('click', onToggleSearch);
  root.querySelector('[data-action="appearance"]').addEventListener('click', onAppearance);
  root.querySelector('[data-action="more"]').addEventListener('click', onMore);
}
