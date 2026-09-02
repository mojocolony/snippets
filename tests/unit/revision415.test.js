import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let viewportModule = {};
try { viewportModule = await import('../../src/editor/formattingViewport.js'); } catch { viewportModule = {}; }

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function actionIds(actions) {
  return actions.map(action => typeof action === 'string' ? action : action.id);
}

test('iOS keyboard accessory toolbar uses Todo, Highlight, Bold, Italic, Strike and Link in that order', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ keyboardAccessory: true })),
    ['todo', 'highlight', 'bold', 'italic', 'strike', 'link']
  );
});

test('desktop selection palette retains Code and does not add Todo', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ keyboardAccessory: false })),
    ['highlight', 'bold', 'italic', 'strike', 'code', 'link']
  );
});

test('selected-text toolbar renders Lucide-style check and link SVG icons', () => {
  assert.match(editorSource, /data-format-action=["']todo["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?<path[^>]+d=["']M20 6 9 17l-5-5["']/);
  assert.match(editorSource, /data-format-action=["']link["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?M10 13a5 5 0 0 0 7\.54\.54/);
  assert.doesNotMatch(editorSource, /data-format-action=["']link["'][^>]*>\s*↗\s*<\/button>/);
});

test('v0.4.15 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.15');
  assert.equal(packageLock.version, '0.4.15');
  assert.equal(packageLock.packages[''].version, '0.4.15');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.15['"]/);
  assert.match(swSource, /snippets-r4-15/);
});
