import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('iOS keyboard selection toolbar uses Lucide Heading, Bold, Italic and Strikethrough icons', () => {
  assert.match(editorSource, /if \(keyboardAccessory && action === 'highlight'\)[\s\S]*?<svg[\s\S]*?M6 12h12[\s\S]*?M6 20V4[\s\S]*?M18 20V4/);
  assert.match(editorSource, /if \(keyboardAccessory && action === 'bold'\)[\s\S]*?<svg[\s\S]*?M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8/);
  assert.match(editorSource, /if \(keyboardAccessory && action === 'italic'\)[\s\S]*?<svg[\s\S]*?<line[^>]+x1="19"[^>]+x2="10"[^>]+y1="4"[^>]+y2="4"[\s\S]*?<line[^>]+x1="15"[^>]+x2="9"[^>]+y1="4"[^>]+y2="20"/);
  assert.match(editorSource, /if \(keyboardAccessory && action === 'strike'\)[\s\S]*?<svg[\s\S]*?M16 4H9a3 3 0 0 0-2\.83 4[\s\S]*?M14 12a4 4 0 0 1 0 8H6[\s\S]*?<line[^>]+x1="4"[^>]+x2="20"[^>]+y1="12"[^>]+y2="12"/);
});

test('desktop formatting controls retain their existing text glyphs', () => {
  assert.match(editorSource, /if \(action === 'highlight'\)[^\n]+>H<\/button>/);
  assert.match(editorSource, /if \(action === 'bold'\)[^\n]+<strong>B<\/strong>/);
  assert.match(editorSource, /if \(action === 'italic'\)[^\n]+<em>I<\/em>/);
  assert.match(editorSource, /if \(action === 'strike'\)[^\n]+>S<\/button>/);
});

test('v0.4.16 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.16');
  assert.equal(packageLock.version, '0.4.16');
  assert.equal(packageLock.packages[''].version, '0.4.16');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.16['"]/);
  assert.match(swSource, /snippets-r4-16/);
});
