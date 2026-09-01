import { parseTodoLine, renderInlineMarkdown, splitLineForDisplay } from './markdownHelpers.js';
import { applyEditorLineInput, mergeLineWithPrevious, splitLineAt, toggleTodoAtLine } from './editorState.js';
import { moveLine } from './todoReorder.js';

function selectionOffset(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) return 0;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString().length;
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

  host.classList.add('markdown-editor');
  host.dataset.testid = 'editor-input';
  host.setAttribute('role', 'textbox');
  host.setAttribute('aria-multiline', 'true');

  function notify() { if (!destroyed) onChange(doc); }

  function applyAppearance(nextFamily = fontFamily, nextSize = fontSize) {
    fontFamily = nextFamily;
    fontSize = nextSize;
    if (fontFamily) host.style.setProperty('--editor-font', fontFamily);
    host.style.setProperty('--editor-size', `${fontSize}px`);
  }

  function decorateText(span, display) {
    span.innerHTML = renderInlineMarkdown(display.text ?? '');
    if (!span.textContent) span.innerHTML = '<br>';
  }

  function makeLine(line, index) {
    const display = splitLineForDisplay(line);
    const row = document.createElement('div');
    row.className = `editor-line editor-line--${display.type}`;
    row.dataset.lineIndex = String(index);

    if (display.type === 'todo') {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'todo-handle';
      handle.setAttribute('aria-label', 'Reorder todo');
      handle.textContent = '≡';
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
          render(to, 0);
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
      row.append(checkbox);
    } else if (display.type === 'bullet') {
      const bullet = document.createElement('span');
      bullet.className = 'bullet-marker';
      bullet.textContent = '•';
      row.append(bullet);
    }

    const span = document.createElement('div');
    span.className = 'editor-line-text';
    span.contentEditable = 'true';
    span.spellcheck = true;
    span.dataset.lineIndex = String(index);
    if (display.type === 'todo' && display.checked) span.classList.add('is-complete');
    if (display.type === 'heading') span.classList.add(`heading-${Math.min(display.level, 3)}`);
    decorateText(span, display);

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
      // Wait until focus settles. Re-rendering during blur would replace the line
      // the user is trying to tap next and make line-to-line editing unreliable.
      setTimeout(() => {
        if (!destroyed && !host.contains(document.activeElement)) render();
      }, 0);
    });

    span.addEventListener('keydown', event => {
      const offset = selectionOffset(span);
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

  function render(focusIndex = null, caretOffset = 0) {
    if (destroyed) return;
    const lines = doc.split('\n');
    host.replaceChildren(...lines.map(makeLine));
    if (focusIndex != null) {
      const target = host.querySelector(`.editor-line-text[data-line-index="${focusIndex}"]`);
      if (target) setCaret(target, caretOffset);
    }
  }

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
    destroy() { destroyed = true; host.replaceChildren(); }
  };
}
