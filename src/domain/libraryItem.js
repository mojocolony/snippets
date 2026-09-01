import { getSnippetTitle, getSnippetPreview } from './snippetText.js';

export function formatModified(timestamp, now = new Date(), locale = undefined, timeZone = undefined) {
  const date = new Date(timestamp);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const options = sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function makeLibraryItem(snippet, options = {}) {
  return {
    id: snippet.id,
    title: getSnippetTitle(snippet.content),
    preview: getSnippetPreview(snippet.content),
    tags: [...(snippet.tags || [])],
    modified: formatModified(snippet.updatedAt, options.now, options.locale, options.timeZone),
    updatedAt: snippet.updatedAt,
    starred: Boolean(snippet.starred),
    archived: Boolean(snippet.archived),
    pinned: Boolean(snippet.pinned)
  };
}
