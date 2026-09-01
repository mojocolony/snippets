import {
  createSnippet, deleteSnippetPermanently, getSnippet, listSnippets, moveToTrash,
  purgeExpiredTrash, removeSnippetIfEmpty, restoreSnippet, setPinnedSnippet, updateSnippet
} from './storage/snippetRepository.js';
import { listTagsWithCounts, setSnippetTag, toggleSnippetTag } from './storage/tagRepository.js';
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
    savePromise: Promise.resolve(),
    selectionMode: false,
    selectedIds: new Set(),
    selectionAnchorId: null,
    trashReturn: null
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

  function resetSelectionState() {
    state.selectionMode = false;
    state.selectedIds = new Set();
    state.selectionAnchorId = null;
  }

  function effectiveLibraryScope() {
    return state.activeTag ? state.tagScope : state.libraryScope;
  }

  async function currentSelectableItems() {
    if (state.screen === 'trash') {
      return (await listSnippets({ scope: 'trash' })).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    }
    return listSnippets({
      scope: effectiveLibraryScope(),
      tag: state.activeTag,
      query: state.query
    });
  }

  async function syncSelectionUi() {
    if (state.screen === 'editor' && state.editorView) {
      state.editorView.setSelectionState({ active: state.selectionMode, ids: state.selectedIds });
      return;
    }
    if (state.screen === 'library') { await renderLibrary(); return; }
    if (state.screen === 'trash') await renderTrash();
  }

  async function enterSelectionMode(id = null) {
    state.selectionMode = true;
    state.selectedIds = new Set(id ? [id] : []);
    state.selectionAnchorId = id || state.selectionAnchorId;
    if (isDesktop() && state.screen === 'editor' && state.preferences.sidebarCollapsed) {
      state.preferences = await setPreference('sidebarCollapsed', false);
      state.editorView?.setSidebarCollapsed(false);
    }
    await syncSelectionUi();
  }

  async function toggleSelection(id) {
    if (!state.selectionMode) return enterSelectionMode(id);
    const next = new Set(state.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    state.selectedIds = next;
    state.selectionAnchorId = id;
    await syncSelectionUi();
  }

  async function rangeSelect(id) {
    const items = await currentSelectableItems();
    const ids = items.map(item => item.id);
    const anchor = state.selectionAnchorId || state.currentSnippet?.id || id;
    const from = ids.indexOf(anchor);
    const to = ids.indexOf(id);
    if (from < 0 || to < 0) return enterSelectionMode(id);
    state.selectionMode = true;
    const next = new Set(state.selectedIds);
    for (const selectedId of ids.slice(Math.min(from, to), Math.max(from, to) + 1)) next.add(selectedId);
    state.selectedIds = next;
    state.selectionAnchorId = anchor;
    await syncSelectionUi();
  }

  async function selectedSnippets() {
    const results = await Promise.all([...state.selectedIds].map(id => getSnippet(id)));
    return results.filter(Boolean);
  }

  function summarizeTags(items) {
    const names = new Set(items.flatMap(item => item.tags || []));
    const assigned = [];
    const mixed = [];
    for (const name of names) {
      const count = items.filter(item => item.tags?.includes(name)).length;
      if (count === items.length) assigned.push(name);
      else if (count > 0) mixed.push(name);
    }
    return { assigned: assigned.sort(), mixed: mixed.sort() };
  }

  async function refreshAfterBatchMutation() {
    if (state.screen === 'trash') {
      const visible = await currentSelectableItems();
      const visibleIds = new Set(visible.map(item => item.id));
      state.selectedIds = new Set([...state.selectedIds].filter(id => visibleIds.has(id)));
      if (!state.selectedIds.size) resetSelectionState();
      await renderTrash();
      return;
    }

    const visible = await currentSelectableItems();
    const visibleIds = new Set(visible.map(item => item.id));
    state.selectedIds = new Set([...state.selectedIds].filter(id => visibleIds.has(id)));
    if (!state.selectedIds.size) resetSelectionState();

    if (state.screen === 'editor' && state.editorView) {
      if (state.currentSnippet && !visibleIds.has(state.currentSnippet.id)) {
        resetSelectionState();
        await showEditor(visible[0]?.id || null);
        return;
      }
      if (state.currentSnippet) {
        state.currentSnippet = await getSnippet(state.currentSnippet.id);
        state.editorView.updateMeta(state.currentSnippet);
      }
      await refreshDesktopSidebar();
      state.editorView?.setSelectionState({ active: state.selectionMode, ids: state.selectedIds });
      return;
    }
    await renderLibrary();
  }

  async function batchToggleStar() {
    const items = await selectedSnippets();
    if (!items.length) return;
    const target = !items.every(item => item.starred);
    for (const item of items) await updateSnippet(item.id, { starred: target });
    await refreshAfterBatchMutation();
  }

  async function batchToggleArchive() {
    const items = await selectedSnippets();
    if (!items.length) return;
    const target = !items.every(item => item.archived);
    for (const item of items) await updateSnippet(item.id, { archived: target });
    await refreshAfterBatchMutation();
  }

  async function openBatchTags() {
    let items = await selectedSnippets();
    if (!items.length) return;
    let tags = await listTagsWithCounts();
    let summary = summarizeTags(items);
    const known = new Set(tags.map(tag => tag.name));
    for (const name of [...summary.assigned, ...summary.mixed]) {
      if (!known.has(name)) tags.push({ name, count: items.filter(item => item.tags?.includes(name)).length });
    }
    tags = tags.sort((a, b) => a.name.localeCompare(b.name));
    openTagSheet({
      mode: 'assign',
      tags,
      assigned: summary.assigned,
      mixed: summary.mixed,
      onToggle: async (name, enabled) => {
        for (const item of items) await setSnippetTag(item.id, name, enabled);
        items = await selectedSnippets();
        summary = summarizeTags(items);
        await refreshAfterBatchMutation();
        return summary;
      },
      onCreate: async (name) => {
        for (const item of items) await setSnippetTag(item.id, name, true);
        items = await selectedSnippets();
        summary = summarizeTags(items);
        await refreshAfterBatchMutation();
        return summary;
      }
    });
  }

  async function batchMoveToTrash() {
    const items = await selectedSnippets();
    if (!items.length) return;
    for (const item of items) await moveToTrash(item.id);
    await refreshAfterBatchMutation();
  }

  async function finishSelection() {
    resetSelectionState();
    await syncSelectionUi();
  }

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
    resetSelectionState();
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
    resetSelectionState();
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
      selectionMode: state.selectionMode,
      selectedIds: state.selectedIds,
      onContentChange: queueSave,
      onLibrary: handleLibraryControl,
      onTags: () => openEditorTags(),
      onStar: () => toggleStar(),
      onAppearance: () => openAppearance(),
      onShare: () => shareCurrent(),
      onMore: () => openEditorMore(),
      onLibraryScope: scope => switchLibraryScope(scope),
      onOpenSnippet: id => showEditor(id),
      onNew: () => showEditor(null),
      onStartSelection: id => enterSelectionMode(id),
      onToggleSelection: id => toggleSelection(id),
      onRangeSelect: id => rangeSelect(id),
      onBatchStar: () => batchToggleStar(),
      onBatchArchive: () => batchToggleArchive(),
      onBatchTags: () => openBatchTags(),
      onBatchDelete: () => batchMoveToTrash(),
      onDoneSelection: () => finishSelection()
    });
    requestAnimationFrame(() => state.editorView?.focus());
  }

  async function showLibrary(scope = state.libraryScope) {
    resetSelectionState();
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
      selectionMode: state.selectionMode,
      selectedIds: state.selectedIds,
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
      onMore: () => openLibraryMore(),
      onStartSelection: id => enterSelectionMode(id),
      onToggleSelection: id => toggleSelection(id),
      onRangeSelect: id => rangeSelect(id),
      onBatchStar: () => batchToggleStar(),
      onBatchArchive: () => batchToggleArchive(),
      onBatchTags: () => openBatchTags(),
      onBatchDelete: () => batchMoveToTrash(),
      onDoneSelection: () => finishSelection()
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
      { id: 'select', label: 'Select' },
      { id: 'trash', label: 'Trash' },
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
      { id: 'settings', label: 'Settings' }
    ] : [
      { id: 'select', label: 'Select' },
      { id: 'trash', label: 'Trash' },
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
      { id: 'settings', label: 'Settings' }
    ];
    if (onSignOut) actions.push({ id: 'signout', label: 'Sign out' });

    openMoreMenu({
      actions,
      onAction: async id => {
        if (id === 'settings') { openAppearance(); return; }
        if (id === 'shortcuts') { openKeyboardShortcuts(); return; }
        if (id === 'select') { await enterSelectionMode(state.currentSnippet?.id || null); return; }
        if (id === 'trash') { await showTrash(); return; }
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
    const actions = [
      { id: 'select', label: 'Select' },
      { id: 'trash', label: 'Trash' },
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
      { id: 'settings', label: 'Settings' }
    ];
    if (onSignOut) actions.push({ id: 'signout', label: 'Sign out' });
    openMoreMenu({
      actions,
      onAction: async id => {
        if (id === 'select') await enterSelectionMode();
        else if (id === 'trash') await showTrash();
        else if (id === 'shortcuts') openKeyboardShortcuts();
        else if (id === 'settings') openAppearance();
        else if (id === 'signout') await onSignOut?.();
      }
    });
  }

  async function batchRestoreFromTrash() {
    const items = await selectedSnippets();
    if (!items.length) return;
    for (const item of items) await restoreSnippet(item.id);
    await refreshAfterBatchMutation();
    showToast(items.length === 1 ? 'Restored' : `${items.length} restored`);
  }

  async function batchDeleteFromTrash() {
    const items = await selectedSnippets();
    if (!items.length) return;
    const message = items.length === 1
      ? 'Delete this snippet permanently? This cannot be undone.'
      : `Delete ${items.length} snippets permanently? This cannot be undone.`;
    if (!window.confirm(message)) return;
    for (const item of items) await deleteSnippetPermanently(item.id);
    await refreshAfterBatchMutation();
  }

  async function leaveTrash() {
    const destination = state.trashReturn;
    state.trashReturn = null;
    resetSelectionState();
    if (destination?.screen === 'editor') {
      await showEditor(destination.id || null);
      return;
    }
    await showLibrary(destination?.scope || 'inbox');
  }

  async function renderTrash() {
    const items = (await listSnippets({ scope: 'trash' })).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    renderTrashView(root, {
      items,
      selectionMode: state.selectionMode,
      selectedIds: state.selectedIds,
      onBack: () => leaveTrash(),
      onRestore: async id => { await restoreSnippet(id); await renderTrash(); showToast('Restored'); },
      onDeletePermanently: async id => {
        if (!window.confirm('Delete this snippet permanently? This cannot be undone.')) return;
        await deleteSnippetPermanently(id);
        await renderTrash();
      },
      onSelect: () => enterSelectionMode(),
      onStartSelection: id => enterSelectionMode(id),
      onToggleSelection: id => toggleSelection(id),
      onRangeSelect: id => rangeSelect(id),
      onDoneSelection: () => finishSelection(),
      onBatchRestore: () => batchRestoreFromTrash(),
      onBatchDelete: () => batchDeleteFromTrash()
    });
  }

  async function showTrash() {
    if (state.screen !== 'trash') {
      state.trashReturn = {
        screen: state.screen,
        scope: state.libraryScope,
        id: state.currentSnippet?.id || null
      };
      if (state.screen === 'editor') await leaveEditor();
      resetSelectionState();
      state.screen = 'trash';
    }
    await renderTrash();
  }

  async function handleGlobalShortcut(event) {
    if (document.body.dataset.shortcutCapture === 'true') return;
    if (state.selectionMode && event.key === 'Escape') { event.preventDefault(); await finishSelection(); return; }
    const shortcuts = state.preferences.keyboardShortcuts || DEFAULT_SHORTCUTS;
    const action = Object.entries(shortcuts).find(([, shortcut]) => shortcutMatchesEvent(shortcut, event))?.[0];
    if (!action) return;
    event.preventDefault();

    if (action === 'newSnippet') await showEditor(null);
    else if (action === 'inbox') await switchLibraryScope('inbox');
    else if (action === 'starred') await switchLibraryScope('starred');
    else if (action === 'archive') await switchLibraryScope('archive');
    else if (action === 'toggleStar' && state.selectionMode) await batchToggleStar();
    else if (action === 'toggleStar' && state.screen === 'editor') await toggleStar();
    else if (action === 'tags') {
      if (state.selectionMode && state.screen !== 'trash') await openBatchTags();
      else if (state.screen === 'editor') await openEditorTags();
      else if (state.screen === 'library') await openLibraryTags();
    } else if (action === 'toggleSidebar') await toggleSidebar();
  }

  document.addEventListener('keydown', handleGlobalShortcut);

  const initialSnippets = await listSnippets({ scope: 'all' });
  const target = chooseLaunchTarget({ snippets: initialSnippets, returnWindow: state.preferences.returnWindow });
  if (target.type === 'snippet') await showEditor(target.id);
  else if (target.type === 'inbox') await showLibrary('inbox');
  else await showEditor(null);

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
