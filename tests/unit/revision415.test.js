import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let viewportModule = {};
try { viewportModule = await import('../../src/editor/formattingViewport.js'); } catch { viewportModule = {}; }

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');

function actionIds(actions) {
  return actions.map(action => typeof action === 'string' ? action : action.id);
}

test('touch selection toolbar keeps Todo first, Link last, and excludes Code', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ keyboardAccessory: true })),
    ['todo', 'heading', 'bold', 'italic', 'strike', 'highlight', 'link']
  );
});

test('floating selection palette uses the same icon action set as touch layouts', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ keyboardAccessory: false })),
    ['todo', 'heading', 'bold', 'italic', 'strike', 'highlight', 'link']
  );
});

test('selected-text toolbar renders Lucide-style check and link SVG icons', () => {
  assert.match(editorSource, /data-format-action=["']todo["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?<path[^>]+d=["']M20 6 9 17l-5-5["']/);
  assert.match(editorSource, /data-format-action=["']link["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?M10 13a5 5 0 0 0 7\.54\.54/);
  assert.doesNotMatch(editorSource, /data-format-action=["']link["'][^>]*>\s*↗\s*<\/button>/);
});

