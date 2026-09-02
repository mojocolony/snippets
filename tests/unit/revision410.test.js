import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let shareModule = {};
try { shareModule = await import('../../src/domain/sharePayload.js'); } catch { shareModule = {}; }
let formatModule = {};
try { formatModule = await import('../../src/editor/selectionFormatting.js'); } catch { formatModule = {}; }

const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const responsiveCss = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../../scripts/build.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('share payload uses the first meaningful line as title and does not put a one-line snippet in text', () => {
  assert.equal(typeof shareModule.buildSharePayload, 'function');
  assert.deepEqual(shareModule.buildSharePayload('Call Whirlpool'), { title: 'Call Whirlpool' });
});

test('share payload sends remaining plain text and source URL in their semantic fields', () => {
  assert.equal(typeof shareModule.buildSharePayload, 'function');
  assert.deepEqual(
    shareModule.buildSharePayload('\n**Call Whirlpool**\n\nModel WTW5000\nFriday morning\n', 'https://example.com/service'),
    { title: 'Call Whirlpool', text: 'Model WTW5000\nFriday morning', url: 'https://example.com/service' }
  );
  assert.match(appSource, /buildSharePayload/);
  assert.match(appSource, /navigator\.share\(payload\)/);
  assert.match(appSource, /state\.currentSnippet\?\.sourceUrl/);
});

test('inline formatting wraps same-line selections with Markdown markers', () => {
  assert.equal(typeof formatModule.applyInlineFormat, 'function');
  const selection = { startLine: 0, startOffset: 6, endLine: 0, endOffset: 11 };
  assert.equal(formatModule.applyInlineFormat('Hello world', selection, 'bold').doc, 'Hello **world**');
  assert.equal(formatModule.applyInlineFormat('Hello world', selection, 'italic').doc, 'Hello _world_');
  assert.equal(formatModule.applyInlineFormat('Hello world', selection, 'highlight').doc, 'Hello ==world==');
  assert.equal(formatModule.applyInlineFormat('Hello world', selection, 'strike').doc, 'Hello ~~world~~');
  assert.equal(formatModule.applyInlineFormat('Hello world', selection, 'code').doc, 'Hello `world`');
});

test('inline formatting applies independently to each selected line', () => {
  assert.equal(typeof formatModule.applyInlineFormat, 'function');
  const result = formatModule.applyInlineFormat('Alpha one\nBeta two', {
    startLine: 0, startOffset: 6, endLine: 1, endOffset: 4
  }, 'highlight');
  assert.equal(result.doc, 'Alpha ==one==\n==Beta== two');
});

test('link formatting accepts a bare domain and produces a safe https Markdown link', () => {
  assert.equal(typeof formatModule.applyInlineFormat, 'function');
  const result = formatModule.applyInlineFormat('Read OpenAI', {
    startLine: 0, startOffset: 5, endLine: 0, endOffset: 11
  }, 'link', { href: 'openai.com' });
  assert.equal(result.doc, 'Read [OpenAI](https://openai.com)');
  assert.equal(formatModule.normalizeLinkHref('javascript:alert(1)'), null);
});

test('Todo converts blank, current, or multiple lines and toggles todos back to text', () => {
  assert.equal(typeof formatModule.toggleTodoLines, 'function');
  assert.equal(formatModule.toggleTodoLines('', 0, 0).doc, '- [ ] ');
  assert.equal(formatModule.toggleTodoLines('Call Whirlpool', 0, 0).doc, '- [ ] Call Whirlpool');
  assert.equal(formatModule.toggleTodoLines('One\nTwo', 0, 1).doc, '- [ ] One\n- [ ] Two');
  assert.equal(formatModule.toggleTodoLines('- [ ] One\n- [x] Two', 0, 1).doc, 'One\nTwo');
});

test('editor exposes inline selection formatting while Todo remains a separate editor command', () => {
  for (const action of ['bold', 'italic', 'highlight', 'strike', 'code', 'link']) {
    assert.match(editorSource, new RegExp(`data-format-action[^\n]+${action}|${action}[^\n]+data-format-action`, 'i'));
  }
  assert.doesNotMatch(editorSource.match(/palette\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1] || '', /data-format-action="todo"/);
  assert.match(editorSource, /toggleTodo\(\)\s*\{/);
  assert.match(editorSource, /formatting-palette/);
  assert.match(editorSource, /prompt\(['"]Link URL/);
  assert.match(css, /\.formatting-palette\s*\{/);
  assert.match(responsiveCss, /\.formatting-palette/);
});


test('standalone build includes the new share and formatting modules before their consumers', () => {
  assert.match(buildSource, /src\/domain\/sharePayload\.js/);
  assert.match(buildSource, /src\/editor\/selectionFormatting\.js/);
});

test('v0.4.10 or later keeps matching app, package and PWA cache versions', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 10);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.\d+['"]/);
  assert.match(swSource, /snippets-r4-/);
});
