import { parseTodoLine } from './markdownHelpers.js';

function lines(doc) { return String(doc).split('\n'); }

export function applyEditorLineInput(doc, lineIndex, text, caretOffset) {
  const parts = lines(doc);
  const current = parts[lineIndex] ?? '';
  const currentTodo = parseTodoLine(current);
  const rawText = String(text);
  const rawCaret = Math.max(0, Math.min(Number(caretOffset) || 0, rawText.length));

  if (currentTodo) {
    parts[lineIndex] = `${currentTodo.checked ? '- [x] ' : '- [ ] '}${rawText}`;
    return { doc: parts.join('\n'), becameTodo: false, caretOffset: rawCaret };
  }

  parts[lineIndex] = rawText;
  const nextTodo = parseTodoLine(parts[lineIndex]);
  if (!nextTodo) {
    return { doc: parts.join('\n'), becameTodo: false, caretOffset: rawCaret };
  }

  return {
    doc: parts.join('\n'),
    becameTodo: true,
    caretOffset: Math.max(0, rawCaret - nextTodo.prefix.length)
  };
}

export function toggleTodoAtLine(doc, lineIndex) {
  const parts = lines(doc);
  const todo = parseTodoLine(parts[lineIndex]);
  if (!todo) return String(doc);
  const marker = todo.checked ? '- [ ] ' : '- [x] ';
  parts[lineIndex] = marker + todo.text;
  return parts.join('\n');
}

export function replaceLineText(doc, lineIndex, text) {
  const parts = lines(doc);
  const todo = parseTodoLine(parts[lineIndex]);
  parts[lineIndex] = todo ? `${todo.checked ? '- [x] ' : '- [ ] '}${text}` : String(text);
  return parts.join('\n');
}

export function splitLineAt(doc, lineIndex, caretOffset) {
  const parts = lines(doc);
  const current = parts[lineIndex] ?? '';
  const todo = parseTodoLine(current);
  const editable = todo ? todo.text : current;
  const offset = Math.max(0, Math.min(caretOffset, editable.length));
  const before = editable.slice(0, offset);
  const after = editable.slice(offset);
  if (todo) {
    parts[lineIndex] = `${todo.checked ? '- [x] ' : '- [ ] '}${before}`;
    parts.splice(lineIndex + 1, 0, `- [ ] ${after}`);
  } else {
    parts[lineIndex] = before;
    parts.splice(lineIndex + 1, 0, after);
  }
  return { doc: parts.join('\n'), lineIndex: lineIndex + 1, caretOffset: 0 };
}

export function mergeLineWithPrevious(doc, lineIndex) {
  const parts = lines(doc);
  if (lineIndex <= 0 || lineIndex >= parts.length) return { doc: String(doc), lineIndex, caretOffset: 0 };
  const currentTodo = parseTodoLine(parts[lineIndex]);
  const prevTodo = parseTodoLine(parts[lineIndex - 1]);
  const currentText = currentTodo ? currentTodo.text : parts[lineIndex];
  const prevText = prevTodo ? prevTodo.text : parts[lineIndex - 1];
  const caretOffset = prevText.length;
  const mergedText = prevText + currentText;
  parts[lineIndex - 1] = prevTodo ? `${prevTodo.checked ? '- [x] ' : '- [ ] '}${mergedText}` : mergedText;
  parts.splice(lineIndex, 1);
  return { doc: parts.join('\n'), lineIndex: lineIndex - 1, caretOffset };
}
