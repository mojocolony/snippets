import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let viewportModule = {};
let formattingModule = {};
try { viewportModule = await import('../../src/editor/formattingViewport.js'); } catch { viewportModule = {}; }
try { formattingModule = await import('../../src/editor/selectionFormatting.js'); } catch { formattingModule = {}; }

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');

function actionIds(actions) {
  return actions.map(action => typeof action === 'string' ? action : action.id);
}

test('touch selection toolbar uses Todo, Heading, Bold, Italic, Strike, Highlight and Link in that order', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ touchLayout: true, keyboardAccessory: false })),
    ['todo', 'heading', 'bold', 'italic', 'strike', 'highlight', 'link']
  );
});

test('desktop floating selection toolbar uses the same seven-action order and removes Code', () => {
  assert.deepEqual(
    actionIds(viewportModule.formattingActionsForLayout({ touchLayout: false, keyboardAccessory: false })),
    ['todo', 'heading', 'bold', 'italic', 'strike', 'highlight', 'link']
  );
});

test('heading action toggles selected Markdown lines as level-one headings', () => {
  assert.equal(typeof formattingModule.toggleHeadingLines, 'function');
  assert.equal(
    formattingModule.toggleHeadingLines('Alpha\nBeta', 0, 1).doc,
    '# Alpha\n# Beta'
  );
  assert.equal(
    formattingModule.toggleHeadingLines('# Alpha\n# Beta', 0, 1).doc,
    'Alpha\nBeta'
  );
});

test('selection toolbar uses the requested Lucide Heading and Highlighter geometry', () => {
  assert.match(editorSource, /data-format-action=["']heading["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?M6 12h12[\s\S]*?M6 20V4[\s\S]*?M18 20V4/);
  assert.match(editorSource, /data-format-action=["']highlight["'][\s\S]*?<svg[^>]+width=["']18["'][^>]+height=["']18["'][\s\S]*?m9 11-6 6v3h9l3-3[\s\S]*?m22 12-4\.6 4\.6a2 2 0 0 1-2\.8 0l-5\.2-5\.2a2 2 0 0 1 0-2\.8L14 4/);
});

test('selected-text actions are shared across floating and keyboard-anchored toolbar layouts', () => {
  assert.match(editorSource, /syncFormattingPaletteActions\(\)/);
  assert.doesNotMatch(editorSource, /syncFormattingPaletteActions\(touchFormattingLayout\)/);
});

test('v0.4.17 publishes matching app, package and PWA cache versions', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
  const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  assert.equal(packageJson.version, '0.4.17');
  assert.equal(packageLock.version, '0.4.17');
  assert.equal(packageLock.packages[''].version, '0.4.17');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.17['"]/);
  assert.match(swSource, /snippets-r4-17/);
});
