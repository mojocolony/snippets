import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`async function ${name}(`);
  const end = source.indexOf(`\n  function ${nextName}(`, start);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test('slash Select snippets enters empty selection mode on desktop and mobile', () => {
  const body = functionBody(appSource, 'handleEditorCommand', 'openAppearance');
  assert.doesNotMatch(body, /const currentId\s*=\s*state\.currentSnippet/);
  assert.doesNotMatch(body, /enterSelectionMode\(currentId\)/);
  assert.equal((body.match(/enterSelectionMode\(\)/g) || []).length, 2);
  assert.match(body, /if \(isDesktop\(\)\)[\s\S]*enterSelectionMode\(\)[\s\S]*showLibrary\(state\.libraryScope\)[\s\S]*enterSelectionMode\(\)/);
});

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.20 or later keeps matching app, package and PWA cache versions', () => {
  const patch = Number(packageJson.version.split('.').at(-1));
  assert.ok(patch >= 20);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, new RegExp(`APP_VERSION\\s*=\\s*['"]${packageJson.version.replaceAll('.', '\\.')}['"]`));
  assert.match(swSource, /snippets-r4-\d+/);
});
