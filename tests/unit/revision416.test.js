import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('selection toolbar uses Lucide Heading, Bold, Italic and Strikethrough icons on every layout', () => {
  assert.match(editorSource, /if \(action === 'heading'\)[\s\S]*?M6 12h12[\s\S]*?M6 20V4[\s\S]*?M18 20V4/);
  assert.match(editorSource, /if \(action === 'bold'\)[\s\S]*?M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8/);
  assert.match(editorSource, /if \(action === 'italic'\)[\s\S]*?<line[^>]+x1="19"[^>]+x2="10"[^>]+y1="4"[^>]+y2="4"[\s\S]*?<line[^>]+x1="15"[^>]+x2="9"[^>]+y1="4"[^>]+y2="20"/);
  assert.match(editorSource, /if \(action === 'strike'\)[\s\S]*?M16 4H9a3 3 0 0 0-2\.83 4[\s\S]*?M14 12a4 4 0 0 1 0 8H6[\s\S]*?<line[^>]+x1="4"[^>]+x2="20"[^>]+y1="12"[^>]+y2="12"/);
  assert.doesNotMatch(editorSource, /data-format-action=["'](?:heading|bold|italic|strike)["'][^\n]*?>\s*(?:H|B|I|S)\s*<\/button>/);
});


test('v0.4.16 or later stays on the r4 patch release and cache family', () => {
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(major, 0);
  assert.equal(minor, 4);
  assert.ok(patch >= 16);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.(?:1[6-9]|[2-9]\d+)['"]/);
  assert.match(swSource, /snippets-r4-/);
});
