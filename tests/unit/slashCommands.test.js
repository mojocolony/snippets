import test from 'node:test';
import assert from 'node:assert/strict';

let mod = {};
try { mod = await import('../../src/editor/slashCommands.js'); } catch { mod = {}; }

const { parseSlashQuery, slashCommandsForContext, filterSlashCommands } = mod;

test('slash trigger opens at line start or after whitespace but not inside a word, URL, or path', () => {
  assert.equal(typeof parseSlashQuery, 'function');
  assert.deepEqual(parseSlashQuery('/to', 3), { start: 0, end: 3, query: 'to' });
  assert.deepEqual(parseSlashQuery('hello /h2', 9), { start: 6, end: 9, query: 'h2' });
  assert.deepEqual(parseSlashQuery('hello /new snippet', 18), { start: 6, end: 18, query: 'new snippet' });
  assert.equal(parseSlashQuery('https://example.com', 8), null);
  assert.equal(parseSlashQuery('abc/def', 7), null);
});

test('heading aliases expose h1 through h4 and prefix matches rank first', () => {
  assert.equal(typeof slashCommandsForContext, 'function');
  assert.equal(typeof filterSlashCommands, 'function');
  const commands = slashCommandsForContext({ starred: false, pinned: false, archived: false });
  assert.equal(filterSlashCommands(commands, 'h1')[0].id, 'heading-1');
  assert.equal(filterSlashCommands(commands, 'h2')[0].id, 'heading-2');
  assert.equal(filterSlashCommands(commands, 'h3')[0].id, 'heading-3');
  assert.equal(filterSlashCommands(commands, 'h4')[0].id, 'heading-4');
  assert.equal(filterSlashCommands(commands, 'sta')[0].id, 'star');
  assert.equal(filterSlashCommands(commands, 'sel')[0].id, 'select');
});

test('document labels reflect current state without changing command ids', () => {
  const commands = slashCommandsForContext({ starred: true, pinned: true, archived: true });
  assert.equal(commands.find(command => command.id === 'star').label, 'Unstar');
  assert.equal(commands.find(command => command.id === 'pin').label, 'Unpin');
  assert.equal(commands.find(command => command.id === 'archive').label, 'Unarchive');
});

test('all approved initial commands are present', () => {
  const ids = slashCommandsForContext({}).map(command => command.id);
  assert.deepEqual(ids, [
    'todo', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'bold', 'italic', 'strike', 'highlight', 'link',
    'star', 'pin', 'archive', 'tags', 'select', 'new'
  ]);
});
