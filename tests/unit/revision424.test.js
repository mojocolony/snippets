import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { splitLineAt } from '../../src/editor/editorState.js';

const appCss = await readFile(new URL('../../src/styles/app.css', import.meta.url), 'utf8');

test('active bullet lines keep the visible bullet and normal bullet indentation', () => {
  assert.doesNotMatch(appCss, /\.editor-line-text\.editor-line--bullet\.is-editing\s*\{[^}]*padding-left\s*:\s*0[^}]*\}/s);
  assert.doesNotMatch(appCss, /\.editor-gutter-item--bullet\.is-editing\s+\.bullet-marker\s*\{[^}]*visibility\s*:\s*hidden[^}]*\}/s);
  assert.match(appCss, /\.editor-line-text\.editor-line--bullet\s*\{[^}]*padding-left\s*:\s*24px[^}]*\}/s);
  assert.match(appCss, /\.bullet-marker::before\s*\{\s*content:\s*["']•["'];?\s*\}/s);
});


test('Return creates a real next bullet and a second Return on the empty bullet exits the list', () => {
  const continued = splitLineAt('- Staples', 0, 7);
  assert.deepEqual(continued, { doc: '- Staples\n- ', lineIndex: 1, caretOffset: 0 });
  assert.deepEqual(splitLineAt(continued.doc, 1, 0), { doc: '- Staples\n', lineIndex: 1, caretOffset: 0 });
});

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.24 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.24');
  assert.equal(packageLock.version, '0.4.24');
  assert.equal(packageLock.packages[''].version, '0.4.24');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.24['"]/);
  assert.match(swSource, /snippets-r4-24/);
});
