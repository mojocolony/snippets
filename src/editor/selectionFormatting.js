import { parseTodoLine } from './markdownHelpers.js';

export function shouldShowFormattingPalette(selection, { suspended = false } = {}) {
  return Boolean(selection && !selection.collapsed && !suspended);
}

const MARKERS = Object.freeze({
  bold: ['**', '**'],
  italic: ['_', '_'],
  highlight: ['==', '=='],
  strike: ['~~', '~~'],
  code: ['`', '`']
});

function editableParts(line) {
  const todo = parseTodoLine(line);
  if (todo) return { prefix: todo.prefix, text: todo.text };
  return { prefix: '', text: String(line) };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(Number(value) || 0, max));
}

function wrapSegment(text, start, end, before, after = before) {
  const source = String(text);
  const safeStart = clamp(start, 0, source.length);
  const safeEnd = clamp(end, safeStart, source.length);
  if (safeEnd <= safeStart) return { text: source, start: safeStart, end: safeEnd };
  const selected = source.slice(safeStart, safeEnd);

  if (
    source.slice(Math.max(0, safeStart - before.length), safeStart) === before &&
    source.slice(safeEnd, safeEnd + after.length) === after
  ) {
    return {
      text: source.slice(0, safeStart - before.length) + selected + source.slice(safeEnd + after.length),
      start: safeStart - before.length,
      end: safeEnd - before.length
    };
  }

  if (
    before === after && selected.startsWith(before) && selected.endsWith(after) &&
    selected.length > before.length + after.length
  ) {
    const inner = selected.slice(before.length, -after.length);
    return {
      text: source.slice(0, safeStart) + inner + source.slice(safeEnd),
      start: safeStart,
      end: safeStart + inner.length
    };
  }

  return {
    text: source.slice(0, safeStart) + before + selected + after + source.slice(safeEnd),
    start: safeStart + before.length,
    end: safeEnd + before.length
  };
}

export function normalizeLinkHref(value = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.pathname === '/' && !url.search && !url.hash ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}

export function applyInlineFormat(doc, selection, type, options = {}) {
  const lines = String(doc ?? '').split('\n');
  if (!lines.length) return { doc: String(doc ?? ''), selection };
  let startLine = clamp(selection?.startLine, 0, lines.length - 1);
  let endLine = clamp(selection?.endLine, 0, lines.length - 1);
  let startOffset = Number(selection?.startOffset) || 0;
  let endOffset = Number(selection?.endOffset) || 0;
  if (endLine < startLine) {
    [startLine, endLine] = [endLine, startLine];
    [startOffset, endOffset] = [endOffset, startOffset];
  }

  let before;
  let after;
  if (type === 'link') {
    const href = normalizeLinkHref(options.href);
    if (!href) return { doc: lines.join('\n'), selection: { startLine, startOffset, endLine, endOffset } };
    before = '[';
    after = `](${href})`;
  } else {
    [before, after] = MARKERS[type] || [];
    if (!before) return { doc: lines.join('\n'), selection: { startLine, startOffset, endLine, endOffset } };
  }

  let nextStart = startOffset;
  let nextEnd = endOffset;
  for (let index = startLine; index <= endLine; index += 1) {
    const parts = editableParts(lines[index] ?? '');
    const from = index === startLine ? clamp(startOffset, 0, parts.text.length) : 0;
    const to = index === endLine ? clamp(endOffset, from, parts.text.length) : parts.text.length;
    if (to <= from) continue;
    const formatted = wrapSegment(parts.text, from, to, before, after);
    lines[index] = parts.prefix + formatted.text;
    if (index === startLine) nextStart = formatted.start;
    if (index === endLine) nextEnd = formatted.end;
  }

  return {
    doc: lines.join('\n'),
    selection: { startLine, startOffset: nextStart, endLine, endOffset: nextEnd }
  };
}

export function toggleTodoLines(doc, startLine, endLine = startLine) {
  const lines = String(doc ?? '').split('\n');
  const from = clamp(Math.min(startLine, endLine), 0, lines.length - 1);
  const to = clamp(Math.max(startLine, endLine), from, lines.length - 1);
  const allTodos = lines.slice(from, to + 1).every(line => Boolean(parseTodoLine(line)));

  for (let index = from; index <= to; index += 1) {
    const line = lines[index] ?? '';
    const todo = parseTodoLine(line);
    if (allTodos) {
      lines[index] = todo?.text ?? line;
      continue;
    }
    if (todo) continue;
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    lines[index] = `- [ ] ${bullet ? bullet[1] : line}`;
  }

  return { doc: lines.join('\n'), startLine: from, endLine: to, isTodo: !allTodos };
}
