import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const librarySource = fs.readFileSync(new URL('../../src/ui/libraryView.js', import.meta.url), 'utf8');
const editorViewSource = fs.readFileSync(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
const trashSource = fs.readFileSync(new URL('../../src/ui/trashView.js', import.meta.url), 'utf8');
const tagSheetSource = fs.readFileSync(new URL('../../src/ui/tagSheet.js', import.meta.url), 'utf8');
const tagRepoSource = fs.readFileSync(new URL('../../src/storage/tagRepository.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const responsiveCss = fs.readFileSync(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');


test('library supports explicit multi-select and batch actions', () => {
  assert.match(librarySource, /selectionMode/);
  assert.match(librarySource, /selectedIds/);
  assert.match(librarySource, /data-batch-action="star"/);
  assert.match(librarySource, /data-batch-action="archive"/);
  assert.match(librarySource, /data-batch-action="tags"/);
  assert.match(librarySource, /data-batch-action="delete"/);
  assert.match(librarySource, /data-batch-action="done"/);
});

test('selection interactions include long press and modifier/range selection', () => {
  assert.match(librarySource, /onStartSelection/);
  assert.match(librarySource, /onRangeSelect/);
  assert.match(librarySource, /pointerdown/);
  assert.match(librarySource, /metaKey|ctrlKey/);
  assert.match(librarySource, /shiftKey/);
});

test('desktop sidebar participates in the same selection mode and batch bar', () => {
  assert.match(editorViewSource, /selectionMode/);
  assert.match(editorViewSource, /selectedIds/);
  assert.match(editorViewSource, /data-batch-action="delete"/);
  assert.match(editorViewSource, /setSelectionState/);
});

test('app performs batch star archive tag and trash operations', () => {
  assert.match(appSource, /selectedIds:\s*new Set/);
  assert.match(appSource, /batchToggleStar/);
  assert.match(appSource, /batchToggleArchive/);
  assert.match(appSource, /openBatchTags/);
  assert.match(appSource, /batchMoveToTrash/);
});

test('batch tag sheet represents mixed tag state and can force a tag on or off', () => {
  assert.match(tagSheetSource, /mixed/);
  assert.match(tagSheetSource, /indeterminate/);
  assert.match(tagRepoSource, /setSnippetTag/);
});

test('Trash is reachable from the editor menu and supports batch restore and permanent delete', () => {
  assert.match(appSource, /\{ id: 'trash', label: 'Trash' \}/);
  assert.match(trashSource, /selectionMode/);
  assert.match(trashSource, /data-batch-action="restore"/);
  assert.match(trashSource, /data-batch-action="delete"/);
});

test('editor metadata strip stays sticky below navigation while the note scrolls', () => {
  const metaRule = css.match(/\.editor-meta-strip\s*\{([\s\S]*?)\}/);
  assert.ok(metaRule);
  assert.match(metaRule[1], /position:\s*sticky/);
  assert.match(metaRule[1], /z-index:/);
  assert.match(responsiveCss, /\.desktop-main \.editor-meta-strip\s*\{[\s\S]*?top:\s*58px/);
  assert.match(responsiveCss, /@media \(max-width: 719px\)[\s\S]*?\.editor-meta-strip\s*\{[\s\S]*?top:\s*0/);
});

test('v0.4.0 bumps the app version and PWA cache', () => {
  assert.equal(packageJson.version, '0.4.0');
  assert.match(swSource, /snippets-r4/);
});
