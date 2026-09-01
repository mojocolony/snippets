import {
  createSnippet, deleteSnippetPermanently, getSnippet, listSnippets, moveToTrash,
  purgeExpiredTrash, removeSnippetIfEmpty, restoreSnippet, setPinnedSnippet, updateSnippet
} from './storage/snippetRepository.js';
import { listTagsWithCounts, toggleSnippetTag } from './storage/tagRepository.js';
import { getPreferences, setPreference } from './storage/preferencesRepository.js';
import { chooseLaunchTarget } from './domain/launchPolicy.js';
import { toPlainText } from './domain/snippetText.js';
import { renderEditorView } from './ui/editorView.js';
import { renderLibraryView } from './ui/libraryView.js';
import { renderTrashView } from './ui/trashView.js';
import { openTagSheet } from './ui/tagSheet.js';
import { openAppearanceSheet } from './ui/appearanceSheet.js';
import { openMoreMenu } from './ui/moreMenu.js';
import { showToast } from './ui/toast.js';
import { openShortcutSheet } from './ui/shortcutSheet.js';
import { DEFAULT_SHORTCUTS, shortcutMatchesEvent } from './domain/keyboardShortcuts.js';
import { chooseNextVisibleSnippet } from './domain/postArchive.js';

function resolveTheme(mode) {
  if (mode === 'dark' || mode === 'light') return mode;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101010' : '#f8f8f6');
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* use fallback */ }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  await copyText(text);
  return 'copied';
}

export async function createApp(root, { onSignOut = null } = {}) {
  const desktopMedia = matchMedia('(min-width: 900px)');
  const isDesktop = () => desktopMedia.matches;

  const state = {
    screen: 'editor',
    preferences: await getPreferences(),
    currentSnippet: null,
    currentContent: '',
    editorView: null,
    libraryScope: 'inbox',
    activeTag: null,
    tagScope: 'all',
    query: '',
    searchOpen: false,
    pendingMarkdown: null,
    saveTimer: null,
    savePromise: Promise.resolve()
  };
  state.preferences.keyboardShortcuts = { ...DEFAULT_SHORTCUTS, ...(state.preferences.keyboardShortcuts || {}) };
  state.preferences.sidebarCollapsed = Boolean(state.preferences.sidebarCollapsed);

  applyTheme(state.preferences.themeMode);
  await purgeExpiredTrash();

  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const systemThemeHandler = () => {
    if (state.preferences.themeMode === 'system') applyTheme('system');
  };
  systemTheme.addEventListener?.('change', systemThemeHandler);

  async function refreshDesktopSidebar() {
    if (!isDesktop() || state.screen !== 'editor' || !state.editorView) return;
    const items = await listSnippets({ scope: state.libraryScope });
    state.editorView.updateSidebar(items, state.libraryScope, state.currentSnippet?.id || null);
  }

  async function toggleSidebar() {
    if (!isDesktop() || state.screen !== 'editor' || !state.editorView) return;
    state.preferences = await setPreference('sidebarCollapsed', !state.preferences.sidebarCollapsed);
    state.editorView.setSidebarCollapsed(state.preferences.sidebarCollapsed);
  }

  async function switchLibraryScope(scope) {
    state.libraryScope = scope;
    state.activeTag = null;
    state.tagScope = 'all';
    if (isDesktop() && state.screen === 'editor' && state.editorView) {
      await refreshDesktopSidebar();
      return;
    }
    await showLibrary(scope);
  }

  function handleLibraryControl() {
    if (isDesktop() && state.screen === 'editor') toggleSidebar();
    else showLibrary();
  }

  function queueSave(markdown) {
    state.currentContent = markdown;
    state.pendingMarkdown = markdown;
    state.editorView?.setShareEnabled(Boolean(markdown.trim()));
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => { flushSave(); }, 120);
  }

  async function flushSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    if (state.pendingMarkdown == null) return state.savePromise;
    const markdown = state.pendingMarkdown;
    state.pendingMarkdown = null;

    const operation = async () => {
      try {
        if (!state.currentSnippet) {
          if (!markdown.trim()) return;
          state.currentSnippet = await createSnippet(markdown);
        } else if (state.currentSnippet.content !== markdown) {
          state.currentSnippet = await updateSnippet(state.currentSnippet.id, { content: markdown });
        }
        state.editorView?.updateMeta(state.currentSnippet);
        await refreshDesktopSidebar();
      } catch (error) {
        console.error(error);
        showToast('Could not save — text is still on screen');
      }
    };
    state.savePromise = state.savePromise.then(operation, operation);
    return state.savePromise;
  }

  async function leaveEditor() {
    if (state.screen !== 'editor') return;
    await flushSave();
    if (state.currentSnippet && !state.currentContent.trim()) {
      try { await removeSnippetIfEmpty(state.currentSnippet.id); }
      catch (error) { console.error(error); showToast('Could not remove empty snippet'); }
    }
    state.editorView?.destroy();
    state.editorView = null;
    state.currentSnippet = null;
    state.currentContent = '';
    state.pendingMarkdown = null;
  }

  async function showEditor(id = null) {
    if (state.screen === 'editor' && state.editorView) await leaveEditor();
    state.screen = 'editor';
    state.currentSnippet = id ? await getSnippet(id) : null;
    state.currentContent = state.currentSnippet?.content || '';
    state.pendingMarkdown = null;

    const libraryItems = isDesktop() ? await listSnippets({ scope: state.libraryScope }) : [];
    state.editorView = renderEditorView(root, {
      content: state.currentContent,
      snippet: state.currentSnippet,
      preferences: state.preferences,
      libraryItems,
      libraryScope: state.libraryScope,
      sidebarCollapsed: state.preferences.sidebarCollapsed,
      onContentChange: queueSave,
      onLibrary: handleLibraryControl,
      onTags: () => openEditorTags(),
      onStar: () => toggleStar(),
      onAppearance: () => openAppearance(),
      onShare: () => shareCurrent(),
      onMore: () => openEditorMore(),
      onLibraryScope: scope => switchLibraryScope(scope),
      onOpenSnippet: id => showEditor(id),
      onNew: () => showEditor(null)
    });
    requestAnimationFrame(() => state.editorView?.focus());
  }

  async function showLibrary(scope = state.libraryScope) {
    state.libraryScope = scope;
    if (isDesktop()) {
      state.activeTag = null;
      state.tagScope = 'all';
      if (state.screen === 'editor' && state.editorView) {
        await refreshDesktopSidebar();
        return;
      }
      await showEditor(null);
      return;
    }
    if (state.screen === 'editor') await leaveEditor();
    state.screen = 'library';
    await renderLibrary();
  }

  async function renderLibrary({ focusSearch = false } = {}) {
    const effectiveScope = state.activeTag ? state.tagScope : state.libraryScope;
    const items = await listSnippets({
      scope: effectiveScope,
      tag: state.activeTag,
      query: state.query
    });
    renderLibraryView(root, {
      scope: state.libraryScope,
      items,
      activeTag: state.activeTag,
      tagScope: state.tagScope,
      query: state.query,
      searchOpen: state.searchOpen,
      focusSearch,
      onScope: value => switchLibraryScope(value),
      onTagScope: async value => { state.tagScope = value; await renderLibrary(); },
      onClearTag: async () => { state.activeTag = null; state.tagScope = 'all'; await renderLibrary(); },
      onOpen: id => showEditor(id),
      onNew: () => showEditor(null),
      onTags: () => openLibraryTags(),
      onSearch: value => {
        state.query = value;
        clearTimeout(renderLibrary.searchTimer);
        renderLibrary.searchTimer = setTimeout(() => renderLibrary({ focusSearch: true }), 70);
      },
      onToggleSearch: () => {
        state.searchOpen = !state.searchOpen;
        if (!state.searchOpen) state.query = '';
        renderLibrary({ focusSearch: state.searchOpen });
      },
      onAppearance: () => openAppearance(),
      onMore: () => openLibraryMore()
    });
  }

  async function openEditorTags() {
    const tags = await listTagsWithCounts();
    openTagSheet({
      mode: 'assign',
      tags,
      assigned: state.currentSnippet?.tags || [],
      onToggle: async name => {
        if (!state.currentContent.trim()) { showToast('Type something first'); return []; }
        await flushSave();
        if (!state.currentSnippet) return [];
        state.currentSnippet = await toggleSnippetTag(state.currentSnippet.id, name);
        state.editorView?.updateMeta(state.currentSnippet);
        await refreshDesktopSidebar();
        return [...state.currentSnippet.tags];
      },
      onCreate: async name => {
        if (!state.currentContent.trim()) { showToast('Type something first'); return []; }
        await flushSave();
        if (!state.currentSnippet) return [];
        state.currentSnippet = await toggleSnippetTag(state.currentSnippet.id, name);
        state.editorView?.updateMeta(state.currentSnippet);
        await refreshDesktopSidebar();
        return [...state.currentSnippet.tags];
      }
    });
  }

  async function openLibraryTags() {
    const tags = await listTagsWithCounts();
    openTagSheet({
      mode: 'filter',
      tags,
      activeTag: state.activeTag,
      onSelect: name => {
        state.activeTag = name;
        state.tagScope = 'all';
        state.query = '';
        renderLibrary();
      },
      onClear: () => {
        state.activeTag = null;
        state.tagScope = 'all';
        renderLibrary();
      }
    });
  }

  async function toggleStar() {
    if (!state.currentContent.trim()) return;
    await flushSave();
    if (!state.currentSnippet) return;
    state.currentSnippet = await updateSnippet(state.currentSnippet.id, { starred: !state.currentSnippet.starred });
    state.editorView?.updateMeta(state.currentSnippet);
    await refreshDesktopSidebar();
  }

  function openAppearance() {
    openAppearanceSheet({
      preferences: state.preferences,
      onChange: async (key, value) => {
        state.preferences = await setPreference(key, value);
        applyTheme(state.preferences.themeMode);
        state.editorView?.updateAppearance(state.preferences);
        return { ...state.preferences };
      }
    });
  }

  function openKeyboardShortcuts() {
    openShortcutSheet({
      shortcuts: state.preferences.keyboardShortcuts,
      onChange: async (action, shortcut) => {
        const next = { ...state.preferences.keyboardShortcuts, [action]: shortcut };
        state.preferences = await setPreference('keyboardShortcuts', next);
        state.preferences.keyboardShortcuts = { ...DEFAULT_SHORTCUTS, ...(state.preferences.keyboardShortcuts || {}) };
        return { ...state.preferences.keyboardShortcuts };
      },
      onRestore: async () => {
        state.preferences = await setPreference('keyboardShortcuts', { ...DEFAULT_SHORTCUTS });
        return { ...state.preferences.keyboardShortcuts };
      }
    });
  }

  async function shareCurrent() {
    const text = state.currentContent;
    if (!text.trim()) return;
    await flushSave();
    try {
      const result = await shareText(text);
      if (result === 'copied') showToast('Copied');
    } catch (error) {
      console.error(error);
      showToast('Could not share');
    }
  }

  async function openEditorMore() {
    if (state.currentContent.trim()) await flushSave();
    const actions = state.currentContent.trim() ? [
      { id: 'pin', label: state.currentSnippet?.pinned ? 'Unpin' : 'Pin' },
      { id: 'archive', label: state.currentSnippet?.archived ? 'Unarchive' : 'Archive' },
      { id: 'copy', label: 'Copy' },
      { id: 'copy-markdown', label: 'Copy Markdown' },
      { id: 'delete', label: 'Delete', danger: true },
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
      { id: 'settings', label: 'Settings' }
    ] : [{ id: 'shortcuts', label: 'Keyboard shortcuts' }, { id: 'settings', label: 'Settings' }];
    if (onSignOut) actions.push({ id: 'signout', label: 'Sign out' });

    openMoreMenu({
      actions,
      onAction: async id => {
        if (id === 'settings') { openAppearance(); return; }
        if (id === 'shortcuts') { openKeyboardShortcuts(); return; }
        if (id === 'signout') { await onSignOut?.(); return; }
        await flushSave();
        if (!state.currentSnippet) return;
        if (id === 'pin') {
          await setPinnedSnippet(state.currentSnippet.pinned ? null : state.currentSnippet.id);
          state.currentSnippet = await getSnippet(state.currentSnippet.id);
          state.editorView?.updateMeta(state.currentSnippet);
        } else if (id === 'archive') {
          const currentId = state.currentSnippet.id;
          const wasArchived = Boolean(state.currentSnippet.archived);
          const inboxBefore = !wasArchived && state.libraryScope === 'inbox'
            ? await listSnippets({ scope: 'inbox' })
            : [];
          state.currentSnippet = await updateSnippet(currentId, { archived: !wasArchived });
          state.editorView?.updateMeta(state.currentSnippet);
          if (!wasArchived && state.libraryScope === 'inbox') {
            if (isDesktop()) {
              const nextId = chooseNextVisibleSnippet(inboxBefore, currentId);
              await showEditor(nextId);
            } else {
              await showLibrary('inbox');
            }
            return;
          }
          await refreshDesktopSidebar();
        } else if (id === 'copy') {
          await copyText(toPlainText(state.currentContent));
          showToast('Copied');
        } else if (id === 'copy-markdown') {
          await copyText(state.currentContent);
          showToast('Markdown copied');
        } else if (id === 'delete') {
          await moveToTrash(state.currentSnippet.id);
          state.currentSnippet = null;
          state.currentContent = '';
          if (isDesktop()) await showEditor(null);
          else await showLibrary('inbox');
        }
      }
    });
  }

  function openLibraryMore() {
    const actions = [{ id: 'trash', label: 'Trash' }, { id: 'shortcuts', label: 'Keyboard shortcuts' }, { id: 'settings', label: 'Settings' }];
    if (onSignOut) actions.push({ id: 'signout', label: 'Sign out' });
    openMoreMenu({
      actions,
      onAction: async id => {
        if (id === 'trash') await showTrash();
        else if (id === 'shortcuts') openKeyboardShortcuts();
        else if (id === 'settings') openAppearance();
        else if (id === 'signout') await onSignOut?.();
      }
    });
  }

  async function showTrash() {
    state.screen = 'trash';
    const items = (await listSnippets({ scope: 'trash' })).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    renderTrashView(root, {
      items,
      onBack: () => { state.screen = 'library'; renderLibrary(); },
      onRestore: async id => { await restoreSnippet(id); await showTrash(); showToast('Restored'); },
      onDeletePermanently: async id => {
        if (!window.confirm('Delete this snippet permanently? This cannot be undone.')) return;
        await deleteSnippetPermanently(id);
        await showTrash();
      }
    });
  }

  async function handleGlobalShortcut(event) {
    if (document.body.dataset.shortcutCapture === 'true') return;
    const shortcuts = state.preferences.keyboardShortcuts || DEFAULT_SHORTCUTS;
    const action = Object.entries(shortcuts).find(([, shortcut]) => shortcutMatchesEvent(shortcut, event))?.[0];
    if (!action) return;
    event.preventDefault();

    if (action === 'newSnippet') await showEditor(null);
    else if (action === 'inbox') await switchLibraryScope('inbox');
    else if (action === 'starred') await switchLibraryScope('starred');
    else if (action === 'archive') await switchLibraryScope('archive');
    else if (action === 'toggleStar' && state.screen === 'editor') await toggleStar();
    else if (action === 'tags') {
      if (state.screen === 'editor') await openEditorTags();
      else if (state.screen === 'library') await openLibraryTags();
    } else if (action === 'toggleSidebar') await toggleSidebar();
  }

  document.addEventListener('keydown', handleGlobalShortcut);

  const initialSnippets = await listSnippets({ scope: 'all' });
  const target = chooseLaunchTarget({ snippets: initialSnippets, returnWindow: state.preferences.returnWindow });
  await showEditor(target.type === 'snippet' ? target.id : null);

  const flushOnHide = () => {
    if (state.screen === 'editor') flushSave();
  };
  window.addEventListener('pagehide', flushOnHide);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushOnHide(); });

  return {
    openSnippet(id) { return showEditor(id); },
    newSnippet() { return showEditor(null); },
    destroy() {
      clearTimeout(state.saveTimer);
      state.editorView?.destroy();
      systemTheme.removeEventListener?.('change', systemThemeHandler);
      window.removeEventListener('pagehide', flushOnHide);
      document.removeEventListener('keydown', handleGlobalShortcut);
      root.replaceChildren();
    }
  };
}
