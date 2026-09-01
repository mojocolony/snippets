import { createSheet } from './sheet.js';
import { normalizeTag } from '../storage/tagRepository.js';

export function openTagSheet({
  mode = 'assign',
  tags = [],
  assigned = [],
  activeTag = null,
  onToggle = async () => assigned,
  onCreate = async () => assigned,
  onSelect = () => {},
  onClear = () => {},
  onClose = () => {}
} = {}) {
  const sheet = createSheet({ title: mode === 'assign' ? 'Tags' : 'All tags', onClose });
  const input = document.createElement('input');
  input.className = 'sheet-search';
  input.type = 'search';
  input.placeholder = mode === 'assign' ? 'Search or create tag…' : 'Search tags…';
  input.autocomplete = 'off';
  sheet.body.append(input);

  const list = document.createElement('div');
  sheet.body.append(list);
  let currentAssigned = [...assigned];
  let query = '';

  async function render() {
    list.replaceChildren();
    const normalizedQuery = normalizeTag(query);
    const filtered = tags.filter(tag => tag.name.includes(normalizedQuery));

    if (mode === 'filter' && activeTag) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'sheet-row';
      const clearLabel = document.createElement('span');
      clearLabel.textContent = 'All snippets';
      const clearHint = document.createElement('span');
      clearHint.className = 'sheet-count';
      clearHint.textContent = 'clear filter';
      clear.append(clearLabel, clearHint);
      clear.addEventListener('click', () => { onClear(); sheet.close(); });
      list.append(clear);
    }

    for (const tag of filtered) {
      if (mode === 'assign') {
        const label = document.createElement('label');
        label.className = 'sheet-row';
        const name = document.createElement('span');
        name.textContent = tag.name;
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = currentAssigned.includes(tag.name);
        check.setAttribute('aria-label', tag.name);
        check.addEventListener('change', async () => {
          check.disabled = true;
          try { currentAssigned = await onToggle(tag.name); }
          finally { check.disabled = false; render(); }
        });
        label.append(name, check);
        list.append(label);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sheet-row';
        const name = document.createElement('span');
        name.textContent = tag.name;
        const count = document.createElement('span');
        count.className = 'sheet-count';
        count.textContent = String(tag.count);
        button.append(name, count);
        if (tag.name === activeTag) button.classList.add('is-active');
        button.addEventListener('click', () => { onSelect(tag.name); sheet.close(); });
        list.append(button);
      }
    }

    if (mode === 'assign' && normalizedQuery && !tags.some(tag => tag.name === normalizedQuery)) {
      const create = document.createElement('button');
      create.type = 'button';
      create.className = 'sheet-row create-tag';
      create.setAttribute('aria-label', `Create ${normalizedQuery}`);
      create.textContent = `+ Create “${normalizedQuery}”`;
      create.addEventListener('click', async () => {
        create.disabled = true;
        try {
          currentAssigned = await onCreate(normalizedQuery);
          tags = [...tags, { name: normalizedQuery, count: 1 }].sort((a, b) => a.name.localeCompare(b.name));
          query = '';
          input.value = '';
          render();
        } finally { create.disabled = false; }
      });
      list.append(create);
    }

    if (!filtered.length && !(mode === 'assign' && normalizedQuery)) {
      const empty = document.createElement('div');
      empty.className = 'library-empty';
      empty.textContent = 'No matching tags';
      list.append(empty);
    }
  }

  input.addEventListener('input', () => { query = input.value; render(); });
  render();
  requestAnimationFrame(() => input.focus());
  return sheet;
}
