import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderInlineMarkdown } from '../../src/editor/markdownHelpers.js';
import { chooseLaunchTarget } from '../../src/domain/launchPolicy.js';
import { createSnippet, listSnippets, updateSnippet } from '../../src/storage/snippetRepository.js';
import { deleteSnippetsDb } from '../../src/storage/db.js';

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const appearanceSource = fs.readFileSync(new URL('../../src/ui/appearanceSheet.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');

test('bare domains and domain paths auto-link without mistaking emails for links', () => {
  const html = renderInlineMarkdown('cnn.com www.cnn.com cnn.com/world name@example.com');
  assert.match(html, /href="https:\/\/cnn\.com"[^>]*>cnn\.com<\/a>/);
  assert.match(html, /href="https:\/\/www\.cnn\.com"[^>]*>www\.cnn\.com<\/a>/);
  assert.match(html, /href="https:\/\/cnn\.com\/world"[^>]*>cnn\.com\/world<\/a>/);
  assert.doesNotMatch(html, /href="https:\/\/example\.com"[^>]*>example\.com<\/a>/);
});

test('expired return window sends the app to Inbox rather than a blank capture', () => {
  const snippets = [{ id: 'a', updatedAt: 1, pinned: false, deletedAt: null }];
  assert.deepEqual(chooseLaunchTarget({ snippets, now: 100_000, returnWindow: '60s' }), { type: 'inbox' });
});


test('launch target actually routes an expired session to the Inbox view', () => {
  assert.match(appSource, /target\.type === 'inbox'[\s\S]*?showLibrary\('inbox'\)/);
});

test('starred snippets sort before unstarred snippets and then by modified time', async () => {
  await deleteSnippetsDb();
  const unstarred = await createSnippet('new unstarred', 300);
  const oldStarred = await createSnippet('old starred', 100);
  const newStarred = await createSnippet('new starred', 200);
  await updateSnippet(oldStarred.id, { starred: true }, 100);
  await updateSnippet(newStarred.id, { starred: true }, 200);
  const items = await listSnippets({ scope: 'inbox' });
  assert.deepEqual(items.map(item => item.id), [newStarred.id, oldStarred.id, unstarred.id]);
});

test('editing only leaves raw Markdown on the active line', () => {
  assert.match(editorSource, /let activeLineIndex\s*=\s*null/);
  assert.match(editorSource, /function renderLine\(index\)/);
  assert.match(editorSource, /index === activeLineIndex/);
  assert.match(editorSource, /classList\.add\('is-editing'\)/);
});

test('todo drag handle uses a Lucide-style SVG instead of a text glyph pseudo-element', () => {
  assert.match(editorSource, /todo-handle-icon/);
  assert.match(editorSource, /viewBox/);
  assert.doesNotMatch(css, /\.todo-handle::before\s*\{\s*content:\s*"≡"/);
});

test('Snippets sign-in does not create new Supabase users and checks app access before opening', () => {
  assert.match(mainSource, /shouldCreateUser:\s*false/);
  assert.match(mainSource, /snippets_has_access/);
  assert.match(mainSource, /not authorized for Snippets/i);
});

test('appearance labels return timing as time to return to Inbox', () => {
  assert.match(appearanceSource, /Time to return to Inbox/);
  assert.doesNotMatch(appearanceSource, /Return to last snippet/);
});

test('app exposes its semantic version in Settings and uses a revisioned PWA cache', () => {
  assert.match(packageJson.version, /^0\.\d+\.\d+$/);
  assert.match(appearanceSource, /APP_VERSION/);
  assert.match(swSource, /snippets-r\d+/);
});
