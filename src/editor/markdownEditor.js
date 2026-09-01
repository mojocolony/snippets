import { parseTodoLine, renderInlineMarkdown, splitLineForDisplay } from './markdownHelpers.js';
import { applyEditorLineInput, mergeLineWithPrevious, splitLineAt, toggleTodoAtLine } from './editorState.js';
import { moveLine } from './todoReorder.js';
import { isSelectAllShortcut, resolveArrowNavigation } from './editorNavigation.js';

function selectionOffset(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) return 0;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString().length;
}

function selectionOffsets(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const active = selection.getRangeAt(0);
  if (!element.contains(active.startContainer) || !element.contains(active.endContainer)) return { start: 0, end: 0 };
  const startRange = document.createRange();
  startRange.selectNodeContents(element);
  startRange.setEnd(active.startContainer, active.startOffset);
  const endRange = document.createRange();
  endRange.selectNodeContents(element);
  endRange.setEnd(active.endContainer, active.endOffset);
  const a = startRange.toString().length;
  const b = endRange.toString().length;
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

function setCaret(element, offset) {
  element.focus();
  requestAnimationFrame(() => {
    const node = element.firstChild || element;
    const length = node.nodeType === Node.TEXT_NODE ? node.textContent.length : element.textContent.length;
    const safeOffset = Math.max(0, Math.min(offset, length));
    const range = document.createRange();
    const selection = window.getSelection();
    if (node.nodeType === Node.TEXT_NODE) range.setStart(node, safeOffset);
    else range.selectNodeContents(element), range.collapse(false);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function editableTextForLine(line) {
  const todo = parseTodoLine(line);
  return todo ? todo.text : line;
}

function canReorderTodo(doc, fromIndex, toIndex) {
  const lines = doc.split('\n');
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return lines.slice(start, end + 1).every(line => Boolean(parseTodoLine(line)));
}

export function mountMarkdownEditor(host, { value = '', onChange = () => {}, fontFamily, fontSize = 18 } = {}) {
  let doc = String(value);
  let destroyed = false;
  let dragState = null;
  let wholeDocumentSelected = false;

  host.classList.add('markdown-editor');
  host.dataset.testid = 'editor-input';
  host.setAttribute('role', 'textbox');
  host.setAttribute('aria-multiline', 'true');

  function notify() { if (!destroyed) onChange(doc); }

  function selectWholeDocument() {
    const spans = [...host.querySelectorAll('.editor-line-text')];
    if (!spans.length) return;
    const range = document.createRange();
    range.setStart(spans[0], 0);
    range.setEnd(spans.at(-1), spans.at(-1).childNodes.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    wholeDocumentSelected = true;
  }

  function setCaretForLine(lineIndex, caretOffset) {
    const target = host.querySelector(`.editor-line-text[data-line-index="${lineIndex}"]`);
    if (target) setCaret(target, caretOffset);
  }

  function caretIsAtVerticalEdge(span, key) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return true;
    const range = selection.getRangeAt(0).cloneRange();
    const caret = range.getBoundingClientRect?.();
    const box = span.getBoundingClientRect?.();
    const lineHeight = Number.parseFloat(getComputedStyle(span).lineHeight) || 0;
    if (!caret || !box || !lineHeight || (!caret.width && !caret.height)) return true;
    if (key === 'ArrowUp') return caret.top <= box.top + lineHeight * .7;
    if (key === 'ArrowDown') return caret.bottom >= box.bottom - lineHeight * .7;
    return true;
  }

  function applyAppearance(nextFamily = fontFamily, nextSize = fontSize) {
    fontFamily = nextFamily;
    fontSize = nextSize;
    if (fontFamily) host.style.setProperty('--editor-font', fontFamily);
    host.style.setProperty('--editor-size', `${fontSize}px`);
  }

  function decorateText(span, display, { autoLink = true } = {}) {
    span.innerHTML = renderInlineMarkdown(display.text ?? '', { autoLink });
    if (!span.textContent) span.innerHTML = '<br>';
  }

  function makeLine(line, index) {
    const codeLine = isFencedCodeLine(doc, index);
    const display = codeLine ? { type: 'code', text: line } : splitLineForDisplay(line);
    const row = document.createElement('div');
    row.className = `editor-line editor-line--${display.type}`;
    row.dataset.lineIndex = String(index);

    if (display.type === 'todo') {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'todo-handle';
      handle.setAttribute('aria-label', 'Reorder todo');
      handle.innerHTML = '<svg class="todo-handle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
      handle.addEventListener('pointerdown', event => {
        event.preventDefault();
        dragState = { from: index, to: index, handle };
        handle.setPointerCapture?.(event.pointerId);
        row.classList.add('is-dragging');
      });
      handle.addEventListener('pointermove', event => {
        if (!dragState) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.editor-line');
        const targetIndex = Number(target?.dataset?.lineIndex);
        if (Number.isInteger(targetIndex) && canReorderTodo(doc, dragState.from, targetIndex)) {
          host.querySelectorAll('.editor-line.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
          target.classList.add('is-drop-target');
          dragState.to = targetIndex;
        }
      });
      handle.addEventListener('pointerup', event => {
        if (!dragState) return;
        handle.releasePointerCapture?.(event.pointerId);
        const { from, to } = dragState;
        dragState = null;
        if (from !== to && canReorderTodo(doc, from, to)) {
          doc = moveLine(doc, from, to);
          render();
          notify();
        } else render();
      });
      row.append(handle);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-check';
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
      row.append(checkSlot);
    } else if (display.type === 'bullet') {
      const bullet = document.createElement('span');
      bullet.className = 'bullet-marker';
      bullet.setAttribute('aria-hidden', 'true');
      row.append(bullet);
    }

    const span = document.createElement('div');
    span.className = 'editor-line-text';
    span.contentEditable = 'true';
    span.spellcheck = true;
    span.dataset.lineIndex = String(index);
    if (display.type === 'todo' && display.checked) span.classList.add('is-complete');
    if (display.type === 'heading') span.classList.add(`heading-${Math.min(display.level, 3)}`);
    decorateText(span, display, { autoLink: !codeLine });

    span.addEventListener('pointerdown', event => {
      const link = event.target.closest?.('a');
      if (link && !span.classList.contains('is-editing')) event.preventDefault();
    });
    span.addEventListener('click', event => {
      const link = event.target.closest?.('a');
      if (!link || span.classList.contains('is-editing')) return;
      event.preventDefault();
      event.stopPropagation();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    });

    span.addEventListener('focus', () => {
      const current = doc.split('\n')[index] ?? '';
      span.textContent = editableTextForLine(current);
      span.classList.add('is-editing');
    });

    span.addEventListener('input', () => {
      const offset = selectionOffset(span);
      const result = applyEditorLineInput(doc, index, span.textContent, offset);
      doc = result.doc;
      if (result.becameTodo) {
        render(index, result.caretOffset);
      }
      notify();
    });

    span.addEventListener('blur', () => {
      span.classList.remove('is-editing');
      if (destroyed) return;
      // Only the active line shows raw Markdown. Once this line loses focus,
      // re-render just this row so moving to another line is not disrupted.
      setTimeout(() => {
        if (!destroyed && span.isConnected && document.activeElement !== span) renderLine(index);
      }, 0);
    });

    span.addEventListener('keydown', event => {
      const offset = selectionOffset(span);
      if (isSelectAllShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        selectWholeDocument();
        return;
      }
      const formatKey = event.key.toLowerCase();
      const formatModifier = (event.metaKey || event.ctrlKey) && !event.altKey;
      if (formatModifier && !event.shiftKey && (formatKey === 'b' || formatKey === 'i')) {
        event.preventDefault();
        event.stopPropagation();
        const { start, end } = selectionOffsets(span);
        if (end <= start) return;
        const marker = formatKey === 'b' ? '**' : '_';
        const formatted = toggleInlineMarker(span.textContent, start, end, marker);
        const result = applyEditorLineInput(doc, index, formatted.text, formatted.end);
        doc = result.doc;
        render(index, formatted.end);
        notify();
        requestAnimationFrame(() => {
          const target = host.querySelector(`.editor-line-text[data-line-index="${index}"]`);
          if (!target) return;
          const node = target.firstChild || target;
          if (node.nodeType !== Node.TEXT_NODE) return;
          const range = document.createRange();
          range.setStart(node, Math.min(formatted.start, node.textContent.length));
          range.setEnd(node, Math.min(formatted.end, node.textContent.length));
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        });
        return;
      }
      if (!event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && /^Arrow(Left|Right|Up|Down)$/.test(event.key)) {
        if ((event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || caretIsAtVerticalEdge(span, event.key)) {
          const target = resolveArrowNavigation(doc, index, offset, event.key);
          if (target) {
            event.preventDefault();
            wholeDocumentSelected = false;
            setCaretForLine(target.lineIndex, target.caretOffset);
            return;
          }
        }
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const result = splitLineAt(doc, index, offset);
        doc = result.doc;
        render(result.lineIndex, result.caretOffset);
        notify();
        return;
      }
      if (event.key === 'Backspace' && offset === 0 && index > 0) {
        event.preventDefault();
        const result = mergeLineWithPrevious(doc, index);
        doc = result.doc;
        render(result.lineIndex, result.caretOffset);
        notify();
      }
    });

    span.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text.includes('\n')) return;
      event.preventDefault();
      const offset = selectionOffset(span);
      const currentLines = doc.split('\n');
      const current = currentLines[index] ?? '';
      const todo = parseTodoLine(current);
      const editable = todo ? todo.text : current;
      const before = editable.slice(0, offset);
      const after = editable.slice(offset);
      const pasted = text.replace(/\r/g, '').split('\n');
      const replacement = [before + pasted[0], ...pasted.slice(1, -1), pasted.at(-1) + after];
      if (todo) replacement[0] = `${todo.checked ? '- [x] ' : '- [ ] '}${replacement[0]}`;
      currentLines.splice(index, 1, ...replacement);
      doc = currentLines.join('\n');
      const targetIndex = index + replacement.length - 1;
      const targetOffset = pasted.at(-1).length;
      render(targetIndex, targetOffset);
      notify();
    });

    row.append(span);
    return row;
  }


  function renderLine(index) {
    if (destroyed) return;
    const existing = host.querySelector(`.editor-line[data-line-index="${index}"]`);
    if (!existing) return;
    const line = doc.split('\n')[index] ?? '';
    existing.replaceWith(makeLine(line, index));
  }

  function render(focusIndex = null, caretOffset = 0) {
    if (destroyed) return;
    const lines = doc.split('\n');
    host.replaceChildren(...lines.map(makeLine));
    if (focusIndex != null) {
      const target = host.querySelector(`.editor-line-text[data-line-index="${focusIndex}"]`);
      if (target) setCaret(target, caretOffset);
    }
  }

  host.addEventListener('copy', event => {
    if (!wholeDocumentSelected) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', doc);
  });

  host.addEventListener('cut', event => {
    if (!wholeDocumentSelected) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', doc);
    doc = '';
    wholeDocumentSelected = false;
    render(0, 0);
    notify();
  });

  host.addEventListener('paste', event => {
    if (!wholeDocumentSelected) return;
    event.preventDefault();
    event.stopPropagation();
    doc = event.clipboardData?.getData('text/plain')?.replace(/\r/g, '') ?? '';
    wholeDocumentSelected = false;
    const lines = doc.split('\n');
    render(lines.length - 1, editableTextForLine(lines.at(-1) || '').length);
    notify();
  }, true);

  host.addEventListener('beforeinput', event => {
    if (!wholeDocumentSelected) return;
    if (event.inputType === 'insertFromPaste') return;
    if (event.inputType?.startsWith('delete')) {
      event.preventDefault();
      doc = '';
      wholeDocumentSelected = false;
      render(0, 0);
      notify();
      return;
    }
    if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
      event.preventDefault();
      doc = event.data || '';
      wholeDocumentSelected = false;
      render(0, doc.length);
      notify();
    }
  }, true);

  const handleSelectionChange = () => {
    if (!wholeDocumentSelected) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) wholeDocumentSelected = false;
  };
  document.addEventListener('selectionchange', handleSelectionChange);

  applyAppearance();
  render();

  return {
    getValue: () => doc,
    setValue(next) { doc = String(next ?? ''); render(); },
    focus() {
      const index = Math.max(0, doc.split('\n').findIndex(line => line.trim().length > 0));
      const targetIndex = index < 0 ? 0 : index;
      const offset = editableTextForLine(doc.split('\n')[targetIndex] ?? '').length;
      const target = host.querySelector(`.editor-line-text[data-line-index="${targetIndex}"]`);
      if (target) setCaret(target, offset);
    },
    updateAppearance({ fontFamily: nextFamily = fontFamily, fontSize: nextSize = fontSize } = {}) {
      applyAppearance(nextFamily, nextSize);
    },
    destroy() { destroyed = true; document.removeEventListener('selectionchange', handleSelectionChange); host.replaceChildren(); }
  };
}
