import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let formatModule = {};
try { formatModule = await import('../../src/editor/selectionFormatting.js'); } catch { formatModule = {}; }

const { setHeadingLevel, insertInlineMarkersAtCaret, insertLinkAtCaret } = formatModule;
const editorSource = await readFile(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');

test('heading level helper supports H1 through H4, replacement, toggle, and todo exclusivity', () => {
  assert.equal(typeof setHeadingLevel, 'function');
  assert.equal(setHeadingLevel('Alpha', 0, 0, 4).doc, '#### Alpha');
  assert.equal(setHeadingLevel('#### Alpha', 0, 0, 4).doc, 'Alpha');
  assert.equal(setHeadingLevel('## Alpha', 0, 0, 3).doc, '### Alpha');
  assert.equal(setHeadingLevel('- [ ] Alpha', 0, 0, 2).doc, '## Alpha');
});

test('collapsed caret helpers insert paired formatting markers and link label caret', () => {
  assert.equal(typeof insertInlineMarkersAtCaret, 'function');
  assert.equal(typeof insertLinkAtCaret, 'function');
  assert.deepEqual(insertInlineMarkersAtCaret('Alpha', 0, 2, '**'), { doc: 'Al****pha', lineIndex: 0, caretOffset: 4 });
  assert.deepEqual(insertInlineMarkersAtCaret('Alpha', 0, 2, '_'), { doc: 'Al__pha', lineIndex: 0, caretOffset: 3 });
  assert.deepEqual(insertLinkAtCaret('Alpha', 0, 2, 'https://example.com'), { doc: 'Al[](https://example.com)pha', lineIndex: 0, caretOffset: 3 });
});

test('editor can render H4 with its own heading-4 class', () => {
  assert.match(editorSource, /Math\.min\(display\.level,\s*4\)/);
  assert.doesNotMatch(editorSource, /Math\.min\(display\.level,\s*3\)/);
});

const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');
const editorViewSource = await readFile(new URL('../../src/ui/editorView.js', import.meta.url), 'utf8');
let slashPaletteSource = '';
let headingMenuSource = '';
try { slashPaletteSource = await readFile(new URL('../../src/ui/slashCommandPalette.js', import.meta.url), 'utf8'); } catch {}
try { headingMenuSource = await readFile(new URL('../../src/ui/headingLevelMenu.js', import.meta.url), 'utf8'); } catch {}

test('markdown editor integrates slash parser, filtered commands, palette UI, and keyboard navigation', () => {
  assert.match(editorSource, /parseSlashQuery/);
  assert.match(editorSource, /slashCommandsForContext/);
  assert.match(editorSource, /filterSlashCommands/);
  assert.match(editorSource, /createSlashCommandPalette/);
  assert.match(editorSource, /ArrowDown/);
  assert.match(editorSource, /ArrowUp/);
  assert.match(editorSource, /executeActive/);
  assert.match(editorSource, /Escape/);
  assert.match(slashPaletteSource, /No commands/);
  assert.match(slashPaletteSource, /pointerdown/);
});

test('slash execution removes the command token through editor source state before applying the action', () => {
  assert.match(editorSource, /removeSlashToken/);
  assert.match(editorSource, /executeSlashCommand/);
  assert.match(editorSource, /removeSlashToken\(slashState\)/);
});

test('app-level slash commands reuse current Star Pin Archive Tags Select and New flows', () => {
  assert.match(appSource, /async function togglePin\(/);
  assert.match(appSource, /async function toggleArchive\(/);
  assert.match(appSource, /async function handleEditorCommand\(/);
  assert.match(appSource, /id === 'star'[\s\S]*toggleStar\(\)/);
  assert.match(appSource, /id === 'pin'[\s\S]*togglePin\(\)/);
  assert.match(appSource, /id === 'archive'[\s\S]*toggleArchive\(\)/);
  assert.match(appSource, /id === 'tags'[\s\S]*openEditorTags\(\)/);
  assert.match(appSource, /id === 'new'[\s\S]*showEditor\(null\)/);
  assert.match(appSource, /id === 'select'[\s\S]*isDesktop\(\)/);
  assert.match(editorViewSource, /onEditorCommand/);
  assert.match(editorViewSource, /commandContext/);
});

test('selected-text Heading opens an H1-H4 chooser while seven-icon toolbar remains unchanged', () => {
  assert.match(headingMenuSource, /Heading 1/);
  assert.match(headingMenuSource, /Heading 2/);
  assert.match(headingMenuSource, /Heading 3/);
  assert.match(headingMenuSource, /Heading 4/);
  assert.match(editorSource, /openHeadingLevelMenu/);
  assert.match(editorSource, /setHeadingLevel/);
  assert.match(editorSource, /openHeadingChooser/);
  assert.doesNotMatch(editorSource, /data-format-action="code"/);
});

const packageJson419 = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock419 = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource419 = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource419 = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
const buildSource419 = await readFile(new URL('../../scripts/build.js', import.meta.url), 'utf8');
const appCss419 = await readFile(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const responsiveCss419 = await readFile(new URL('../../src/styles/responsive.css', import.meta.url), 'utf8');

test('standalone build includes slash command and heading chooser modules before app startup', () => {
  assert.match(buildSource419, /src\/editor\/slashCommands\.js/);
  assert.match(buildSource419, /src\/ui\/slashCommandPalette\.js/);
  assert.match(buildSource419, /src\/ui\/headingLevelMenu\.js/);
});

test('slash palette is compact on desktop and touch friendly on mobile, and H4 has distinct typography', () => {
  assert.match(appCss419, /\.slash-command-palette/);
  assert.match(appCss419, /\.editor-line-text\.heading-4/);
  assert.match(responsiveCss419, /\.slash-command-row\s*\{[^}]*min-height:\s*44px/s);
});

test('v0.4.19 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson419.version, '0.4.19');
  assert.equal(packageLock419.version, '0.4.19');
  assert.equal(packageLock419.packages[''].version, '0.4.19');
  assert.match(versionSource419, /APP_VERSION\s*=\s*['"]0\.4\.19['"]/);
  assert.match(swSource419, /snippets-r4-19/);
});
