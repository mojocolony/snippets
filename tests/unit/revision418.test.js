import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let formatModule = {};
let stateModule = {};
try { formatModule = await import('../../src/editor/selectionFormatting.js'); } catch { formatModule = {}; }
try { stateModule = await import('../../src/editor/editorState.js'); } catch { stateModule = {}; }

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');

test('a formatting result becomes the saved selection so a second format stacks on the same text', () => {
  assert.equal(typeof formatModule.selectionAfterFormatting, 'function');
  const original = { startLine: 0, startOffset: 6, endLine: 0, endOffset: 10, collapsed: false, rect: { left: 1 } };
  const bold = formatModule.applyInlineFormat('Alpha beta', original, 'bold');
  const saved = formatModule.selectionAfterFormatting(original, bold.selection);
  assert.deepEqual(saved, {
    startLine: 0,
    startOffset: 8,
    endLine: 0,
    endOffset: 12,
    collapsed: false,
    rect: { left: 1 }
  });
  const italic = formatModule.applyInlineFormat(bold.doc, saved, 'italic');
  assert.equal(italic.doc, 'Alpha **_beta_**');
});

test('selection replacement deletes a same-line backward selection and collapses at its left edge', () => {
  assert.equal(typeof stateModule.replaceEditorSelection, 'function');
  const result = stateModule.replaceEditorSelection('Alpha beta gamma', {
    startLine: 0,
    startOffset: 10,
    endLine: 0,
    endOffset: 6
  }, '');
  assert.deepEqual(result, {
    doc: 'Alpha  gamma',
    lineIndex: 0,
    caretOffset: 6
  });
});

test('selection replacement still joins cross-line selections and preserves a starting todo prefix', () => {
  assert.equal(typeof stateModule.replaceEditorSelection, 'function');
  const result = stateModule.replaceEditorSelection('- [ ] Alpha beta\nGamma delta', {
    startLine: 0,
    startOffset: 6,
    endLine: 1,
    endOffset: 5
  }, 'X');
  assert.deepEqual(result, {
    doc: '- [ ] Alpha X delta',
    lineIndex: 0,
    caretOffset: 7
  });
});

test('markdown editor commits every noncollapsed delete through source state before rerendering', () => {
  assert.match(editorSource, /event\.inputType\?\.startsWith\(['"]delete['"]\)[\s\S]*?replaceSelectionFromSnapshot/);
  assert.match(editorSource, /function replaceSelectionFromSnapshot[\s\S]*?removeAllRanges\(\)[\s\S]*?render\(/);
});

test('markdown editor immediately saves the remapped selection returned by inline formatting', () => {
  assert.match(editorSource, /selectionAfterFormatting\(/);
  assert.match(editorSource, /formattingSelection\s*=\s*\{\s*\.\.\.nextSelection\s*\}/);
  assert.match(editorSource, /rememberEditorSelection\(nextSelection\)/);
});


test('v0.4.18 or later remains on the 0.4 patch line with matching package versions and r4 cache family', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
  const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  const patch = Number(packageJson.version.split('.').at(-1));
  assert.ok(patch >= 18);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, new RegExp(`APP_VERSION\\s*=\\s*['"]${packageJson.version.replaceAll('.', '\\.')}['"]`));
  assert.match(swSource, /snippets-r4-\d+/);
});
