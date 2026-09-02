import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let moreModule = {};
try { moreModule = await import('../../src/ui/moreMenu.js'); } catch { moreModule = {}; }
let formatModule = {};
try { formatModule = await import('../../src/editor/selectionFormatting.js'); } catch { formatModule = {}; }

const editorView = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const iconSource = fs.readFileSync(new URL('../../src/ui/batchIcons.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('standard More actions are ordered Select, Trash, Web Capture, Keyboard shortcuts, Sign out with no Settings duplicate', () => {
  assert.equal(typeof moreModule.standardMoreActions, 'function');
  assert.deepEqual(moreModule.standardMoreActions({ includeSignOut: true }), [
    { id: 'select', label: 'Select' },
    { id: 'trash', label: 'Trash' },
    { id: 'web-capture', label: 'Web Capture' },
    { id: 'shortcuts', label: 'Keyboard shortcuts' },
    { id: 'signout', label: 'Sign out' }
  ]);
  assert.doesNotMatch(appSource, /\{\s*id:\s*['"]settings['"],\s*label:\s*['"]Settings['"]\s*\}/);
});

test('v0.4.11 removes the redundant bottom Star while preserving Todo capability', () => {
  const toolbar = editorView.match(/<nav class="control-strip normal-control-strip"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(toolbar);
  assert.match(toolbar, /data-action="library"/);
  assert.match(toolbar, /data-action="tags"/);
  assert.match(toolbar, /data-action="appearance"/);
  assert.match(toolbar, /data-action="share"/);
  assert.match(toolbar, /data-action="more"/);
  assert.doesNotMatch(toolbar, /data-action="star"/);
  assert.match(iconSource, /todo:/);
  assert.match(editorView, /editor\.toggleTodo\(\)/);
  assert.match(editorSource, /toggleTodo\(\)\s*\{/);
});

test('formatting palette appears only for a real text selection, never for a collapsed caret or suspended window', () => {
  assert.equal(typeof formatModule.shouldShowFormattingPalette, 'function');
  assert.equal(formatModule.shouldShowFormattingPalette(null), false);
  assert.equal(formatModule.shouldShowFormattingPalette({ collapsed: true }), false);
  assert.equal(formatModule.shouldShowFormattingPalette({ collapsed: false }), true);
  assert.equal(formatModule.shouldShowFormattingPalette({ collapsed: false }, { suspended: true }), false);
  assert.doesNotMatch(css, /formatting-palette--todo-only/);
});

test('selection palette and toolbar focus are cleared when the app loses visibility or window focus', () => {
  assert.match(editorSource, /window\.addEventListener\(['"]blur['"]/);
  assert.match(editorSource, /document\.addEventListener\(['"]visibilitychange['"]/);
  assert.match(editorSource, /hideFormattingPalette\(\)/);
  assert.match(editorView, /clearTransientToolbarFocus/);
  assert.match(editorView, /window\.addEventListener\(['"]blur['"]/);
  assert.match(editorView, /document\.addEventListener\(['"]visibilitychange['"]/);
});

test('v0.4.11 or later stays on the 0.4 patch line and r4 cache family', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 11);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.\d+['"]/);
  assert.match(swSource, /snippets-r4-/);
});
