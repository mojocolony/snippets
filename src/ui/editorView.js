import { mountMarkdownEditor } from '../editor/markdownEditor.js';
import { makeLibraryItem } from '../domain/libraryItem.js';
import { EDITOR_FONTS } from './appearanceSheet.js';

function renderTags(container, tags = []) {
  container.replaceChildren(...tags.map(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    return chip;
  }));
}

function renderSidebarList(container, snippets = [], currentId = null, onOpenSnippet = () => {}) {
  container.replaceChildren();
  if (!snippets.length) {
    const empty = document.createElement('div');
    empty.className = 'desktop-sidebar-empty';
    empty.textContent = 'No snippets';
    container.append(empty);
    return;
  }

  for (const snippet of snippets) {
    const item = makeLibraryItem(snippet);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'desktop-sidebar-row';
    row.classList.toggle('is-selected', item.id === currentId);
    row.dataset.snippetId = item.id;

    const titleRow = document.createElement('span');
    titleRow.className = 'desktop-sidebar-title-row';
    const title = document.createElement('span');
    title.className = 'desktop-sidebar-title';
    title.textContent = item.title || 'Untitled';
    const star = document.createElement('span');
    star.className = 'library-star';
    star.textContent = item.starred ? '★' : '';
    star.setAttribute('aria-hidden', 'true');
    titleRow.append(title, star);

    const preview = document.createElement('span');
    preview.className = 'desktop-sidebar-preview';
    preview.textContent = item.preview;

    const footer = document.createElement('span');
    footer.className = 'desktop-sidebar-footer';
    const tags = document.createElement('span');
    tags.className = 'desktop-sidebar-tags';
    tags.textContent = item.tags.join(' · ');
    const modified = document.createElement('time');
    modified.className = 'desktop-sidebar-modified';
    modified.dateTime = new Date(item.updatedAt).toISOString();
    modified.textContent = item.modified;
    footer.append(tags, modified);

    row.append(titleRow, preview, footer);
    row.addEventListener('click', () => onOpenSnippet(item.id));
    container.append(row);
  }
}

export function renderEditorView(root, {
  content = '', snippet = null, preferences,
  libraryItems = [], libraryScope = 'inbox', sidebarCollapsed = false,
  onContentChange = () => {}, onLibrary = () => {}, onTags = () => {},
  onStar = () => {}, onAppearance = () => {}, onShare = () => {}, onMore = () => {},
  onLibraryScope = () => {}, onOpenSnippet = () => {}, onNew = () => {}
} = {}) {
  root.innerHTML = `
    <main class="editor-screen desktop-workspace${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}" data-testid="editor-screen">
      <aside class="desktop-sidebar" aria-label="Snippets">
        <div class="desktop-sidebar-head">
          <span>Snippets</span>
          <button class="quiet-button desktop-new-button" data-action="new-sidebar" aria-label="New snippet" title="New snippet">＋</button>
        </div>
        <div class="desktop-sidebar-list"></div>
      </aside>
      <section class="desktop-main">
        <header class="desktop-library-tabs" aria-label="Library views">
          <button type="button" data-scope="inbox">Inbox</button>
          <button type="button" data-scope="starred">Starred</button>
          <button type="button" data-scope="archive">Archive</button>
        </header>
        <div class="editor-status" data-testid="editor-status"></div>
        <div class="editor-wrap">
          <div class="editor-meta-strip" aria-label="Snippet details">
            <button type="button" class="editor-meta-star editor-meta-control" data-action="meta-star" aria-label="Star">
              <svg class="editor-meta-icon editor-meta-star-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <polygon points="9,2.216 10.969,7.006 16.133,7.399 12.186,10.751 13.408,15.784 9,13.066 4.592,15.784 5.814,10.751 1.867,7.399 7.031,7.006"></polygon>
              </svg>
            </button>
            <button type="button" class="editor-meta-tag-area" data-action="meta-tags" aria-label="Edit tags">
              <span class="editor-meta-tag-list"></span>
              <span class="editor-meta-empty-tag">Add tag…</span>
            </button>
            <button type="button" class="editor-meta-add editor-meta-control" data-action="meta-add-tag" aria-label="Add tag">
              <svg class="editor-meta-icon editor-meta-plus-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <path d="M9 3v12M3 9h12"></path>
              </svg>
            </button>
          </div>
          <section class="editor-sheet" aria-label="Snippet"><div id="markdown-editor-host"></div></section>
        </div>
        <nav class="control-strip" data-testid="control-strip" aria-label="Snippet controls">
          <button class="control-button" data-action="library" aria-label="Library" title="Library">☰</button>
          <button class="control-button" data-action="tags" aria-label="Tags" title="Tags">#</button>
          <button class="control-button" data-action="star" aria-label="Star" title="Star">☆</button>
          <button class="control-button control-aa" data-action="appearance" aria-label="Appearance" title="Appearance">Aa</button>
          <button class="control-button" data-action="share" aria-label="Share" title="Share">↑</button>
          <button class="control-button control-more" data-action="more" aria-label="More" title="More">•••</button>
        </nav>
      </section>
    </main>`;

  const workspace = root.querySelector('.desktop-workspace');
  const sidebarList = root.querySelector('.desktop-sidebar-list');
  const tabButtons = [...root.querySelectorAll('.desktop-library-tabs [data-scope]')];
  const status = root.querySelector('.editor-status');
  const metaStar = root.querySelector('[data-action="meta-star"]');
  const metaTags = root.querySelector('[data-action="meta-tags"]');
  const metaAddTag = root.querySelector('[data-action="meta-add-tag"]');
  const metaTagList = root.querySelector('.editor-meta-tag-list');
  const metaEmptyTag = root.querySelector('.editor-meta-empty-tag');
  const star = root.querySelector('[data-action="star"]');
  const share = root.querySelector('[data-action="share"]');
  const editorHost = root.querySelector('#markdown-editor-host');
  const font = EDITOR_FONTS[preferences.editorFont] ?? EDITOR_FONTS['ia-writer-duo'];

  const editor = mountMarkdownEditor(editorHost, {
    value: content,
    fontFamily: font.family,
    fontSize: preferences.fontSize,
    onChange(markdown) {
      share.disabled = !markdown.trim();
      onContentChange(markdown);
    }
  });

  function updateMeta(nextSnippet) {
    snippet = nextSnippet;
    const starred = Boolean(snippet?.starred);
    const starLabel = starred ? 'Unstar' : 'Star';
    star.textContent = starred ? '★' : '☆';
    star.classList.toggle('is-active', starred);
    star.setAttribute('aria-label', starLabel);
    metaStar.classList.toggle('is-active', starred);
    metaStar.setAttribute('aria-label', starLabel);
    status.textContent = snippet?.pinned ? 'Pinned' : '';
    const assignedTags = snippet?.tags || [];
    renderTags(metaTagList, assignedTags);
    metaEmptyTag.hidden = Boolean(assignedTags.length);
  }

  function updateSidebar(items = libraryItems, scope = libraryScope, currentId = snippet?.id || null) {
    libraryItems = items;
    libraryScope = scope;
    tabButtons.forEach(button => {
      const active = button.dataset.scope === libraryScope;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderSidebarList(sidebarList, libraryItems, currentId, onOpenSnippet);
  }

  function setSidebarCollapsed(collapsed) {
    workspace.classList.toggle('is-sidebar-collapsed', Boolean(collapsed));
  }

  updateMeta(snippet);
  updateSidebar(libraryItems, libraryScope, snippet?.id || null);
  setSidebarCollapsed(sidebarCollapsed);
  share.disabled = !content.trim();

  root.querySelector('[data-action="library"]').addEventListener('click', onLibrary);
  root.querySelector('[data-action="tags"]').addEventListener('click', onTags);
  metaTags.addEventListener('click', onTags);
  metaAddTag.addEventListener('click', onTags);
  metaStar.addEventListener('click', onStar);
  star.addEventListener('click', onStar);
  root.querySelector('[data-action="appearance"]').addEventListener('click', onAppearance);
  share.addEventListener('click', onShare);
  root.querySelector('[data-action="more"]').addEventListener('click', onMore);
  root.querySelector('[data-action="new-sidebar"]').addEventListener('click', onNew);
  tabButtons.forEach(button => button.addEventListener('click', () => onLibraryScope(button.dataset.scope)));

  return {
    editor,
    updateMeta,
    updateSidebar,
    setSidebarCollapsed,
    setShareEnabled(enabled) { share.disabled = !enabled; },
    updateAppearance(nextPreferences) {
      const nextFont = EDITOR_FONTS[nextPreferences.editorFont] ?? EDITOR_FONTS['ia-writer-duo'];
      editor.updateAppearance({ fontFamily: nextFont.family, fontSize: nextPreferences.fontSize });
    },
    focus() { editor.focus(); },
    getValue() { return editor.getValue(); },
    destroy() { editor.destroy(); }
  };
}
