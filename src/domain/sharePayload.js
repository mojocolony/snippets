import { getSnippetTitle, toPlainText } from './snippetText.js';

export function buildSharePayload(content = '', sourceUrl = null) {
  const lines = String(content ?? '').replace(/\r/g, '').split('\n');
  const titleIndex = lines.findIndex(line => line.trim().length > 0);
  if (titleIndex < 0) return {};

  const title = getSnippetTitle(lines[titleIndex]);
  const body = toPlainText(lines.slice(titleIndex + 1).join('\n'));
  const url = String(sourceUrl ?? '').trim();
  const payload = {};
  if (title) payload.title = title;
  if (body) payload.text = body;
  if (url) payload.url = url;
  return payload;
}
