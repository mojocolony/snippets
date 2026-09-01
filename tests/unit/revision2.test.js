import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderInlineMarkdown } from '../../src/editor/markdownHelpers.js';
import { resolveArrowNavigation, isSelectAllShortcut } from '../../src/editor/editorNavigation.js';
import { chooseNextVisibleSnippet } from '../../src/domain/postArchive.js';

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const authSource = fs.readFileSync(new URL('../../src/auth/authView.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const tagSheetSource = fs.readFileSync(new URL('../../src/ui/tagSheet.js', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../../scripts/build.js', import.meta.url), 'utf8');

test('plain https URLs render as safe clickable links', () => {
  const html = renderInlineMarkdown('Visit https://example.com/path?q=one&x=two.');
  assert.match(html, /<a href="https:\/\/example\.com\/path\?q=one&amp;x=two"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.ok(html.endsWith('</a>.'));
});


test('existing Markdown links remain links while bare URL auto-linking is enabled', () => {
  const html = renderInlineMarkdown('[Example](https://example.com)');
  assert.equal(html, '<a href="https://example.com" target="_blank" rel="noopener noreferrer" tabindex="-1">Example</a>');
});

test('arrow navigation crosses line boundaries and preserves logical column', () => {
  const doc = '- [ ] Alpha\nBeta\nGamma';
  assert.deepEqual(resolveArrowNavigation(doc, 0, 0, 'ArrowLeft'), null);
  assert.deepEqual(resolveArrowNavigation(doc, 0, 5, 'ArrowRight'), { lineIndex: 1, caretOffset: 0 });
  assert.deepEqual(resolveArrowNavigation(doc, 1, 0, 'ArrowLeft'), { lineIndex: 0, caretOffset: 5 });
  assert.deepEqual(resolveArrowNavigation(doc, 1, 3, 'ArrowUp'), { lineIndex: 0, caretOffset: 3 });
  assert.deepEqual(resolveArrowNavigation(doc, 1, 3, 'ArrowDown'), { lineIndex: 2, caretOffset: 3 });
});

test('Cmd/Ctrl-A is recognized as editor select-all', () => {
  assert.equal(isSelectAllShortcut({ key: 'a', metaKey: true, ctrlKey: false, altKey: false }), true);
  assert.equal(isSelectAllShortcut({ key: 'A', metaKey: false, ctrlKey: true, altKey: false }), true);
  assert.equal(isSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: false, altKey: false }), false);
});

test('todo reordering rerenders without forcing the moved line into raw Markdown edit mode', () => {
  assert.doesNotMatch(editorSource, /moveLine\([\s\S]*?render\(to\s*,\s*0\)/);
});

test('editor implements whole-snippet selection instead of line-only native select-all', () => {
  assert.match(editorSource, /selectWholeDocument/);
  assert.match(editorSource, /isSelectAllShortcut/);
});

test('todo controls share the same editor line box geometry without top-margin nudges', () => {
  assert.match(css, /\.todo-check-slot\s*\{[\s\S]*?height:\s*1\.66em/);
  const handle = css.match(/\.todo-handle\s*\{([^}]*)\}/);
  assert.ok(handle);
  assert.match(handle[1], /height:\s*1\.66em/);
  assert.match(handle[1], /display:\s*grid/);
  assert.doesNotMatch(handle[1], /margin:\s*\.12em/);
});

test('auth errors are actually rendered instead of silently resetting the button', () => {
  assert.match(authSource, /catch \(error\)[\s\S]*?errorMessage[\s\S]*?render\(\)/);
});

test('archiving from Inbox chooses an immediate next visible snippet', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(chooseNextVisibleSnippet(items, 'b'), 'c');
  assert.equal(chooseNextVisibleSnippet([{ id: 'b' }], 'b'), null);
  assert.match(appSource, /chooseNextVisibleSnippet/);
});

test('tag assignment sheet uses a dedicated compact list class', () => {
  assert.match(tagSheetSource, /tag-sheet-list/);
  assert.match(css, /\.tag-sheet-list\s+\.sheet-row\s*\{[\s\S]*?min-height:\s*38px/);
});


test('standalone production build includes Revision 2 helper modules', () => {
  assert.match(buildSource, /src\/editor\/editorNavigation\.js/);
  assert.match(buildSource, /src\/domain\/postArchive\.js/);
});
