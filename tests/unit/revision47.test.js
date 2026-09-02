import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');


function mediaBlock(source, query) {
  const marker = `@media (${query})`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker} exists`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`Unclosed ${marker}`);
}

test('mobile initial routing opts into capture-first launch below the desktop breakpoint', () => {
  assert.match(appSource, /chooseLaunchTarget\(\{[\s\S]*?captureFirst:\s*!isDesktop\(\)/);
});


const responsive = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');
const preferencesSource = fs.readFileSync(new URL('../../src/storage/preferencesRepository.js', import.meta.url), 'utf8');
const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');

test('iPad mini width receives the readable sub-900px editor and library treatment', () => {
  const compact = mediaBlock(responsive, 'max-width: 899px');
  assert.match(compact, /\.editor-sheet\s*\{[^}]*border-radius:\s*0/);
  assert.match(compact, /\.control-button\s*\{[^}]*height:\s*52px/);
  assert.match(compact, /\.library-title\s*\{[^}]*font-size:\s*18px/);
  assert.match(compact, /\.library-preview\s*\{[^}]*font-size:\s*16px/);
});

test('phone-only sheet docking remains below 720px so iPad sheets stay centered', () => {
  const phone = mediaBlock(responsive, 'max-width: 719px');
  assert.match(phone, /\.sheet-backdrop\s*\{[^}]*align-items:\s*end/);
});

test('new Snippets installs default to a 20px editor size', () => {
  assert.match(preferencesSource, /fontSize:\s*20/);
});


test('Markdown editor uses one inherited editing host instead of one contenteditable per line', () => {
  assert.match(editorSource, /host\.contentEditable\s*=\s*['"]true['"]/);
  assert.doesNotMatch(editorSource, /span\.contentEditable\s*=\s*['"]true['"]/);
});

const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.7 publishes the approved version and a fresh r4 cache', () => {
  assert.equal(packageJson.version, '0.4.7');
  assert.equal(packageLock.version, '0.4.7');
  assert.equal(packageLock.packages[''].version, '0.4.7');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.7['"]/);
  assert.match(swSource, /snippets-r4-7/);
});
