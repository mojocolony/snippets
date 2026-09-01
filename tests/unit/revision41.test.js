import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const editorView = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const libraryView = fs.readFileSync(new URL('../../src/ui/libraryView.js', import.meta.url), 'utf8');
const trashView = fs.readFileSync(new URL('../../src/ui/trashView.js', import.meta.url), 'utf8');
const batchIcons = fs.readFileSync(new URL('../../src/ui/batchIcons.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../../scripts/build.js', import.meta.url), 'utf8');

test('hidden control strips cannot be made visible by the shared flex toolbar rule', () => {
  assert.match(css, /\.control-strip\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
});

test('batch action bars use shared Lucide-style SVG icons instead of Unicode symbols', () => {
  for (const source of [editorView, libraryView, trashView]) {
    assert.match(source, /batchIconMarkup/);
    const batchMarkup = source.match(/function batchStripMarkup\(count\) \{[\s\S]*?\n\}/)?.[0] || '';
    assert.ok(batchMarkup);
    assert.doesNotMatch(batchMarkup, />★<|>▣<|>#<|>⌫<|>×<|>↺</);
    assert.match(batchMarkup, /batchIconMarkup\('/);
  }
  assert.match(batchIcons, /<svg/);
  assert.match(batchIcons, /viewBox=\"0 0 24 24\"/);
});

test('v0.4.1 establishes the 0.4 patch release and r4 cache family', () => {
  assert.match(packageJson.version, /^0\.4\.\d+$/);
  assert.match(versionSource, /APP_VERSION\s*=\s*'0\.4\.\d+'/);
  assert.match(swSource, /snippets-r4/);
});

test('standalone production build includes the shared batch icon helper', () => {
  assert.match(buildSource, /src\/ui\/batchIcons\.js/);
});
