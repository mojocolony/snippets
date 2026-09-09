import { parseBulletLine, parseTodoLine } from './markdownHelpers.js';

function lines(doc) { return String(doc).split('\n'); }

function blockForLine(line = '') {
  return parseTodoLine(line) || parseBulletLine(line);
}

function prefixForBlock(block) {
  if (!block) return '';
  if ('checked' in block) return block.prefix;
  return block.prefix;
}

export function applyEditorLineInput(doc, lineIndex, text, caretOffset) {
  const parts = lines(doc);
  const current = parts[lineIndex] ?? '';
  const currentTodo = parseTodoLine(current);
  const currentBullet = parseBulletLine(current);
  const rawText = String(text);
  const rawCaret = Math.max(0, Math.min(Number(caretOffset) || 0, rawText.length));

  if (currentTodo) {
    parts[lineIndex] = `${currentTodo.prefix}${rawText}`;
    return { doc: parts.join('\n'), becameTodo: false, caretOffset: rawCaret };
  }
  if (currentBullet) {
    parts[lineIndex] = `${currentBullet.prefix}${rawText}`;
    return { doc: parts.join('\n'), becameTodo: false, caretOffset: rawCaret };
  }

  parts[lineIndex] = rawText;
  const nextTodo = parseTodoLine(parts[lineIndex]);
  if (nextTodo) {
    return {
      doc: parts.join('\n'),
      becameTodo: true,
      caretOffset: Math.max(0, rawCaret - nextTodo.prefix.length)
    };
  }

  const nextBullet = parseBulletLine(parts[lineIndex]);
  if (nextBullet) {
    return {
      doc: parts.join('\n'),
      becameTodo: false,
      becameBullet: true,
      caretOffset: Math.max(0, rawCaret - nextBullet.prefix.length)
    };
  }

  return { doc: parts.join('\n'), becameTodo: false, caretOffset: rawCaret };
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
  const bullet = parseBulletLine(parts[lineIndex]);
  parts[lineIndex] = todo ? `${todo.prefix}${text}` : bullet ? `${bullet.prefix}${text}` : String(text);
  return parts.join('\n');
}

export function splitLineAt(doc, lineIndex, caretOffset) {
  const parts = lines(doc);
  const current = parts[lineIndex] ?? '';
  const todo = parseTodoLine(current);
  const bullet = parseBulletLine(current);
  const block = todo || bullet;
  const editable = block ? block.text : current;
  const offset = Math.max(0, Math.min(caretOffset, editable.length));
  const before = editable.slice(0, offset);
  const after = editable.slice(offset);

  if (todo) {
    if (!editable.length) {
      parts[lineIndex] = '';
      return { doc: parts.join('\n'), lineIndex, caretOffset: 0 };
    }
    parts[lineIndex] = `${todo.prefix}${before}`;
    parts.splice(lineIndex + 1, 0, `- [ ] ${after}`);
  } else if (bullet) {
    if (!editable.length) {
      parts[lineIndex] = '';
      return { doc: parts.join('\n'), lineIndex, caretOffset: 0 };
    }
    parts[lineIndex] = `${bullet.prefix}${before}`;
    parts.splice(lineIndex + 1, 0, `${bullet.prefix}${after}`);
  } else {
    parts[lineIndex] = before;
    parts.splice(lineIndex + 1, 0, after);
  }
  return { doc: parts.join('\n'), lineIndex: lineIndex + 1, caretOffset: 0 };
}

export function mergeLineWithPrevious(doc, lineIndex) {
  const parts = lines(doc);
  if (lineIndex <= 0 || lineIndex >= parts.length) return { doc: String(doc), lineIndex, caretOffset: 0 };
  const currentBlock = blockForLine(parts[lineIndex]);
  const prevBlock = blockForLine(parts[lineIndex - 1]);
  const currentText = currentBlock ? currentBlock.text : parts[lineIndex];
  const prevText = prevBlock ? prevBlock.text : parts[lineIndex - 1];
  const caretOffset = prevText.length;
  const mergedText = prevText + currentText;
  parts[lineIndex - 1] = prevBlock ? `${prefixForBlock(prevBlock)}${mergedText}` : mergedText;
  parts.splice(lineIndex, 1);
  return { doc: parts.join('\n'), lineIndex: lineIndex - 1, caretOffset };
}

export function backspaceAtLineStart(doc, lineIndex) {
  const source = String(doc);
  const parts = lines(source);
  const current = parts[lineIndex] ?? '';
  const block = blockForLine(current);
  if (block) {
    parts[lineIndex] = block.text;
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
  const startBlock = blockForLine(startRaw);
  const endBlock = blockForLine(endRaw);
  const startText = startBlock ? startBlock.text : startRaw;
  const endText = endBlock ? endBlock.text : endRaw;
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

  if (startBlock) replacement[0] = `${prefixForBlock(startBlock)}${replacement[0]}`;
  parts.splice(startLine, endLine - startLine + 1, ...replacement);
  return { doc: parts.join('\n'), lineIndex, caretOffset };
}
