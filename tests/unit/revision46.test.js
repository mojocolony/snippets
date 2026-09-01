import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBookmarkletCode } from '../../src/capture/bookmarklets.js';

const sheetSource = fs.readFileSync(new URL('../../src/ui/webCaptureSheet.js', import.meta.url), 'utf8');
const bookmarkletPage = fs.readFileSync(new URL('../../bookmarklets.html', import.meta.url), 'utf8');

function compileBookmarklet(code) {
  assert.ok(code.startsWith('javascript:'), 'bookmarklet must use the javascript: scheme');
  return new Function(code.slice('javascript:'.length));
}

test('all generated bookmarklets are syntactically valid JavaScript', () => {
  for (const mode of ['link', 'selection', 'page']) {
    assert.doesNotThrow(() => compileBookmarklet(createBookmarkletCode(mode, 'https://mojocolony.github.io/snippets/')), mode);
  }
});

test('draggable bookmarklet text contains only the bookmark name', () => {
  assert.match(sheetSource, /link\.append\(label\)/);
  assert.doesNotMatch(sheetSource, /link\.append\(label,\s*description\)/);
});

test('standalone bookmarklet page contains usable links without module JavaScript', () => {
  assert.doesNotMatch(bookmarkletPage, /<script\s+type=["']module["']/i);
  for (const label of ['Save Link', 'Save Selection', 'Save Page Text']) {
    assert.match(bookmarkletPage, new RegExp(`<a[^>]+class=["'][^"']*bookmarklet[^"']*["'][^>]*>\\s*${label}\\s*</a>`, 'i'));
  }
  assert.ok((bookmarkletPage.match(/href=["']javascript:/gi) || []).length >= 3, 'page should contain three literal javascript bookmarklet hrefs');
});


test('standalone bookmarklet hrefs stay in sync with the production generator', () => {
  const decode = value => value
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
  const hrefs = [...bookmarkletPage.matchAll(/<a[^>]+class="[^"]*bookmarklet[^"]*"[^>]+href="([^"]+)"/gi)]
    .map(match => decode(match[1]));
  assert.deepEqual(hrefs, ['link', 'selection', 'page'].map(mode => createBookmarkletCode(mode, 'https://mojocolony.github.io/snippets/')));
});
