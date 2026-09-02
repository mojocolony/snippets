import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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

test('v0.4.12+ keeps the bottom bar quiet: Library, Tags, Aa, Share, More with no Star or Todo', () => {
  const toolbar = editorToolbarSource();
  assert.ok(toolbar);
  const actions = [...toolbar.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(actions, ['library', 'tags', 'appearance', 'share', 'more']);
  assert.doesNotMatch(toolbar, /data-action="star"/);
  assert.doesNotMatch(toolbar, /data-action="todo"/);
});

test('Todo remains available outside the bottom bar and selection formatting remains selection-only', () => {
  assert.match(editorSource, /toggleTodo\(\)\s*\{\s*applyFormattingAction\(['"]todo['"]\)/);
  assert.match(editorSource, /shouldShowFormattingPalette\(snapshot/);
  assert.doesNotMatch(css, /formatting-palette--todo-only/);
});

test('v0.4.12 or later stays on the 0.4 patch line and r4 cache family', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 12);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.\d+['"]/);
  assert.match(swSource, /snippets-r4-/);
});
