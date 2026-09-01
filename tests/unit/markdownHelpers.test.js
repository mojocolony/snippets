import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTodoLine, renderInlineMarkdown } from '../../src/editor/markdownHelpers.js';
import { moveLine } from '../../src/editor/todoReorder.js';

test('todo parser recognizes unchecked and checked Markdown tasks', () => {
  assert.deepEqual(parseTodoLine('- [ ] Call dentist'), { prefix: '- [ ] ', checked: false, text: 'Call dentist' });
  assert.deepEqual(parseTodoLine('- [x] Email Mark'), { prefix: '- [x] ', checked: true, text: 'Email Mark' });
});

test('inline renderer highlights ==text== and styles common Markdown', () => {
  const html = renderInlineMarkdown('**bold** and ==bright==');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<mark>bright<\/mark>/);
});

test('line reordering changes only source line order', () => {
  assert.equal(moveLine('- [ ] A\n- [x] B\n- [ ] C', 0, 2), '- [x] B\n- [ ] C\n- [ ] A');
});
