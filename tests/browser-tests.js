import {
  createSnippet, getSnippet, listSnippets, updateSnippet, setPinnedSnippet,
  moveToTrash, restoreSnippet, purgeExpiredTrash, deleteSnippetPermanently
} from '../src/storage/snippetRepository.js';
import { toggleSnippetTag, listTagsWithCounts } from '../src/storage/tagRepository.js';
import { getPreferences, setPreference } from '../src/storage/preferencesRepository.js';
import { deleteSnippetsDb } from '../src/storage/db.js';
import { mountMarkdownEditor } from '../src/editor/markdownEditor.js';

const logEl = document.querySelector('#test-log');
const summaryEl = document.querySelector('#test-summary');
const results = [];

function log(message) { logEl.textContent += `${message}\n`; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function equal(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
async function test(name, fn) {
  try {
    await deleteSnippetsDb();
    localStorage.clear();
    await fn();
    results.push({ name, ok: true });
    log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    log(`FAIL ${name}: ${error.stack || error.message}`);
  }
}

await test('repository creates and lists modified-first', async () => {
  const a = await createSnippet('older', 1_000);
  const b = await createSnippet('newer', 2_000);
  const items = await listSnippets({ scope: 'inbox' });
  equal(items.map(item => item.id), [b.id, a.id], 'modified-first order');
});

await test('only one snippet can be pinned', async () => {
  const a = await createSnippet('a', 1_000);
  const b = await createSnippet('b', 2_000);
  await setPinnedSnippet(a.id);
  await setPinnedSnippet(b.id);
  assert((await getSnippet(a.id)).pinned === false, 'old pin cleared');
  assert((await getSnippet(b.id)).pinned === true, 'new pin set');
});

await test('archive/star filters are properties, not locations', async () => {
  const item = await createSnippet('both', 1_000);
  await updateSnippet(item.id, { starred: true, archived: true }, 2_000);
  equal((await listSnippets({ scope: 'inbox' })).length, 0, 'archived excluded from inbox');
  equal((await listSnippets({ scope: 'starred' })).length, 1, 'archived star still in starred');
  equal((await listSnippets({ scope: 'archive' })).length, 1, 'archive contains item');
});

await test('trash restore and purge preserve or remove correctly', async () => {
  const item = await createSnippet('trash me', 1_000);
  await updateSnippet(item.id, { starred: true, tags: ['keep'] }, 1_500);
  await moveToTrash(item.id, 2_000);
  assert((await getSnippet(item.id)).deletedAt === 2_000, 'deletedAt set');
  await restoreSnippet(item.id);
  const restored = await getSnippet(item.id);
  assert(restored.deletedAt === null, 'restored');
  equal(restored.tags, ['keep'], 'tags preserved');
  assert(restored.starred === true, 'star preserved');
  await moveToTrash(item.id, 0);
  const purged = await purgeExpiredTrash(31 * 24 * 60 * 60 * 1000);
  assert(purged === 1, 'one purged');
  assert((await getSnippet(item.id)) === undefined, 'gone after purge');
});

await test('tags toggle globally and return counts', async () => {
  const a = await createSnippet('a', 1_000);
  const b = await createSnippet('b', 2_000);
  await toggleSnippetTag(a.id, '#Macbeth');
  await toggleSnippetTag(b.id, 'macbeth');
  equal(await listTagsWithCounts(), [{ name: 'macbeth', count: 2 }], 'count two');
  await toggleSnippetTag(a.id, 'macbeth');
  equal(await listTagsWithCounts(), [{ name: 'macbeth', count: 1 }], 'toggle removes');
});

await test('preferences default and persist', async () => {
  const prefs = await getPreferences();
  assert(prefs.returnWindow === '60s', 'one minute default');
  assert(prefs.editorFont === 'ia-writer-duo', 'iA default');
  await setPreference('themeMode', 'dark');
  assert((await getPreferences()).themeMode === 'dark', 'theme persisted');
  assert(localStorage.getItem('snippets:themeMode') === 'dark', 'theme mirrored for prepaint');
});



function setCaretAtEnd(element) {
  element.focus();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

await test('first Markdown todo converts immediately and Enter continues the checklist', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const editor = mountMarkdownEditor(host, { value: '' });
  let line = host.querySelector('.editor-line-text');
  line.focus();
  line.textContent = '- [ ] Go to store';
  setCaretAtEnd(line);
  line.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'e' }));

  assert(host.querySelectorAll('.todo-check').length === 1, 'first Markdown todo becomes a checkbox immediately');
  line = host.querySelector('.editor-line-text');
  equal(line.textContent, 'Go to store', 'todo marker hidden after conversion');

  setCaretAtEnd(line);
  line.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  assert(host.querySelectorAll('.todo-check').length === 2, 'Enter creates another todo in the same snippet');
  equal(editor.getValue(), '- [ ] Go to store\n- [ ] ', 'underlying Markdown keeps standard task syntax');
  editor.destroy();
  host.remove();
});

await test('checking a todo strikes its text through immediately', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const editor = mountMarkdownEditor(host, { value: '- [ ] Run to store' });
  const checkbox = host.querySelector('.todo-check');
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const line = host.querySelector('.editor-line-text');
  assert(line.classList.contains('is-complete'), 'checked todo has completed class immediately');
  assert(getComputedStyle(line).textDecorationLine.includes('line-through'), 'checked todo is visibly struck through immediately');
  equal(editor.getValue(), '- [x] Run to store', 'underlying Markdown checkbox toggles to checked');
  editor.destroy();
  host.remove();
});



await test('editor uses one editing host so selection can span hard-newline lines', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const editor = mountMarkdownEditor(host, { value: 'ARCHIVE\nTHE TALK SHOW\nParagraph text' });
  assert(host.isContentEditable, 'markdown editor is the editing host');
  const lines = [...host.querySelectorAll('.editor-line-text')];
  assert(lines.length === 3, 'three rendered hard-newline lines');
  assert(lines.every(line => !line.hasAttribute('contenteditable')), 'line nodes inherit one editing host');
  const range = document.createRange();
  range.setStart(lines[0].firstChild, 0);
  range.setEnd(lines[1].firstChild, lines[1].firstChild.textContent.length);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  assert(selection.toString().includes('ARCHIVE'), 'selection includes first line');
  assert(selection.toString().includes('THE TALK SHOW'), 'selection includes second line');
  editor.destroy();
  host.remove();
});

summaryEl.textContent = results.every(result => result.ok) ? `PASS ${results.length}` : `FAIL ${results.filter(r => !r.ok).length}/${results.length}`;
document.documentElement.dataset.tests = results.every(result => result.ok) ? 'pass' : 'fail';
