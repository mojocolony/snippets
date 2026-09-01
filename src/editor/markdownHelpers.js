export function parseTodoLine(line = '') {
  const match = String(line).match(/^(\s*[-*+]\s+\[([ xX])\]\s+)(.*)$/);
  if (!match) return null;
  const checked = match[2].toLowerCase() === 'x';
  return { prefix: match[1], checked, text: match[3] };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderInlineMarkdown(source = '') {
  let html = escapeHtml(source);
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" tabindex="-1">$1</a>');
  return html;
}

export function splitLineForDisplay(line = '') {
  const todo = parseTodoLine(line);
  if (todo) return { type: 'todo', ...todo };
  const heading = String(line).match(/^(#{1,6})\s+(.*)$/);
  if (heading) return { type: 'heading', level: heading[1].length, text: heading[2] };
  const quote = String(line).match(/^>\s?(.*)$/);
  if (quote) return { type: 'quote', text: quote[1] };
  const bullet = String(line).match(/^\s*[-*+]\s+(.*)$/);
  if (bullet) return { type: 'bullet', text: bullet[1] };
  return { type: 'text', text: String(line) };
}
