import test from 'node:test';
import assert from 'node:assert/strict';
import { captureToSnippet, parseCaptureUrl, isCaptureMessage } from '../../src/capture/captureParams.js';

test('link capture produces title plus original URL', () => {
  assert.deepEqual(captureToSnippet({ mode: 'link', title: 'Example', url: 'https://example.com/a' }), {
    markdown: 'Example\n\nhttps://example.com/a',
    sourceUrl: 'https://example.com/a'
  });
});

test('selection capture preserves selected text with source information', () => {
  assert.deepEqual(captureToSnippet({ mode: 'selection', title: 'Article', url: 'https://example.com/a', text: 'A useful passage.' }), {
    markdown: 'A useful passage.\n\nSource: Article\nhttps://example.com/a',
    sourceUrl: 'https://example.com/a'
  });
});

test('page capture accepts large body text without putting it in the app URL', () => {
  const text = 'Paragraph\n'.repeat(10000).trim();
  const result = captureToSnippet({ mode: 'page', title: 'Long page', url: 'https://example.com/long', text });
  assert.equal(result.markdown.startsWith('Long page\n\nParagraph'), true);
  assert.equal(result.markdown.endsWith('\n\nSource: https://example.com/long'), true);
});

test('capture URL parser supports lightweight title and URL fallback', () => {
  const result = parseCaptureUrl('https://mojocolony.github.io/snippets/?capture=link&title=Hello&url=https%3A%2F%2Fexample.com');
  assert.equal(result.markdown, 'Hello\n\nhttps://example.com');
});

test('postMessage capture requires matching session nonce', () => {
  assert.equal(isCaptureMessage({ type: 'snippets-capture', nonce: 'abc', mode: 'page' }, 'abc'), true);
  assert.equal(isCaptureMessage({ type: 'snippets-capture', nonce: 'wrong', mode: 'page' }, 'abc'), false);
});
