import { parseTodoLine } from './markdownHelpers.js';

function editableLength(line = '') {
  const todo = parseTodoLine(line);
  return (todo ? todo.text : String(line)).length;
}

export function resolveArrowNavigation(doc, lineIndex, caretOffset, key) {
  const lines = String(doc).split('\n');
  const index = Math.max(0, Math.min(Number(lineIndex) || 0, lines.length - 1));
  const offset = Math.max(0, Number(caretOffset) || 0);
  const currentLength = editableLength(lines[index]);

  if (key === 'ArrowLeft') {
    if (offset !== 0 || index === 0) return null;
    return { lineIndex: index - 1, caretOffset: editableLength(lines[index - 1]) };
  }
  if (key === 'ArrowRight') {
    if (offset < currentLength || index >= lines.length - 1) return null;
    return { lineIndex: index + 1, caretOffset: 0 };
  }
  if (key === 'ArrowUp') {
    if (index === 0) return null;
    return { lineIndex: index - 1, caretOffset: Math.min(offset, editableLength(lines[index - 1])) };
  }
  if (key === 'ArrowDown') {
    if (index >= lines.length - 1) return null;
    return { lineIndex: index + 1, caretOffset: Math.min(offset, editableLength(lines[index + 1])) };
  }
  return null;
}

export function isSelectAllShortcut(event = {}) {
  return String(event.key || '').toLowerCase() === 'a'
    && Boolean(event.metaKey || event.ctrlKey)
    && !event.altKey;
}
