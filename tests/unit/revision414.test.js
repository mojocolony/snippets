import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let viewportModule = {};
try { viewportModule = await import('../../src/editor/formattingViewport.js'); } catch { viewportModule = {}; }

const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const responsiveCss = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../../scripts/build.js', import.meta.url), 'utf8');

test('touch-capable iPhone and iPad layouts opt into the keyboard formatting bar', () => {
  assert.equal(typeof viewportModule.shouldUseKeyboardFormattingBar, 'function');
  assert.equal(viewportModule.shouldUseKeyboardFormattingBar({ maxTouchPoints: 5 }), true);
  assert.equal(viewportModule.shouldUseKeyboardFormattingBar({ maxTouchPoints: 1 }), true);
  assert.equal(viewportModule.shouldUseKeyboardFormattingBar({ maxTouchPoints: 0 }), false);
});

test('keyboard accessory geometry follows the visual viewport bottom edge', () => {
  assert.equal(typeof viewportModule.keyboardAccessoryGeometry, 'function');
  assert.deepEqual(
    viewportModule.keyboardAccessoryGeometry(
      { offsetLeft: 0, offsetTop: 18, width: 430, height: 470 },
      { toolbarHeight: 48 }
    ),
    { left: 215, top: 440, width: 430 }
  );
  assert.deepEqual(
    viewportModule.keyboardAccessoryGeometry(
      { offsetLeft: 12, offsetTop: 70, width: 810, height: 560 },
      { toolbarHeight: 48 }
    ),
    { left: 417, top: 582, width: 810 }
  );
});

test('keyboard bar is used only when a touch visual viewport is substantially reduced', () => {
  assert.equal(typeof viewportModule.shouldAnchorFormattingBarToKeyboard, 'function');
  assert.equal(viewportModule.shouldAnchorFormattingBarToKeyboard({ touchLayout: true, baselineHeight: 844, viewportHeight: 500 }), true);
  assert.equal(viewportModule.shouldAnchorFormattingBarToKeyboard({ touchLayout: true, baselineHeight: 844, viewportHeight: 760 }), false);
  assert.equal(viewportModule.shouldAnchorFormattingBarToKeyboard({ touchLayout: false, baselineHeight: 844, viewportHeight: 500 }), false);
});

test('desktop selection toolbar retains the v0.4.14 Craft-style action order and excludes Todo', () => {
  assert.equal(typeof viewportModule.formattingActionsForLayout, 'function');
  assert.deepEqual(
    viewportModule.formattingActionsForLayout({ keyboardAccessory: false }),
    ['highlight', 'bold', 'italic', 'strike', 'code', 'link']
  );
});

test('iOS formatting interaction applies on pointerdown before selection can collapse and tracks visualViewport changes', () => {
  assert.match(editorSource, /palette\.addEventListener\(['"]pointerdown['"][\s\S]*?applyFormattingAction\(button\.dataset\.formatAction\)/);
  assert.match(editorSource, /window\.visualViewport/);
  assert.match(editorSource, /visualViewport\?\.addEventListener\(['"]resize['"]/);
  assert.match(editorSource, /visualViewport\?\.addEventListener\(['"]scroll['"]/);
  assert.match(editorSource, /is-keyboard-accessory/);
  assert.match(responsiveCss, /\.formatting-palette\.is-keyboard-accessory/);
  assert.doesNotMatch(responsiveCss, /@media \(max-width: 899px\)[\s\S]*?\.formatting-palette\s*\{[\s\S]*?bottom:\s*calc\(82px/);
});

test('standalone build includes formatting viewport helper before markdown editor', () => {
  const helper = buildSource.indexOf('src/editor/formattingViewport.js');
  const editor = buildSource.indexOf('src/editor/markdownEditor.js');
  assert.ok(helper >= 0 && editor > helper);
});

test('v0.4.14 or later preserves matching app, package and r4 PWA cache versions', () => {
  const [, minor, patch] = packageJson.version.split('.').map(Number);
  assert.equal(minor, 4);
  assert.ok(patch >= 14);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.\d+['"]/);
  assert.match(swSource, /snippets-r4-/);
});
