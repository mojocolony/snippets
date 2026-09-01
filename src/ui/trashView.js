import { getSnippetTitle, getSnippetPreview } from '../domain/snippetText.js';

export function renderTrashView(root, { items = [], onBack = () => {}, onRestore = () => {}, onDeletePermanently = () => {} } = {}) {
  root.innerHTML = `
    <main class="trash-screen">
      <div class="trash-inner">
        <header class="trash-header">
          <button class="quiet-button" data-action="back" aria-label="Back">←</button>
          <div class="trash-title">Trash</div>
        </header>
        <section class="trash-list"></section>
      </div>
    </main>`;
  root.querySelector('[data-action="back"]').addEventListener('click', onBack);
  const list = root.querySelector('.trash-list');
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.textContent = 'Trash is empty';
    list.append(empty);
    return;
  }
  for (const snippet of items) {
    const row = document.createElement('div');
    row.className = 'trash-row';
    row.dataset.testid = 'trash-row';
    const text = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'trash-row-title'; title.textContent = getSnippetTitle(snippet.content) || 'Untitled';
    const preview = document.createElement('div');
    preview.className = 'trash-row-preview'; preview.textContent = getSnippetPreview(snippet.content);
    text.append(title, preview);
    const actions = document.createElement('div'); actions.className = 'trash-actions';
    const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'small-action'; restore.textContent = 'Restore';
    const del = document.createElement('button'); del.type = 'button'; del.className = 'small-action is-danger'; del.textContent = 'Delete';
    restore.addEventListener('click', () => onRestore(snippet.id));
    del.addEventListener('click', () => onDeletePermanently(snippet.id));
    actions.append(restore, del);
    row.append(text, actions);
    list.append(row);
  }
}
