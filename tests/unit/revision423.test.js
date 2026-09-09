import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editorSource = await readFile(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const iconSvg = await readFile(new URL('../../assets/icon.svg', import.meta.url), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`\n  function ${nextName}(`, start);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test('caret restoration cancels any older scheduled restore before queuing a new one', () => {
  const body = functionBody(editorSource, 'queueTextSelection', 'queueTextRangeSelection');
  assert.match(body, /cancelAnimationFrame\(caretRestoreFrame\)/);
  assert.match(body, /caretRestoreFrame\s*=\s*requestAnimationFrame/);
});

test('temporary app focus loss preserves the active line and restores its caret', () => {
  assert.match(editorSource, /function captureResumeSelection\(/);
  assert.match(editorSource, /function restoreResumeSelection\(/);
  assert.match(editorSource, /window\.addEventListener\(['"]blur['"],\s*captureResumeSelection\)/);
  assert.match(editorSource, /window\.addEventListener\(['"]focus['"],\s*restoreResumeSelection\)/);
  const blurStart = editorSource.indexOf("surface.addEventListener('blur'");
  const blurEnd = editorSource.indexOf('\n\n  const handleSelectionChange', blurStart);
  const blurBody = editorSource.slice(blurStart, blurEnd);
  assert.match(blurBody, /document\.hasFocus\(\)/);
  assert.match(blurBody, /captureResumeSelection\(\)/);
});

test('Notebook Pen app icon keeps the grey-on-grey treatment and 82 percent inset', () => {
  assert.match(iconSvg, /fill=["']#B7BAC0["']/i);
  assert.match(iconSvg, /stroke=["']#666A70["']/i);
  assert.match(iconSvg, /translate\(12 12\)\s*scale\(0\.82\)\s*translate\(-12 -12\)/);
  assert.match(iconSvg, /M13\.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7\.4/);
});


const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.23 or later keeps matching app, package and PWA cache versions', () => {
  const match = packageJson.version.match(/^0\.4\.(\d+)$/);
  assert.ok(match && Number(match[1]) >= 23);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, new RegExp(`APP_VERSION\\s*=\\s*['"]${packageJson.version.replaceAll('.', '\\.') }['"]`));
  const patch = packageJson.version.split('.').at(-1);
  assert.match(swSource, new RegExp(`snippets-r4-${patch}`));
});
