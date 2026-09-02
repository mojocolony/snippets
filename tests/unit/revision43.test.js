import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const bookmarkletPage = fs.readFileSync(new URL('../../bookmarklets.html', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../../scripts/build.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function readOptional(path) {
  try { return fs.readFileSync(new URL(path, import.meta.url), 'utf8'); }
  catch { return ''; }
}

const sheetSource = readOptional('../../src/ui/webCaptureSheet.js');
const bookmarkletSource = readOptional('../../src/capture/bookmarklets.js');

test('More menus surface Web Capture and open the dedicated sheet', () => {
  assert.match(appSource, /openWebCaptureSheet/);
  assert.match(appSource, /id:\s*'web-capture',\s*label:\s*'Web Capture'/);
  assert.ok((appSource.match(/id:\s*'web-capture'/g) || []).length >= 2, 'Web Capture should appear in editor and library More menus');
  assert.match(appSource, /id === 'web-capture'/);
});

test('Web Capture sheet exposes all three existing bookmarklets and setup page', () => {
  assert.match(sheetSource, /BOOKMARKLET_OPTIONS/);
  assert.match(bookmarkletSource, /Save Link/);
  assert.match(bookmarkletSource, /Save Selection/);
  assert.match(bookmarkletSource, /Save Page Text/);
  assert.match(sheetSource, /createBookmarkletCode/);
  assert.match(sheetSource, /bookmarklets\.html/);
  assert.match(sheetSource, /Drag .*bookmarks bar/i);
  assert.match(sheetSource, /iPhone|iPad|mobile/i);
});

test('Web Capture uses the shared generator in-app and the setup page ships literal fallbacks', () => {
  assert.match(bookmarkletSource, /BOOKMARKLET_OPTIONS/);
  assert.match(bookmarkletSource, /createBookmarkletCode/);
  assert.ok((bookmarkletPage.match(/href=["']javascript:/gi) || []).length >= 3);
  assert.match(buildSource, /src\/capture\/bookmarklets\.js/);
  assert.match(buildSource, /src\/ui\/webCaptureSheet\.js/);
});

test('v0.4.3 establishes the 0.4.3+ patch line and r4 cache family', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 3);
  assert.match(versionSource, /APP_VERSION\s*=\s*'0\.4\.\d+'/);
  assert.match(swSource, /snippets-r4-/);
});

test('bookmarklet generator targets the deployed app and preserves each capture mode', async () => {
  if (!bookmarkletSource) assert.fail('bookmarklet generator module is missing');
  const mod = await import('../../src/capture/bookmarklets.js');
  const appUrl = 'https://example.com/snippets/';
  const link = mod.createBookmarkletCode('link', appUrl);
  const selection = mod.createBookmarkletCode('selection', appUrl);
  const page = mod.createBookmarkletCode('page', appUrl);
  assert.ok(link.startsWith('javascript:'));
  assert.match(link, /https:\/\/example\.com\/snippets\/\?captureSession=/);
  assert.match(link, /mode:'link'/);
  assert.match(selection, /String\(getSelection\(\)\)/);
  assert.match(selection, /mode:'selection'/);
  assert.match(page, /document\.body\.innerText/);
  assert.match(page, /mode:'page'/);
});
