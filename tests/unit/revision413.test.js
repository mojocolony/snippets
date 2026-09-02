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

function metaStripSource() {
  return editorView.match(/<div class="editor-meta-strip"[\s\S]*?<\/div>\s*<section class="editor-sheet"/)?.[0] || '';
}

test('upper metadata toolbar places a Lucide Check Todo immediately after Star', () => {
  const meta = metaStripSource();
  assert.ok(meta);
  const star = meta.indexOf('data-action="meta-star"');
  const todo = meta.indexOf('data-action="meta-todo"');
  const tags = meta.indexOf('data-action="meta-tags"');
  assert.ok(star >= 0 && todo > star && tags > todo);
  assert.match(meta, /data-action="meta-todo"[\s\S]*?viewBox="0 0 24 24"[\s\S]*?<path d="M20 6 9 17l-5-5"><\/path>/);
  assert.match(editorView, /metaTodo\.addEventListener\(['"]pointerdown['"],\s*event\s*=>\s*event\.preventDefault\(\)\)/);
  assert.match(editorView, /metaTodo\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*editor\.toggleTodo\(\)\)/);
});

test('Aa returns to the direct appearance/settings action with no Todo popup', () => {
  assert.doesNotMatch(editorView, /openEditorFormatMenu/);
  assert.doesNotMatch(editorView, /onTodo:\s*\(\)\s*=>\s*editor\.toggleTodo\(\)/);
  assert.match(editorView, /appearance\.addEventListener\(['"]click['"],\s*onAppearance\)/);
  assert.doesNotMatch(css, /\.editor-format-menu\s*\{/);
});

test('Todo command remembers the last in-editor caret or selection instead of requiring a live browser selection', () => {
  assert.match(editorSource, /let\s+rememberedEditorSelection\s*=\s*null/);
  assert.match(editorSource, /rememberEditorSelection\(/);
  assert.match(editorSource, /const snapshot = [^;]*currentFormattingSelection\(\)[^;]*rememberedEditorSelection/);
  assert.match(editorSource, /toggleTodo\(\)\s*\{\s*applyFormattingAction\(['"]todo['"]\)/);
});

test('v0.4.13 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.13');
  assert.equal(packageLock.version, '0.4.13');
  assert.equal(packageLock.packages[''].version, '0.4.13');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.13['"]/);
  assert.match(swSource, /snippets-r4-13/);
});
