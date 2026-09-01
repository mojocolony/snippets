import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBookmarkletCode } from '../../src/capture/bookmarklets.js';
import { renderInlineMarkdown } from '../../src/editor/markdownHelpers.js';

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('Save Page Text prefers article-like content and falls back to body text', () => {
  const code = createBookmarkletCode('page', 'https://example.com/snippets/');
  assert.match(code, /article/);
  assert.match(code, /main/);
  assert.match(code, /innerText/);
  assert.match(code, /document\.body/);
  assert.match(code, /nav|footer|aside/);
});

test('Cmd/Ctrl-B and Cmd/Ctrl-I are handled as inline formatting shortcuts', () => {
  assert.match(editorSource, /formatKey\s*===\s*'b'/);
  assert.match(editorSource, /formatKey\s*===\s*'i'/);
  assert.match(editorSource, /\*\*/);
  assert.match(editorSource, /['"]_['"]/);
});

test('auto-linking skips inline code and javascript bookmarklet source', () => {
  const inline = renderInlineMarkdown('`crypto.randomUUID` and cnn.com');
  assert.match(inline, /<code>crypto\.randomUUID<\/code>/);
  assert.doesNotMatch(inline, /href="https:\/\/crypto\.randomUUID"/);
  assert.match(inline, /href="https:\/\/cnn\.com"/);

  const bookmarklet = renderInlineMarkdown("javascript:(()=>{const x=Date.now();const y=Math.random()})()");
  assert.doesNotMatch(bookmarklet, /href=/);
});

test('v0.4.4 bumps app version and PWA cache', () => {
  assert.equal(packageJson.version, '0.4.4');
  assert.match(versionSource, /APP_VERSION\s*=\s*'0\.4\.4'/);
  assert.match(swSource, /snippets-r4-4/);
});
