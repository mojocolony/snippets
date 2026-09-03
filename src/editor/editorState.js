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

export function backspaceAtLineStart(doc, lineIndex) {
  const source = String(doc);
  const parts = lines(source);
  const current = parts[lineIndex] ?? '';
  const todo = parseTodoLine(current);
  if (todo) {
    parts[lineIndex] = todo.text;
    return { doc: parts.join('\n'), lineIndex, caretOffset: 0, handled: true };
  }
  if (lineIndex > 0 && lineIndex < parts.length) {
    return { ...mergeLineWithPrevious(source, lineIndex), handled: true };
  }
  return { doc: source, lineIndex, caretOffset: 0, handled: false };
}

export function replaceEditorSelection(doc, selection, insertText = '') {
  const parts = lines(doc);
  if (!parts.length) return { doc: String(doc), lineIndex: 0, caretOffset: 0 };

  let startLine = Math.max(0, Math.min(Number(selection?.startLine) || 0, parts.length - 1));
  let endLine = Math.max(0, Math.min(Number(selection?.endLine) || 0, parts.length - 1));
  let startOffset = Math.max(0, Number(selection?.startOffset) || 0);
  let endOffset = Math.max(0, Number(selection?.endOffset) || 0);
  if (endLine < startLine || (endLine === startLine && endOffset < startOffset)) {
    [startLine, endLine] = [endLine, startLine];
    [startOffset, endOffset] = [endOffset, startOffset];
  }

  const startRaw = parts[startLine] ?? '';
  const endRaw = parts[endLine] ?? '';
  const startTodo = parseTodoLine(startRaw);
  const startText = startTodo ? startTodo.text : startRaw;
  const endTodo = parseTodoLine(endRaw);
  const endText = endTodo ? endTodo.text : endRaw;
  startOffset = Math.min(startOffset, startText.length);
  endOffset = Math.min(endOffset, endText.length);

  const before = startText.slice(0, startOffset);
  const after = endText.slice(endOffset);
  const inserted = String(insertText).replace(/\r/g, '').split('\n');
  let replacement;
  let lineIndex;
  let caretOffset;

  if (inserted.length === 1) {
    replacement = [before + inserted[0] + after];
    lineIndex = startLine;
    caretOffset = before.length + inserted[0].length;
  } else {
    replacement = [
      before + inserted[0],
      ...inserted.slice(1, -1),
      inserted.at(-1) + after
    ];
    lineIndex = startLine + replacement.length - 1;
    caretOffset = inserted.at(-1).length;
  }

  if (startTodo) replacement[0] = `${startTodo.checked ? '- [x] ' : '- [ ] '}${replacement[0]}`;
  parts.splice(startLine, endLine - startLine + 1, ...replacement);
  return { doc: parts.join('\n'), lineIndex, caretOffset };
}
