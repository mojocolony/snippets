import { parseTodoLine, renderInlineMarkdown, splitLineForDisplay } from './markdownHelpers.js';
import { applyEditorLineInput, backspaceAtLineStart, splitLineAt, toggleTodoAtLine } from './editorState.js';
import { moveLine } from './todoReorder.js';
import { isSelectAllShortcut } from './editorNavigation.js';
import { applyInlineFormat, shouldShowFormattingPalette, toggleTodoLines } from './selectionFormatting.js';
import { formattingActionsForLayout, keyboardAccessoryGeometry, shouldAnchorFormattingBarToKeyboard, shouldUseKeyboardFormattingBar } from './formattingViewport.js';

function offsetWithin(element, container, containerOffset) {
  if (!element || !container || !element.contains(container)) return 0;
  const range = document.createRange();
  range.selectNodeContents(element);
  try { range.setEnd(container, containerOffset); }
  catch { return 0; }
  return range.toString().length;
}

function selectionOffset(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) return 0;
  return offsetWithin(element, selection.anchorNode, selection.anchorOffset);
}

function selectionOffsets(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const active = selection.getRangeAt(0);
  if (!element.contains(active.startContainer) || !element.contains(active.endContainer)) return { start: 0, end: 0 };
  const a = offsetWithin(element, active.startContainer, active.startOffset);
  const b = offsetWithin(element, active.endContainer, active.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

function toggleInlineMarker(text, start, end, marker) {
  const source = String(text);
  if (end <= start) return { text: source, start, end };
  const markerLength = marker.length;
  const selected = source.slice(start, end);
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > markerLength * 2) {
    const inner = selected.slice(markerLength, -markerLength);
    return {
      text: source.slice(0, start) + inner + source.slice(end),
      start,
      end: start + inner.length
    };
  }
  if (source.slice(Math.max(0, start - markerLength), start) === marker && source.slice(end, end + markerLength) === marker) {
    return {
      text: source.slice(0, start - markerLength) + selected + source.slice(end + markerLength),
      start: start - markerLength,
      end: end - markerLength
    };
  }
  return {
    text: source.slice(0, start) + marker + selected + marker + source.slice(end),
    start: start + markerLength,
    end: end + markerLength
  };
}

function isFencedCodeLine(source, lineIndex) {
  const lines = String(source).split('\n');
  let inFence = false;
  for (let i = 0; i <= lineIndex && i < lines.length; i += 1) {
    const fence = /^\s*```/.test(lines[i]);
    if (fence) {
      if (i === lineIndex) return true;
      inFence = !inFence;
      continue;
    }
    if (i === lineIndex) return inFence;
  }
  return false;
}

function editableTextForLine(line) {
  const todo = parseTodoLine(line);
  return todo ? todo.text : String(line);
}

function canReorderTodo(doc, fromIndex, toIndex) {
  const lines = doc.split('\n');
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return lines.slice(start, end + 1).every(line => Boolean(parseTodoLine(line)));
}

function spanForNode(surface, node) {
  if (!node || !surface.contains(node)) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element?.closest?.('.editor-line-text') || null;
}

function lineIndexForSpan(span) {
  const index = Number(span?.dataset?.lineIndex);
  return Number.isInteger(index) ? index : null;
}

function displayOffsetToEditable(line, displayOffset) {
  const todo = parseTodoLine(line);
  if (todo) return Math.max(0, Math.min(displayOffset, todo.text.length));
  const display = splitLineForDisplay(line);
  if (['heading', 'bullet', 'quote'].includes(display.type)) {
    const prefixLength = Math.max(0, String(line).length - String(display.text ?? '').length);
    return Math.max(0, Math.min(prefixLength + displayOffset, String(line).length));
  }
  return Math.max(0, Math.min(displayOffset, String(line).length));
}

function textPointForOffset(element, requestedOffset) {
  const offset = Math.max(0, Number(requestedOffset) || 0);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let lastText = null;
  while (node) {
    lastText = node;
    const length = node.textContent?.length || 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  if (lastText) return { node: lastText, offset: lastText.textContent?.length || 0 };
  return { node: element, offset: 0 };
}

function setTextSelection(surface, element, start, end = start) {
  surface.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    if (!element.isConnected) return;
    const startPoint = textPointForOffset(element, start);
    const endPoint = textPointForOffset(element, end);
    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

export function mountMarkdownEditor(host, { value = '', onChange = () => {}, fontFamily, fontSize = 18 } = {}) {
  let doc = String(value);
  let destroyed = false;
  let dragState = null;
  let wholeDocumentSelected = false;
  let activeLineIndex = null;
  let selectionSyncFrame = null;
  let formattingSyncFrame = null;
  let formattingSelection = null;
  let rememberedEditorSelection = null;
  let formattingSuspended = false;
  let formattingInteractionActive = false;
  let pointerFormattingAction = null;
  let gutterSyncFrame = null;
  const visualViewport = window.visualViewport;
  const touchFormattingLayout = shouldUseKeyboardFormattingBar({ maxTouchPoints: navigator.maxTouchPoints });
  let formattingViewportBaselineHeight = Math.max(visualViewport?.height || 0, window.innerHeight || 0);

  host.classList.add('markdown-editor');

  const gutter = document.createElement('div');
  gutter.className = 'editor-control-gutter';
  const surface = document.createElement('div');
  surface.className = 'editor-text-surface';
  surface.dataset.testid = 'editor-input';
  surface.setAttribute('role', 'textbox');
  surface.setAttribute('aria-multiline', 'true');
  surface.contentEditable = 'true';
  surface.spellcheck = true;

  const palette = document.createElement('div');
  palette.className = 'formatting-palette';
  palette.setAttribute('role', 'toolbar');
  palette.setAttribute('aria-label', 'Text formatting');
  palette.hidden = true;
  let paletteKeyboardAccessory = null;

  function formattingButtonMarkup(action, { keyboardAccessory = false } = {}) {
    if (action === 'todo') return `<button type="button" class="formatting-button formatting-todo" data-format-action="todo" aria-label="Todo" title="Todo"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"></path></svg></button>`;
    if (keyboardAccessory && action === 'highlight') return `<button type="button" class="formatting-button formatting-highlight" data-format-action="highlight" aria-label="Highlight" title="Highlight"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 12h12"></path><path d="M6 20V4"></path><path d="M18 20V4"></path></svg></button>`;
    if (keyboardAccessory && action === 'bold') return `<button type="button" class="formatting-button" data-format-action="bold" aria-label="Bold" title="Bold"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"></path></svg></button>`;
    if (keyboardAccessory && action === 'italic') return `<button type="button" class="formatting-button" data-format-action="italic" aria-label="Italic" title="Italic"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="19" x2="10" y1="4" y2="4"></line><line x1="14" x2="5" y1="20" y2="20"></line><line x1="15" x2="9" y1="4" y2="20"></line></svg></button>`;
    if (keyboardAccessory && action === 'strike') return `<button type="button" class="formatting-button formatting-strike" data-format-action="strike" aria-label="Strikethrough" title="Strikethrough"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" x2="20" y1="12" y2="12"></line></svg></button>`;
    if (action === 'highlight') return `<button type="button" class="formatting-button formatting-highlight" data-format-action="highlight" aria-label="Highlight" title="Highlight">H</button>`;
    if (action === 'bold') return `<button type="button" class="formatting-button" data-format-action="bold" aria-label="Bold" title="Bold"><strong>B</strong></button>`;
    if (action === 'italic') return `<button type="button" class="formatting-button" data-format-action="italic" aria-label="Italic" title="Italic"><em>I</em></button>`;
    if (action === 'strike') return `<button type="button" class="formatting-button formatting-strike" data-format-action="strike" aria-label="Strikethrough" title="Strikethrough">S</button>`;
    if (action === 'code') return `<button type="button" class="formatting-button formatting-code" data-format-action="code" aria-label="Code" title="Code">&lt;/&gt;</button>`;
    if (action === 'link') return `<button type="button" class="formatting-button formatting-link" data-format-action="link" aria-label="Link" title="Link"><svg class="formatting-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;
    return '';
  }

  function syncFormattingPaletteActions(keyboardAccessory) {
    if (paletteKeyboardAccessory === keyboardAccessory) return;
    paletteKeyboardAccessory = keyboardAccessory;
    palette.innerHTML = formattingActionsForLayout({ keyboardAccessory }).map(action => formattingButtonMarkup(action, { keyboardAccessory })).join('');
  }

  syncFormattingPaletteActions(false);
  host.replaceChildren(gutter, surface, palette);

  function notify() { if (!destroyed) onChange(doc); }

  function applyAppearance(nextFamily = fontFamily, nextSize = fontSize) {
    fontFamily = nextFamily;
    fontSize = nextSize;
    if (fontFamily) host.style.setProperty('--editor-font', fontFamily);
    host.style.setProperty('--editor-size', `${fontSize}px`);
    queueGutterSync();
  }

  function decorateText(span, display, { autoLink = true } = {}) {
    span.innerHTML = renderInlineMarkdown(display.text ?? '', { autoLink });
    if (!span.textContent) span.innerHTML = '<br>';
  }

  function makeTextLine(line, index) {
    const codeLine = isFencedCodeLine(doc, index);
    const display = codeLine ? { type: 'code', text: line } : splitLineForDisplay(line);
    const editing = index === activeLineIndex;
    const span = document.createElement('div');
    span.className = `editor-line-text editor-line--${display.type}`;
    span.dataset.lineIndex = String(index);
    if (display.type === 'todo' && display.checked) span.classList.add('is-complete');
    if (display.type === 'heading') span.classList.add(`heading-${Math.min(display.level, 3)}`);
    if (editing) {
      span.classList.add('is-editing');
      const raw = editableTextForLine(line);
      if (raw) span.textContent = raw;
      else span.innerHTML = '<br>';
    } else {
      decorateText(span, display, { autoLink: !codeLine });
    }
    return span;
  }

  function clearDropTargets() {
    surface.querySelectorAll('.editor-line-text.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
  }

  function lineIndexAtClientY(clientY) {
    let closestIndex = null;
    let closestDistance = Infinity;
    for (const line of surface.querySelectorAll('.editor-line-text')) {
      const rect = line.getBoundingClientRect();
      const index = lineIndexForSpan(line);
      if (index == null) continue;
      if (clientY >= rect.top && clientY <= rect.bottom) return index;
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }
    return closestIndex;
  }

  function makeGutterItem(line, index) {
    const display = isFencedCodeLine(doc, index) ? { type: 'code', text: line } : splitLineForDisplay(line);
    if (display.type !== 'todo' && display.type !== 'bullet') return null;

    const item = document.createElement('div');
    item.className = `editor-gutter-item editor-gutter-item--${display.type}`;
    item.dataset.lineIndex = String(index);
    if (index === activeLineIndex) item.classList.add('is-editing');

    if (display.type === 'todo') {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'todo-handle';
      handle.dataset.lineIndex = String(index);
      handle.setAttribute('aria-label', 'Reorder todo');
      handle.innerHTML = '<svg class="todo-handle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
      handle.addEventListener('pointerdown', event => {
        event.preventDefault();
        dragState = { from: index, to: index, handle };
        handle.setPointerCapture?.(event.pointerId);
        item.classList.add('is-dragging');
      });
      handle.addEventListener('pointermove', event => {
        if (!dragState) return;
        const targetIndex = lineIndexAtClientY(event.clientY);
        if (Number.isInteger(targetIndex) && canReorderTodo(doc, dragState.from, targetIndex)) {
          clearDropTargets();
          surface.querySelector(`.editor-line-text[data-line-index="${targetIndex}"]`)?.classList.add('is-drop-target');
          dragState.to = targetIndex;
        }
      });
      handle.addEventListener('pointerup', event => {
        if (!dragState) return;
        handle.releasePointerCapture?.(event.pointerId);
        const { from, to } = dragState;
        dragState = null;
        clearDropTargets();
        if (from !== to && canReorderTodo(doc, from, to)) {
          doc = moveLine(doc, from, to);
          if (activeLineIndex === from) activeLineIndex = to;
          render();
          notify();
        } else render();
      });
      item.append(handle);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-check';
      checkbox.dataset.lineIndex = String(index);
      checkbox.checked = display.checked;
      checkbox.setAttribute('aria-label', display.checked ? 'Mark todo incomplete' : 'Mark todo complete');
      checkbox.addEventListener('change', () => {
        doc = toggleTodoAtLine(doc, index);
        render();
        notify();
      });
      const checkSlot = document.createElement('span');
      checkSlot.className = 'todo-check-slot';
      checkSlot.append(checkbox);
      item.append(checkSlot);
    } else {
      const bullet = document.createElement('span');
      bullet.className = 'bullet-marker';
      bullet.setAttribute('aria-hidden', 'true');
      item.append(bullet);
    }

    return item;
  }

  function syncGutterGeometry() {
    gutterSyncFrame = null;
    if (destroyed) return;
    for (const item of gutter.querySelectorAll('.editor-gutter-item')) {
      const index = Number(item.dataset.lineIndex);
      const line = surface.querySelector(`.editor-line-text[data-line-index="${index}"]`);
      if (!line) continue;
      item.style.top = `${line.offsetTop}px`;
      item.style.height = `${line.offsetHeight}px`;
    }
  }

  function queueGutterSync() {
    if (destroyed || gutterSyncFrame != null) return;
    gutterSyncFrame = requestAnimationFrame(syncGutterGeometry);
  }

  function renderGutter() {
    const lines = doc.split('\n');
    gutter.replaceChildren(...lines.map(makeGutterItem).filter(Boolean));
    queueGutterSync();
  }

  function renderLine(index) {
    if (destroyed) return;
    const existing = surface.querySelector(`.editor-line-text[data-line-index="${index}"]`);
    if (!existing) return;
    const line = doc.split('\n')[index] ?? '';
    existing.replaceWith(makeTextLine(line, index));
    renderGutter();
  }

  function setCaretForLine(lineIndex, caretOffset) {
    rememberEditorSelection({
      startLine: lineIndex,
      startOffset: caretOffset,
      endLine: lineIndex,
      endOffset: caretOffset,
      collapsed: true,
      rect: null
    });
    const target = surface.querySelector(`.editor-line-text[data-line-index="${lineIndex}"]`);
    if (target) setTextSelection(surface, target, caretOffset);
  }

  function render(focusIndex = null, caretOffset = 0) {
    if (destroyed) return;
    const lines = doc.split('\n');
    if (focusIndex != null) activeLineIndex = Math.max(0, Math.min(focusIndex, lines.length - 1));
    if (activeLineIndex != null && activeLineIndex >= lines.length) activeLineIndex = lines.length - 1;
    surface.replaceChildren(...lines.map(makeTextLine));
    renderGutter();
    if (focusIndex != null) setCaretForLine(activeLineIndex, caretOffset);
  }

  function activateLine(index, caretOffset = null) {
    const lines = doc.split('\n');
    if (!Number.isInteger(index) || index < 0 || index >= lines.length) return;
    if (activeLineIndex === index) {
      if (caretOffset != null) setCaretForLine(index, caretOffset);
      return;
    }
    const previous = activeLineIndex;
    activeLineIndex = index;
    if (previous != null) renderLine(previous);
    renderLine(index);
    if (caretOffset != null) setCaretForLine(index, caretOffset);
  }

  function deactivateActiveLine() {
    if (activeLineIndex == null) return;
    const previous = activeLineIndex;
    activeLineIndex = null;
    renderLine(previous);
  }

  function selectionLineInfo() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !surface.contains(selection.anchorNode)) return null;
    const span = spanForNode(surface, selection.anchorNode);
    const index = lineIndexForSpan(span);
    if (!span || index == null) return null;
    const displayOffset = selectionOffset(span);
    const line = doc.split('\n')[index] ?? '';
    const offset = span.classList.contains('is-editing')
      ? displayOffset
      : displayOffsetToEditable(line, displayOffset);
    return { selection, span, index, offset };
  }

  function rangeLineInfo() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const startSpan = spanForNode(surface, range.startContainer);
    const endSpan = spanForNode(surface, range.endContainer);
    const startIndex = lineIndexForSpan(startSpan);
    const endIndex = lineIndexForSpan(endSpan);
    if (!startSpan || !endSpan || startIndex == null || endIndex == null) return null;
    const lines = doc.split('\n');
    const rawStart = offsetWithin(startSpan, range.startContainer, range.startOffset);
    const rawEnd = offsetWithin(endSpan, range.endContainer, range.endOffset);
    const startOffset = startSpan.classList.contains('is-editing')
      ? rawStart
      : displayOffsetToEditable(lines[startIndex] ?? '', rawStart);
    const endOffset = endSpan.classList.contains('is-editing')
      ? rawEnd
      : displayOffsetToEditable(lines[endIndex] ?? '', rawEnd);
    return { selection, range, startSpan, endSpan, startIndex, endIndex, startOffset, endOffset };
  }

  function currentFormattingSelection() {
    const info = rangeLineInfo();
    if (!info) return null;
    const selection = window.getSelection();
    return {
      startLine: info.startIndex,
      startOffset: info.startOffset,
      endLine: info.endIndex,
      endOffset: info.endOffset,
      collapsed: Boolean(selection?.isCollapsed),
      rect: info.range.getBoundingClientRect()
    };
  }

  function rememberEditorSelection(snapshot = currentFormattingSelection()) {
    if (!snapshot) return rememberedEditorSelection;
    rememberedEditorSelection = {
      startLine: snapshot.startLine,
      startOffset: snapshot.startOffset,
      endLine: snapshot.endLine,
      endOffset: snapshot.endOffset,
      collapsed: Boolean(snapshot.collapsed),
      rect: snapshot.rect || null
    };
    return rememberedEditorSelection;
  }

  function defaultEditorSelection() {
    const lines = doc.split('\n');
    const lineIndex = Number.isInteger(activeLineIndex)
      ? Math.max(0, Math.min(activeLineIndex, lines.length - 1))
      : 0;
    const offset = editableTextForLine(lines[lineIndex] ?? '').length;
    return {
      startLine: lineIndex,
      startOffset: offset,
      endLine: lineIndex,
      endOffset: offset,
      collapsed: true,
      rect: null
    };
  }

  function hideFormattingPalette() {
    formattingSelection = null;
    palette.hidden = true;
    palette.classList.remove('is-keyboard-accessory');
    palette.style.width = '';
  }

  function updateFormattingPalette() {
    formattingSyncFrame = null;
    if (destroyed) return;
    const liveSnapshot = currentFormattingSelection();
    if (liveSnapshot) rememberEditorSelection(liveSnapshot);
    const snapshot = liveSnapshot || (formattingInteractionActive ? formattingSelection : null);
    const selectionInsideEditor = surface.contains(window.getSelection()?.anchorNode);
    if (
      !shouldShowFormattingPalette(snapshot, { suspended: formattingSuspended }) ||
      (!selectionInsideEditor && !formattingInteractionActive)
    ) {
      hideFormattingPalette();
      return;
    }
    formattingSelection = snapshot;
    palette.hidden = false;

    const viewportHeight = visualViewport?.height || window.innerHeight || 0;
    const useKeyboardAccessory = shouldAnchorFormattingBarToKeyboard({
      touchLayout: touchFormattingLayout,
      baselineHeight: formattingViewportBaselineHeight,
      viewportHeight
    });
    palette.classList.toggle('is-keyboard-accessory', useKeyboardAccessory);
    syncFormattingPaletteActions(useKeyboardAccessory);

    if (useKeyboardAccessory) {
      const viewport = visualViewport || {
        offsetLeft: 0,
        offsetTop: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
      const geometry = keyboardAccessoryGeometry(viewport, { toolbarHeight: palette.offsetHeight || 48 });
      palette.style.left = `${geometry.left}px`;
      palette.style.top = `${geometry.top}px`;
      palette.style.bottom = 'auto';
      palette.style.width = `${geometry.width}px`;
      return;
    }

    palette.style.width = '';
    const width = palette.offsetWidth || 300;
    const half = width / 2;
    const center = snapshot.rect.left + snapshot.rect.width / 2;
    palette.style.left = `${Math.max(half + 8, Math.min(window.innerWidth - half - 8, center))}px`;
    palette.style.top = `${Math.max(10, snapshot.rect.top - 8)}px`;
    palette.style.bottom = 'auto';
  }

  function queueFormattingPalette() {
    if (destroyed || formattingSyncFrame != null) return;
    formattingSyncFrame = requestAnimationFrame(updateFormattingPalette);
  }

  function applyFormattingAction(action) {
    const snapshot = currentFormattingSelection() || formattingSelection || rememberedEditorSelection || defaultEditorSelection();
    if (!snapshot) return;
    rememberEditorSelection(snapshot);

    if (action === 'todo') {
      const result = toggleTodoLines(doc, snapshot.startLine, snapshot.endLine);
      doc = result.doc;
      wholeDocumentSelected = false;
      const lines = doc.split('\n');
      const caretLine = snapshot.collapsed ? snapshot.startLine : snapshot.endLine;
      const caretOffset = snapshot.collapsed
        ? Math.min(snapshot.startOffset, editableTextForLine(lines[caretLine] ?? '').length)
        : editableTextForLine(lines[caretLine] ?? '').length;
      activeLineIndex = caretLine;
      render(caretLine, caretOffset);
      notify();
      return;
    }

    if (snapshot.collapsed) return;
    const options = {};
    if (action === 'link') {
      const href = prompt('Link URL');
      if (!href) return;
      options.href = href;
    }
    const result = applyInlineFormat(doc, snapshot, action, options);
    if (result.doc === doc) return;
    doc = result.doc;
    wholeDocumentSelected = false;
    notify();

    if (result.selection.startLine === result.selection.endLine) {
      activeLineIndex = result.selection.startLine;
      render();
      const target = surface.querySelector(`.editor-line-text[data-line-index="${activeLineIndex}"]`);
      if (target) setTextSelection(surface, target, result.selection.startOffset, result.selection.endOffset);
      return;
    }

    const lines = doc.split('\n');
    activeLineIndex = result.selection.endLine;
    render(activeLineIndex, editableTextForLine(lines[activeLineIndex] ?? '').length);
  }

  function replaceCrossLineSelection(insertText = '') {
    const info = rangeLineInfo();
    if (!info || info.startIndex === info.endIndex) return false;
    const lines = doc.split('\n');
    const startLine = lines[info.startIndex] ?? '';
    const endLine = lines[info.endIndex] ?? '';
    const startTodo = parseTodoLine(startLine);
    const startEditable = editableTextForLine(startLine);
    const endEditable = editableTextForLine(endLine);
    const before = startEditable.slice(0, info.startOffset);
    const after = endEditable.slice(info.endOffset);
    const inserted = String(insertText).replace(/\r/g, '').split('\n');
    let replacement;
    let targetOffset;
    if (inserted.length === 1) {
      replacement = [before + inserted[0] + after];
      targetOffset = before.length + inserted[0].length;
    } else {
      replacement = [
        before + inserted[0],
        ...inserted.slice(1, -1),
        inserted.at(-1) + after
      ];
      targetOffset = inserted.at(-1).length;
    }
    if (startTodo) replacement[0] = `${startTodo.checked ? '- [x] ' : '- [ ] '}${replacement[0]}`;
    lines.splice(info.startIndex, info.endIndex - info.startIndex + 1, ...replacement);
    doc = lines.join('\n');
    wholeDocumentSelected = false;
    activeLineIndex = info.startIndex + replacement.length - 1;
    render(activeLineIndex, targetOffset);
    notify();
    return true;
  }

  function selectWholeDocument() {
    const spans = [...surface.querySelectorAll('.editor-line-text')];
    if (!spans.length) return;
    const range = document.createRange();
    range.setStart(spans[0], 0);
    range.setEnd(spans.at(-1), spans.at(-1).childNodes.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    wholeDocumentSelected = true;
  }

  function queueSelectionSync() {
    if (destroyed || selectionSyncFrame != null) return;
    selectionSyncFrame = requestAnimationFrame(() => {
      selectionSyncFrame = null;
      if (destroyed || wholeDocumentSelected) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed || !surface.contains(selection.anchorNode)) return;
      const info = selectionLineInfo();
      if (!info || info.index === activeLineIndex) return;
      activateLine(info.index, info.offset);
    });
  }

  surface.addEventListener('pointerdown', event => {
    formattingSuspended = false;
    hideFormattingPalette();
    const link = event.target.closest?.('a');
    const span = event.target.closest?.('.editor-line-text');
    if (link && span && !span.classList.contains('is-editing')) event.preventDefault();
  });

  surface.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    const span = event.target.closest?.('.editor-line-text');
    if (!link || !span || span.classList.contains('is-editing')) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(link.href, '_blank', 'noopener,noreferrer');
  });

  surface.addEventListener('pointerup', () => { queueSelectionSync(); queueFormattingPalette(); });
  surface.addEventListener('keyup', event => {
    if (/^(Arrow|Home|End)/.test(event.key)) { queueSelectionSync(); queueFormattingPalette(); }
  });

  palette.addEventListener('pointerdown', event => {
    const button = event.target.closest?.('[data-format-action]');
    if (!button) return;
    event.preventDefault();
    const snapshot = currentFormattingSelection() || formattingSelection || rememberedEditorSelection;
    if (snapshot) {
      formattingSelection = { ...snapshot };
      rememberEditorSelection(snapshot);
    }
    formattingInteractionActive = true;
    pointerFormattingAction = button.dataset.formatAction;
    applyFormattingAction(button.dataset.formatAction);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      formattingInteractionActive = false;
      queueFormattingPalette();
    }));
    setTimeout(() => { pointerFormattingAction = null; }, 0);
  });
  palette.addEventListener('click', event => {
    const button = event.target.closest?.('[data-format-action]');
    if (!button) return;
    if (pointerFormattingAction === button.dataset.formatAction) return;
    applyFormattingAction(button.dataset.formatAction);
  });

  surface.addEventListener('input', event => {
    if (wholeDocumentSelected) return;
    let span = event.target.closest?.('.editor-line-text') || null;
    if (!span) span = selectionLineInfo()?.span || null;
    const index = lineIndexForSpan(span);
    if (!span || index == null) return;
    if (activeLineIndex !== index) activeLineIndex = index;
    const offset = selectionOffset(span);
    const result = applyEditorLineInput(doc, index, span.textContent, offset);
    doc = result.doc;
    if (result.becameTodo) render(index, result.caretOffset);
    else queueGutterSync();
    notify();
  });

  surface.addEventListener('keydown', event => {
    formattingSuspended = false;
    if (isSelectAllShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      selectWholeDocument();
      return;
    }

    const selection = window.getSelection();
    const info = selectionLineInfo();
    const formatKey = event.key.toLowerCase();
    const formatModifier = (event.metaKey || event.ctrlKey) && !event.altKey;
    if (formatModifier && !event.shiftKey && (formatKey === 'b' || formatKey === 'i')) {
      event.preventDefault();
      event.stopPropagation();
      if (!info || !selection || selection.isCollapsed || info.index !== activeLineIndex) return;
      const rangeInfo = rangeLineInfo();
      if (!rangeInfo || rangeInfo.startIndex !== rangeInfo.endIndex) return;
      const { start, end } = selectionOffsets(info.span);
      if (end <= start) return;
      const marker = formatKey === 'b' ? '**' : '_';
      const formatted = toggleInlineMarker(info.span.textContent, start, end, marker);
      const result = applyEditorLineInput(doc, info.index, formatted.text, formatted.end);
      doc = result.doc;
      activeLineIndex = info.index;
      renderLine(info.index);
      notify();
      const target = surface.querySelector(`.editor-line-text[data-line-index="${info.index}"]`);
      if (target) setTextSelection(surface, target, formatted.start, formatted.end);
      return;
    }

    if (!info || !selection?.isCollapsed) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const result = splitLineAt(doc, info.index, info.offset);
      doc = result.doc;
      activeLineIndex = result.lineIndex;
      render(result.lineIndex, result.caretOffset);
      notify();
      return;
    }
    if (event.key === 'Backspace' && info.offset === 0) {
      const result = backspaceAtLineStart(doc, info.index);
      if (!result.handled) return;
      event.preventDefault();
      doc = result.doc;
      activeLineIndex = result.lineIndex;
      render(result.lineIndex, result.caretOffset);
      notify();
    }
  });

  surface.addEventListener('paste', event => {
    if (wholeDocumentSelected) {
      event.preventDefault();
      event.stopPropagation();
      doc = event.clipboardData?.getData('text/plain')?.replace(/\r/g, '') ?? '';
      wholeDocumentSelected = false;
      const lines = doc.split('\n');
      activeLineIndex = lines.length - 1;
      render(activeLineIndex, editableTextForLine(lines.at(-1) || '').length);
      notify();
      return;
    }

    const text = event.clipboardData?.getData('text/plain') ?? '';
    const rangeInfo = rangeLineInfo();
    if (rangeInfo && rangeInfo.startIndex !== rangeInfo.endIndex) {
      event.preventDefault();
      replaceCrossLineSelection(text);
      return;
    }
    if (!text.includes('\n')) return;
    const info = selectionLineInfo();
    if (!info) return;
    event.preventDefault();
    const currentLines = doc.split('\n');
    const current = currentLines[info.index] ?? '';
    const todo = parseTodoLine(current);
    const editable = todo ? todo.text : current;
    const before = editable.slice(0, info.offset);
    const after = editable.slice(info.offset);
    const pasted = text.replace(/\r/g, '').split('\n');
    const replacement = [before + pasted[0], ...pasted.slice(1, -1), pasted.at(-1) + after];
    if (todo) replacement[0] = `${todo.checked ? '- [x] ' : '- [ ] '}${replacement[0]}`;
    currentLines.splice(info.index, 1, ...replacement);
    doc = currentLines.join('\n');
    const targetIndex = info.index + replacement.length - 1;
    const targetOffset = pasted.at(-1).length;
    activeLineIndex = targetIndex;
    render(targetIndex, targetOffset);
    notify();
  });

  surface.addEventListener('copy', event => {
    if (!wholeDocumentSelected) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', doc);
  });

  surface.addEventListener('cut', event => {
    if (!wholeDocumentSelected) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', doc);
    doc = '';
    wholeDocumentSelected = false;
    activeLineIndex = 0;
    render(0, 0);
    notify();
  });

  surface.addEventListener('beforeinput', event => {
    if (wholeDocumentSelected) {
      if (event.inputType === 'insertFromPaste') return;
      if (event.inputType?.startsWith('delete')) {
        event.preventDefault();
        doc = '';
        wholeDocumentSelected = false;
        activeLineIndex = 0;
        render(0, 0);
        notify();
        return;
      }
      if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
        event.preventDefault();
        doc = event.data || '';
        wholeDocumentSelected = false;
        activeLineIndex = 0;
        render(0, doc.length);
        notify();
      }
      return;
    }

    const rangeInfo = rangeLineInfo();
    if (!rangeInfo || rangeInfo.startIndex === rangeInfo.endIndex) return;
    if (event.inputType === 'insertFromPaste') return;
    if (event.inputType?.startsWith('delete')) {
      event.preventDefault();
      replaceCrossLineSelection('');
      return;
    }
    if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
      event.preventDefault();
      replaceCrossLineSelection(event.data || '');
    }
  }, true);

  surface.addEventListener('blur', event => {
    if (destroyed || (event.relatedTarget && host.contains(event.relatedTarget))) return;
    hideFormattingPalette();
    deactivateActiveLine();
  });

  const handleSelectionChange = () => {
    if (destroyed) return;
    const selection = window.getSelection();
    if (wholeDocumentSelected) {
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) wholeDocumentSelected = false;
      else return;
    }
    const snapshot = currentFormattingSelection();
    if (snapshot) rememberEditorSelection(snapshot);
    queueSelectionSync();
    queueFormattingPalette();
  };
  document.addEventListener('selectionchange', handleSelectionChange);

  const suspendFormattingPalette = () => {
    formattingSuspended = true;
    hideFormattingPalette();
  };
  const handleVisibilityChange = () => {
    if (document.hidden) suspendFormattingPalette();
    else hideFormattingPalette();
  };
  window.addEventListener('blur', suspendFormattingPalette);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const resizeHandler = () => { queueGutterSync(); queueFormattingPalette(); };
  const visualViewportHandler = () => {
    if (!visualViewport) return;
    if (visualViewport.height > formattingViewportBaselineHeight) formattingViewportBaselineHeight = visualViewport.height;
    queueFormattingPalette();
  };
  window.addEventListener('resize', resizeHandler);
  visualViewport?.addEventListener('resize', visualViewportHandler);
  visualViewport?.addEventListener('scroll', visualViewportHandler);
  const gutterObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(queueGutterSync) : null;
  gutterObserver?.observe(surface);

  applyAppearance();
  render();

  return {
    getValue: () => doc,
    setValue(next) {
      doc = String(next ?? '');
      activeLineIndex = null;
      wholeDocumentSelected = false;
      rememberedEditorSelection = null;
      render();
    },
    focus() {
      const lines = doc.split('\n');
      const meaningful = lines.findIndex(line => line.trim().length > 0);
      const targetIndex = meaningful < 0 ? 0 : meaningful;
      const offset = editableTextForLine(lines[targetIndex] ?? '').length;
      activateLine(targetIndex, offset);
    },
    toggleTodo() {
      applyFormattingAction('todo');
    },
    updateAppearance({ fontFamily: nextFamily = fontFamily, fontSize: nextSize = fontSize } = {}) {
      applyAppearance(nextFamily, nextSize);
    },
    destroy() {
      destroyed = true;
      if (selectionSyncFrame != null) cancelAnimationFrame(selectionSyncFrame);
      if (formattingSyncFrame != null) cancelAnimationFrame(formattingSyncFrame);
      if (gutterSyncFrame != null) cancelAnimationFrame(gutterSyncFrame);
      gutterObserver?.disconnect();
      window.removeEventListener('resize', resizeHandler);
      visualViewport?.removeEventListener('resize', visualViewportHandler);
      visualViewport?.removeEventListener('scroll', visualViewportHandler);
      window.removeEventListener('blur', suspendFormattingPalette);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('selectionchange', handleSelectionChange);
      surface.contentEditable = 'false';
      host.replaceChildren();
    }
  };
}
