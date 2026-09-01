import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const editorView = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const libraryView = fs.readFileSync(new URL('../../src/ui/libraryView.js', import.meta.url), 'utf8');
const responsive = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');

test('desktop editor includes a collapsible snippets sidebar and library scope navigation', () => {
  assert.match(editorView, /desktop-sidebar/);
  assert.match(editorView, /desktop-library-tabs/);
  assert.match(responsive, /@media \(min-width: 900px\)[\s\S]*?\.desktop-workspace/);
  assert.match(responsive, /\.desktop-workspace\.is-sidebar-collapsed/);
});

test('library rows render a restrained star indicator for starred snippets', () => {
  assert.match(libraryView, /library-star/);
  assert.match(libraryView, /item\.starred/);
  assert.match(editorView, /library-star/);
  assert.match(editorView, /item\.starred/);
});


test('wide desktop keeps the editor a fixed distance from a fixed-width sidebar', () => {
  assert.match(responsive, /--desktop-sidebar-width:\s*300px/);
  assert.match(responsive, /--desktop-editor-width:\s*780px/);
  assert.match(responsive, /--desktop-editor-gap:\s*48px/);
  assert.match(responsive, /grid-template-columns:\s*var\(--desktop-sidebar-width\) minmax\(0, 1fr\)/);
  assert.match(responsive, /\.desktop-main \.editor-wrap[\s\S]*?width:\s*var\(--desktop-working-width\)[\s\S]*?margin:\s*0 auto 0 var\(--desktop-editor-gap\)/);
});

test('desktop navigation and toolbar align to the editor working column', () => {
  assert.match(responsive, /--desktop-working-left:\s*calc\(var\(--desktop-sidebar-width\) \+ var\(--desktop-editor-gap\)\)/);
  assert.match(responsive, /--desktop-working-width:\s*min\(var\(--desktop-editor-width\), calc\(100vw - var\(--desktop-sidebar-width\) - 96px\)\)/);
  assert.match(responsive, /\.desktop-library-tabs[^{]*\{[^}]*right:\s*auto[^}]*left:\s*var\(--desktop-working-left\)[^}]*width:\s*var\(--desktop-working-width\)/);
  assert.match(responsive, /\.desktop-main \.control-strip[^{]*\{[^}]*left:\s*var\(--desktop-working-left\)[^}]*right:\s*auto[^}]*width:\s*var\(--desktop-working-width\)/);
  assert.match(responsive, /--desktop-working-left:\s*max\(48px, calc\(\(100vw - var\(--desktop-working-width\)\) \/ 2\)\)/);
});

test('desktop interface typography is comfortably readable', () => {
  assert.match(responsive, /\.desktop-sidebar-head[\s\S]*?font-size:\s*17px/);
  assert.match(responsive, /\.desktop-sidebar-title[\s\S]*?font-size:\s*16px/);
  assert.match(responsive, /\.desktop-sidebar-preview[\s\S]*?font-size:\s*14px/);
  assert.match(responsive, /\.desktop-sidebar-footer[\s\S]*?font-size:\s*12px/);
  assert.match(responsive, /\.desktop-library-tabs button[\s\S]*?font-size:\s*15px/);
  assert.match(responsive, /\.desktop-main \.control-button[^{]*\{[\s\S]*?font-size:\s*18px/);
});

test('editor shows a compact metadata strip with star state and assigned tags', () => {
  assert.match(editorView, /editor-meta-strip/);
  assert.match(editorView, /data-action="meta-star"/);
  assert.match(editorView, /data-action="meta-tags"/);
  assert.match(editorView, /editor-meta-tag-list/);
  assert.match(responsive, /\.desktop-main \.editor-meta-strip/);
});

test('collapsed desktop sidebar centers the entire working column', () => {
  assert.match(responsive, /--desktop-working-left:\s*max\(48px, calc\(\(100vw - var\(--desktop-working-width\)\) \/ 2\)\)/);
  assert.match(responsive, /\.desktop-workspace\.is-sidebar-collapsed \.desktop-main \.editor-wrap[^{]*\{[^}]*margin-left:\s*var\(--desktop-working-left\)/);
  assert.doesNotMatch(responsive, /\.desktop-workspace\.is-sidebar-collapsed \.desktop-library-tabs\s*\{\s*left:\s*var\(--desktop-editor-gap\)/);
  assert.doesNotMatch(responsive, /\.desktop-workspace\.is-sidebar-collapsed \.control-strip\s*\{\s*left:\s*var\(--desktop-editor-gap\)/);
});

test('desktop editor chrome uses whitespace instead of full-width divider rules', () => {
  assert.doesNotMatch(responsive, /\.desktop-library-tabs\s*\{[^}]*border-bottom:\s*1px solid var\(--hairline\)/);
  assert.doesNotMatch(responsive, /\.desktop-main \.control-strip\s*\{[^}]*border-top:\s*1px solid var\(--hairline\)/);
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.doesNotMatch(appCss, /\.editor-meta-strip\s*\{[^}]*border-bottom:\s*1px solid var\(--hairline\)/);
});

test('metadata row keeps equal outer spacing around the tag area', () => {
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(appCss, /\.editor-meta-strip\s*\{[^}]*grid-template-columns:\s*28px max-content 28px[^}]*column-gap:\s*8px/);
  assert.match(appCss, /\.editor-meta-star\.is-active\s*\{[^}]*background:\s*transparent[^}]*color:\s*var\(--text\)/);
});

test('metadata star and add control share identical fixed geometry', () => {
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(appCss, /\.editor-meta-control\s*\{[^}]*width:\s*28px[^}]*height:\s*28px[^}]*display:\s*grid[^}]*place-items:\s*center[^}]*line-height:\s*1/);
  assert.match(appCss, /\.editor-meta-tag-area\s*\{[^}]*min-height:\s*28px[^}]*display:\s*inline-flex[^}]*align-items:\s*center/);
});


test('metadata star and add use same-size SVG geometry instead of font glyphs', () => {
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(editorView, /class=\"editor-meta-icon editor-meta-star-icon\"[^>]*viewBox=\"0 0 18 18\"/);
  assert.match(editorView, /class=\"editor-meta-icon editor-meta-plus-icon\"[^>]*viewBox=\"0 0 18 18\"/);
  assert.match(appCss, /\.editor-meta-icon\s*\{[^}]*width:\s*18px[^}]*height:\s*18px[^}]*display:\s*block/);
  assert.doesNotMatch(editorView, /meta-star[^>]*>☆<\/button>/);
});

test('metadata SVG star and plus have the same exact geometric centre', () => {
  const starMatch = editorView.match(/editor-meta-star-icon[\s\S]*?<polygon points="([^"]+)"/);
  assert.ok(starMatch, 'star polygon points are present');
  const points = starMatch[1].trim().split(/\s+/).map(pair => pair.split(',').map(Number));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const starCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const starCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert.ok(Math.abs(starCenterX - 9) < 0.001, `star x centre ${starCenterX} should be 9`);
  assert.ok(Math.abs(starCenterY - 9) < 0.001, `star y centre ${starCenterY} should be 9`);
  assert.match(editorView, /editor-meta-plus-icon[\s\S]*?<path d="M9 3v12M3 9h12"/);
});

test('metadata row uses three fixed geometry slots with a separate add-tag control', () => {
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(editorView, /class="editor-meta-star editor-meta-control"/);
  assert.match(editorView, /class="editor-meta-tag-area"/);
  assert.match(editorView, /class="editor-meta-add editor-meta-control" data-action="meta-add-tag"/);
  assert.doesNotMatch(editorView, /editor-meta-tags-button[\s\S]*?editor-meta-plus-icon/);
  assert.match(appCss, /\.editor-meta-control\s*\{[^}]*width:\s*28px[^}]*height:\s*28px[^}]*display:\s*grid[^}]*place-items:\s*center/);
  assert.match(appCss, /\.editor-meta-tag-area\s*\{[^}]*min-height:\s*28px[^}]*display:\s*inline-flex[^}]*align-items:\s*center/);
});

test('metadata tag chips and empty tag state share one fixed height', () => {
  const appCss = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(editorView, /editor-meta-empty-tag/);
  assert.match(appCss, /\.editor-meta-strip \.tag-chip\s*\{[^}]*height:\s*28px/);
  assert.match(appCss, /\.editor-meta-empty-tag\s*\{[^}]*height:\s*28px[^}]*display:\s*inline-flex[^}]*align-items:\s*center/);
});

test('metadata controls avoid native browser title tooltips', () => {
  const metaBlock = editorView.match(/<div class="editor-meta-strip"[\s\S]*?<\/div>\s*<section class="editor-sheet"/);
  assert.ok(metaBlock, 'metadata strip markup is present');
  assert.doesNotMatch(metaBlock[0], /title=/);
});

test('Revision 1 gives iPhone library and toolbar typography true mobile sizes', () => {
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.segmented button\s*\{[^}]*min-height:\s*42px[^}]*font-size:\s*18px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.library-title\s*\{[^}]*font-size:\s*18px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.library-preview\s*\{[^}]*font-size:\s*16px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.library-tags \.tag-chip\s*\{[^}]*font-size:\s*15px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.library-modified\s*\{[^}]*font-size:\s*14px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.control-button\s*\{[^}]*min-width:\s*52px[^}]*height:\s*52px[^}]*font-size:\s*22px/);
  assert.match(responsive, /@media \(max-width: 719px\)[\s\S]*?\.control-button\.control-aa\s*\{[^}]*font-size:\s*18px/);
});
