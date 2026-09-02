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

test('mobile and compact-tablet editor sheet becomes edge-to-edge rather than a floating card', () => {
  assert.match(responsive, /@media \(max-width: 899px\)[\s\S]*?\.editor-wrap\s*\{[\s\S]*?width:\s*100%/);
  assert.match(responsive, /@media \(max-width: 899px\)[\s\S]*?\.editor-sheet\s*\{[\s\S]*?border-radius:\s*0/);
});

test('completed todo remains struck through while its text has focus', () => {
  const match = css.match(/\.editor-line-text\.is-editing\s*\{([^}]*)\}/);
  assert.ok(match, 'editing rule exists');
  assert.doesNotMatch(match[1], /text-decoration\s*:\s*none/);
});

test('todo checkbox lives in a separately aligned gutter item rather than the editable text surface', () => {
  const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
  assert.match(editorSource, /editor-control-gutter/);
  assert.match(editorSource, /editor-gutter-item/);
  const checkboxRule = css.match(/\.todo-check\s*\{([^}]*)\}/);
  assert.ok(checkboxRule, 'todo checkbox rule exists');
  assert.match(checkboxRule[1], /margin:\s*0/);
});
