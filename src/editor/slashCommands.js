const BASE_COMMANDS = Object.freeze([
  { id: 'todo', label: 'Todo', aliases: ['todo', 'task', 'check'], group: 'formatting' },
  { id: 'heading-1', label: 'Heading 1', aliases: ['h1', 'heading1', 'heading 1'], group: 'formatting' },
  { id: 'heading-2', label: 'Heading 2', aliases: ['h2', 'heading2', 'heading 2'], group: 'formatting' },
  { id: 'heading-3', label: 'Heading 3', aliases: ['h3', 'heading3', 'heading 3'], group: 'formatting' },
  { id: 'heading-4', label: 'Heading 4', aliases: ['h4', 'heading4', 'heading 4'], group: 'formatting' },
  { id: 'bold', label: 'Bold', aliases: ['bold', 'b'], group: 'formatting' },
  { id: 'italic', label: 'Italic', aliases: ['italic', 'i'], group: 'formatting' },
  { id: 'strike', label: 'Strikethrough', aliases: ['strike', 'strikethrough', 's'], group: 'formatting' },
  { id: 'highlight', label: 'Highlight', aliases: ['highlight', 'highlighter', 'mark'], group: 'formatting' },
  { id: 'link', label: 'Link', aliases: ['link', 'url'], group: 'formatting' },
  { id: 'star', label: 'Star', aliases: ['star', 'unstar', 'favorite'], group: 'snippet' },
  { id: 'pin', label: 'Pin', aliases: ['pin', 'unpin'], group: 'snippet' },
  { id: 'archive', label: 'Archive', aliases: ['archive', 'unarchive'], group: 'snippet' },
  { id: 'tags', label: 'Tags', aliases: ['tag', 'tags'], group: 'snippet' },
  { id: 'select', label: 'Select snippets', aliases: ['select', 'multi', 'multiple'], group: 'library' },
  { id: 'new', label: 'New snippet', aliases: ['new', 'new snippet', 'create'], group: 'library' }
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseSlashQuery(lineText, caretOffset) {
  const text = String(lineText ?? '');
  const end = Math.max(0, Math.min(Number(caretOffset) || 0, text.length));
  const beforeCaret = text.slice(0, end);
  const start = beforeCaret.lastIndexOf('/');
  if (start < 0) return null;
  if (start > 0 && !/\s/.test(beforeCaret[start - 1])) return null;
  const query = beforeCaret.slice(start + 1);
  if (query.includes('\n') || query.includes('\r')) return null;
  return { start, end, query };
}

export function slashCommandsForContext({ starred = false, pinned = false, archived = false } = {}) {
  return BASE_COMMANDS.map(command => {
    let label = command.label;
    if (command.id === 'star') label = starred ? 'Unstar' : 'Star';
    else if (command.id === 'pin') label = pinned ? 'Unpin' : 'Pin';
    else if (command.id === 'archive') label = archived ? 'Unarchive' : 'Archive';
    return { ...command, label, aliases: [...command.aliases] };
  });
}

function commandScore(command, rawQuery) {
  const query = normalize(rawQuery);
  if (!query) return 10;
  const values = [command.label, ...(command.aliases || [])].map(normalize);
  if (values.some(value => value === query)) return 0;
  if (values.some(value => value.startsWith(query))) return 1;
  if (values.some(value => value.includes(query))) return 2;
  return Infinity;
}

export function filterSlashCommands(commands, query = '') {
  return (commands || [])
    .map((command, index) => ({ command, index, score: commandScore(command, query) }))
    .filter(entry => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(entry => entry.command);
}
