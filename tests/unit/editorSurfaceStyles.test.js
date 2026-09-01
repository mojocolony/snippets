import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const responsive = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');

test('editor uses a sheet surface instead of a focused textbox outline', () => {
  assert.match(css, /\.editor-sheet\s*\{[\s\S]*?background:\s*var\(--paper\)/);
  assert.match(css, /\.editor-sheet\s*\{[\s\S]*?min-height:/);
  assert.doesNotMatch(css, /\[contenteditable="true"\]:focus-visible/);
});

test('mobile editor sheet becomes edge-to-edge rather than a floating card', () => {
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.editor-sheet\s*\{[\s\S]*?border-radius:\s*0/);
});

test('completed todo remains struck through while its text has focus', () => {
  const match = css.match(/\.editor-line-text\.is-editing\s*\{([^}]*)\}/);
  assert.ok(match, 'editing rule exists');
  assert.doesNotMatch(match[1], /text-decoration\s*:\s*none/);
});

test('todo checkbox is vertically centered against the first text line box', () => {
  const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
  assert.match(editorSource, /className\s*=\s*['"]todo-check-slot['"]/);
  assert.match(css, /\.todo-check-slot\s*\{[\s\S]*?height:\s*1\.66em[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/);
  const checkboxRule = css.match(/\.todo-check\s*\{([^}]*)\}/);
  assert.ok(checkboxRule, 'todo checkbox rule exists');
  assert.match(checkboxRule[1], /margin:\s*0/);
});
