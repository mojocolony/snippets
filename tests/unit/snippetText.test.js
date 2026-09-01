import test from 'node:test';
import assert from 'node:assert/strict';
import { getSnippetTitle, getSnippetPreview, toPlainText } from '../../src/domain/snippetText.js';

test('first meaningful line becomes title and second becomes preview', () => {
  const content = '\n# Macbeth banquet scene\n\nBanquo enters after the toast.\nThird line';
  assert.equal(getSnippetTitle(content), 'Macbeth banquet scene');
  assert.equal(getSnippetPreview(content), 'Banquo enters after the toast.');
});

test('plain-text copy removes common Markdown but preserves URLs', () => {
  assert.equal(
    toPlainText('**Read** https://example.com and ==remember== it'),
    'Read https://example.com and remember it'
  );
});
