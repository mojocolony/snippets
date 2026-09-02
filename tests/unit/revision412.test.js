import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let formatMenuModule = {};
try { formatMenuModule = await import('../../src/ui/editorFormatMenu.js'); } catch { formatMenuModule = {}; }

const editorView = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function editorToolbarSource() {
  return editorView.match(/<nav class="control-strip normal-control-strip"[\s\S]*?<\/nav>/)?.[0] || '';
}

test('editor bottom bar is quiet: Library, Tags, Aa, Share, More with no Star or Todo', () => {
  const toolbar = editorToolbarSource();
  assert.ok(toolbar);
  const actions = [...toolbar.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(actions, ['library', 'tags', 'appearance', 'share', 'more']);
  assert.doesNotMatch(toolbar, /data-action="star"/);
  assert.doesNotMatch(toolbar, /data-action="todo"/);
});

test('Aa opens an explicit compact editor formatting menu with Todo and Settings', () => {
  assert.equal(typeof formatMenuModule.editorFormatActions, 'function');
  assert.deepEqual(formatMenuModule.editorFormatActions(), [
    { id: 'todo', label: 'Todo' },
    { id: 'settings', label: 'Settings' }
  ]);
  assert.equal(typeof formatMenuModule.openEditorFormatMenu, 'function');
  assert.match(editorView, /openEditorFormatMenu/);
  assert.match(editorView, /onTodo:\s*\(\)\s*=>\s*editor\.toggleTodo\(\)/);
  assert.match(editorView, /onSettings:\s*onAppearance/);
  assert.match(css, /\.editor-format-menu/);
});

test('Aa menu preserves the editor caret so Todo can act on the current line', () => {
  assert.match(editorView, /\[data-action="appearance"\][\s\S]*pointerdown/);
  assert.match(editorSource, /toggleTodo\(\)\s*\{\s*applyFormattingAction\(['"]todo['"]\)/);
});

test('selection formatting remains selection-only and never auto-shows for a collapsed caret', () => {
  assert.match(editorSource, /shouldShowFormattingPalette\(snapshot/);
  assert.doesNotMatch(css, /formatting-palette--todo-only/);
});

test('v0.4.12 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.12');
  assert.equal(packageLock.version, '0.4.12');
  assert.equal(packageLock.packages[''].version, '0.4.12');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.12['"]/);
  assert.match(swSource, /snippets-r4-12/);
});
