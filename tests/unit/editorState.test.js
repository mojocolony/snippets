import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEditorLineInput, toggleTodoAtLine, splitLineAt, mergeLineWithPrevious, replaceLineText } from '../../src/editor/editorState.js';
import * as editorState from '../../src/editor/editorState.js';

test('toggleTodoAtLine changes only the checkbox marker', () => {
  assert.equal(toggleTodoAtLine('- [ ] A\ntext', 0), '- [x] A\ntext');
  assert.equal(toggleTodoAtLine('- [x] A\ntext', 0), '- [ ] A\ntext');
});

test('splitLineAt creates another unchecked todo when splitting a todo', () => {
  assert.deepEqual(splitLineAt('- [ ] AlphaBeta', 0, 5), {
    doc: '- [ ] Alpha\n- [ ] Beta',
    lineIndex: 1,
    caretOffset: 0
  });
});

test('splitLineAt splits normal Markdown text without changing syntax', () => {
  assert.deepEqual(splitLineAt('AlphaBeta', 0, 5), {
    doc: 'Alpha\nBeta',
    lineIndex: 1,
    caretOffset: 0
  });
});

test('mergeLineWithPrevious joins current editable text to prior line', () => {
  assert.deepEqual(mergeLineWithPrevious('Alpha\nBeta', 1), {
    doc: 'AlphaBeta', lineIndex: 0, caretOffset: 5
  });
});

test('replaceLineText preserves todo prefix', () => {
  assert.equal(replaceLineText('- [x] Old', 0, 'New'), '- [x] New');
});

test('editor input recognizes a newly typed Markdown todo and maps the caret into todo text', () => {
  const result = applyEditorLineInput('', 0, '- [ ] Go to store', 17);
  assert.deepEqual(result, {
    doc: '- [ ] Go to store',
    becameTodo: true,
    caretOffset: 11
  });
});

test('editor input preserves an existing todo marker while editing visible todo text', () => {
  const result = applyEditorLineInput('- [x] Old', 0, 'New', 3);
  assert.deepEqual(result, {
    doc: '- [x] New',
    becameTodo: false,
    caretOffset: 3
  });
});


test('Backspace at the start of a todo removes todo formatting before line merging', () => {
  assert.equal(typeof editorState.backspaceAtLineStart, 'function');
  assert.deepEqual(editorState.backspaceAtLineStart('- [ ] Call Whirlpool', 0), {
    handled: true,
    doc: 'Call Whirlpool',
    lineIndex: 0,
    caretOffset: 0
  });
  assert.deepEqual(editorState.backspaceAtLineStart('- [x] Done', 0), {
    handled: true,
    doc: 'Done',
    lineIndex: 0,
    caretOffset: 0
  });
  assert.deepEqual(editorState.backspaceAtLineStart('- [ ] ', 0), {
    handled: true,
    doc: '',
    lineIndex: 0,
    caretOffset: 0
  });
});

test('Backspace at the start of ordinary text still merges with the previous line', () => {
  assert.equal(typeof editorState.backspaceAtLineStart, 'function');
  assert.deepEqual(editorState.backspaceAtLineStart('Alpha\nBeta', 1), {
    handled: true,
    doc: 'AlphaBeta',
    lineIndex: 0,
    caretOffset: 5
  });
  assert.deepEqual(editorState.backspaceAtLineStart('Alpha', 0), {
    handled: false,
    doc: 'Alpha',
    lineIndex: 0,
    caretOffset: 0
  });
});
