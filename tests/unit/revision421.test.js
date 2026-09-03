import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dropIndicatorEdge } from '../../src/editor/todoReorder.js';

const editorSource = await readFile(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../../src/styles/app.css', import.meta.url), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`\n  function ${nextName}(`, start);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test('caret-line rerenders preserve mounted todo gutter controls', () => {
  const renderLine = functionBody(editorSource, 'renderLine', 'setCaretForLine');
  assert.doesNotMatch(renderLine, /renderGutter\(\)/, 'moving the caret must not rebuild checkbox DOM');
  assert.match(renderLine, /syncGutterEditingState\(index\)/, 'the existing gutter row should update editing state in place');
  assert.match(renderLine, /queueGutterSync\(\)/, 'gutter geometry should still be remeasured after line rendering');

  const syncState = functionBody(editorSource, 'syncGutterEditingState', 'renderLine');
  assert.match(syncState, /classList\.toggle\(['"]is-editing['"]/);
  assert.match(syncState, /activeLineIndex/);
});

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');


test('todo drag indicator uses the leading edge when moving up and trailing edge when moving down', () => {
  assert.equal(dropIndicatorEdge(3, 0), 'before');
  assert.equal(dropIndicatorEdge(3, 2), 'before');
  assert.equal(dropIndicatorEdge(0, 1), 'after');
  assert.equal(dropIndicatorEdge(0, 3), 'after');
  assert.equal(dropIndicatorEdge(2, 2), null);

  assert.match(editorSource, /dropIndicatorEdge\(dragState\.from, targetIndex\)/);
  assert.match(editorSource, /is-drop-target--\$\{edge\}/);
  assert.match(cssSource, /\.editor-line-text\.is-drop-target--before::after\s*\{[^}]*top:\s*-1px/s);
  assert.match(cssSource, /\.editor-line-text\.is-drop-target--after::after\s*\{[^}]*bottom:\s*-1px/s);
});

test('v0.4.21 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.21');
  assert.equal(packageLock.version, '0.4.21');
  assert.equal(packageLock.packages[''].version, '0.4.21');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.21['"]/);
  assert.match(swSource, /snippets-r4-21/);
});
