import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const editorView = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const libraryView = fs.readFileSync(new URL('../../src/ui/libraryView.js', import.meta.url), 'utf8');
const trashView = fs.readFileSync(new URL('../../src/ui/trashView.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const iconSource = fs.readFileSync(new URL('../../src/ui/batchIcons.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('normal and multi-select bottom toolbars use the same Lucide SVG geometry', () => {
  const normalEditorMarkup = editorView.match(/<nav class="control-strip normal-control-strip"[\s\S]*?<\/nav>/)?.[0] || '';
  const normalLibraryMarkup = libraryView.match(/<nav class="control-strip" data-testid="control-strip"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(normalEditorMarkup);
  assert.ok(normalLibraryMarkup);
  assert.match(normalEditorMarkup, /batchIconMarkup\('menu'\)/);
  assert.match(normalEditorMarkup, /batchIconMarkup\('tag'\)/);
  assert.match(normalEditorMarkup, /batchIconMarkup\('todo'\)/);
  assert.match(normalEditorMarkup, /batchIconMarkup\('share'\)/);
  assert.match(normalEditorMarkup, /batchIconMarkup\('ellipsis'\)/);
  assert.doesNotMatch(normalEditorMarkup, />☰<|>#<|>☆<|>↑<|>•••</);
  assert.match(normalLibraryMarkup, /batchIconMarkup\('plus'\)/);
  assert.match(normalLibraryMarkup, /batchIconMarkup\('tag'\)/);
  assert.match(normalLibraryMarkup, /batchIconMarkup\('search'\)/);
  assert.match(normalLibraryMarkup, /batchIconMarkup\('ellipsis'\)/);
  assert.doesNotMatch(normalLibraryMarkup, />＋<|>#<|>⌕<|>•••</);
  assert.match(iconSource, /menu:/);
  assert.match(iconSource, /plus:/);
  assert.match(iconSource, /search:/);
  assert.match(iconSource, /todo:/);
  assert.match(iconSource, /share:/);
  assert.match(iconSource, /ellipsis:/);
  assert.match(css, /\.toolbar-action-icon\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/s);
  assert.doesNotMatch(css, /\.batch-action-icon\s*\{[^}]*width:/s);
});

test('Trash exposes Delete All only when there are trashed snippets', () => {
  assert.match(trashView, /onDeleteAll/);
  assert.match(trashView, /data-action="delete-all"/);
  assert.match(trashView, /items\.length[\s\S]*Delete All/);
});

test('Delete All permanently removes every Trash item after explicit confirmation', () => {
  assert.match(appSource, /async function deleteAllTrash/);
  assert.match(appSource, /Delete all \${items\.length} \${noun} permanently\? This cannot be undone\./);
  assert.match(appSource, /listSnippets\(\{ scope: 'trash' \}\)/);
  assert.match(appSource, /for \(const item of items\) await deleteSnippetPermanently\(item\.id\)/);
  assert.match(appSource, /onDeleteAll:\s*\(\) => deleteAllTrash\(\)/);
});

test('v0.4.2 establishes the 0.4.2+ patch line and r4 cache family', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 2);
  assert.match(versionSource, /APP_VERSION\s*=\s*'0\.4\.\d+'/);
  assert.match(swSource, /snippets-r4-/);
});
