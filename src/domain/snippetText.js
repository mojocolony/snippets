function meaningfulLines(content = '') {
  return String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function cleanLine(line = '') {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/==(.+?)==/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

export function getSnippetTitle(content) {
  return cleanLine(meaningfulLines(content)[0] || '');
}

export function getSnippetPreview(content) {
  return cleanLine(meaningfulLines(content)[1] || '');
}

export function toPlainText(content) {
  return String(content).split(/\r?\n/).map(cleanLine).join('\n').trim();
}
