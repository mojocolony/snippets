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
