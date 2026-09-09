export function parseTodoLine(line = '') {
  const match = String(line).match(/^(\s*[-*+]\s+\[([ xX])\]\s+)(.*)$/);
  if (!match) return null;
  const checked = match[2].toLowerCase() === 'x';
  return { prefix: match[1], checked, text: match[3] };
}

export function parseBulletLine(line = '') {
  const match = String(line).match(/^(\s*([-*+])\s+)(.*)$/);
  if (!match || /^\[[ xX]\]\s+/.test(match[3])) return null;
  return { prefix: match[1], marker: match[2], text: match[3] };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderInlineMarkdown(source = '', { autoLink = true } = {}) {
  const protectedLinks = [];
  const protectedCode = [];
  const original = String(source);
  const looksLikeCodeSource = /^\s*(?:javascript:|data:text\/html)/i.test(original);

  let html = escapeHtml(original)
    .replace(/`([^`]+)`/g, (_match, code) => {
      const token = `%%SNIPPETSCODE${protectedCode.length}%%`;
      protectedCode.push(`<code>${code}</code>`);
      return token;
    })
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_match, label, href) => {
      const token = `%%SNIPPETSLINK${protectedLinks.length}%%`;
      protectedLinks.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" tabindex="-1">${label}</a>`);
      return token;
    });

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');

  if (autoLink && !looksLikeCodeSource) {
    html = html.replace(/(^|[^@\w])((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?)/g, (_match, prefix, match) => {
      let url = match;
      let trailing = '';
      while (/[.,!?;:)\]]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer" tabindex="-1">${url}</a>${trailing}`;
    });
  }

  protectedLinks.forEach((link, index) => {
    html = html.replace(`%%SNIPPETSLINK${index}%%`, link);
  });
  protectedCode.forEach((code, index) => {
    html = html.replace(`%%SNIPPETSCODE${index}%%`, code);
  });
  return html;
}

function inlineTokenAt(source, index) {
  const rest = source.slice(index);
  const patterns = [
    { regex: /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/, open: 1, group: 1, recurse: false },
    { regex: /^`([^`]+)`/, open: 1, group: 1, recurse: false },
    { regex: /^\*\*([^*]+)\*\*/, open: 2, group: 1, recurse: true },
    { regex: /^__([^_]+)__/, open: 2, group: 1, recurse: true },
    { regex: /^~~([^~]+)~~/, open: 2, group: 1, recurse: true },
    { regex: /^==([^=]+)==/, open: 2, group: 1, recurse: true },
    { regex: /^\*([^*]+)\*/, open: 1, group: 1, recurse: true },
    { regex: /^_([^_]+)_/, open: 1, group: 1, recurse: true }
  ];
  for (const pattern of patterns) {
    const match = rest.match(pattern.regex);
    if (!match) continue;
    const inner = match[pattern.group];
    return {
      length: match[0].length,
      inner,
      innerStart: index + pattern.open,
      recurse: pattern.recurse
    };
  }
  return null;
}

function renderedBoundaryMap(source, baseOffset = 0) {
  const raw = String(source);
  const boundaries = [baseOffset];
  let index = 0;
  while (index < raw.length) {
    const token = inlineTokenAt(raw, index);
    if (!token) {
      boundaries.push(baseOffset + index + 1);
      index += 1;
      continue;
    }

    if (token.recurse) {
      const innerMap = renderedBoundaryMap(token.inner, baseOffset + token.innerStart);
      boundaries[boundaries.length - 1] = innerMap[0];
      boundaries.push(...innerMap.slice(1));
    } else {
      boundaries[boundaries.length - 1] = baseOffset + token.innerStart;
      for (let i = 1; i <= token.inner.length; i += 1) {
        boundaries.push(baseOffset + token.innerStart + i);
      }
    }
    index += token.length;
  }
  return boundaries;
}

export function renderedOffsetToSourceOffset(source = '', renderedOffset = 0) {
  const map = renderedBoundaryMap(String(source));
  const requested = Math.max(0, Math.min(Number(renderedOffset) || 0, map.length - 1));
  return map[requested] ?? String(source).length;
}

export function editableOffsetForRenderedLine(line = '', renderedOffset = 0) {
  const raw = String(line);
  const todo = parseTodoLine(raw);
  if (todo) return renderedOffsetToSourceOffset(todo.text, renderedOffset);
  const bullet = parseBulletLine(raw);
  if (bullet) return renderedOffsetToSourceOffset(bullet.text, renderedOffset);
  const display = splitLineForDisplay(raw);
  const mapped = renderedOffsetToSourceOffset(display.text ?? raw, renderedOffset);
  if (display.type === 'heading' || display.type === 'quote') {
    return Math.max(0, raw.length - String(display.text ?? '').length) + mapped;
  }
  return mapped;
}

export function splitLineForDisplay(line = '') {
  const todo = parseTodoLine(line);
  if (todo) return { type: 'todo', ...todo };
  const heading = String(line).match(/^(#{1,6})\s+(.*)$/);
  if (heading) return { type: 'heading', level: heading[1].length, text: heading[2] };
  const quote = String(line).match(/^>\s?(.*)$/);
  if (quote) return { type: 'quote', text: quote[1] };
  const bullet = parseBulletLine(line);
  if (bullet) return { type: 'bullet', ...bullet };
  return { type: 'text', text: String(line) };
}
