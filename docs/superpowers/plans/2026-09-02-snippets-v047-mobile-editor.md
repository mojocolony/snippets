# Snippets v0.4.7 Mobile/iPad Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Snippets capture-first on iPhone/iPad, make the iPad mini UI/editor comfortably sized and edge-to-edge, and replace separate per-line editing hosts with one continuous editing surface so text selection can cross hard-newline lines.

**Architecture:** Keep Snippets' existing Markdown document model (`doc` as newline-delimited Markdown) and line rendering, but make `.markdown-editor` the single `contenteditable` editing host and let `.editor-line-text` inherit editability. Centralize active-line editing/keydown/input behavior at the host while preserving todo controls, Markdown rendering on inactive lines, and todo reordering. Add a capture-first flag to launch policy, passed only for sub-900px viewports; preserve pinned-snippet priority. Expand mobile/tablet responsive treatment through 899px while keeping iPad sheets centered.

**Tech Stack:** Vanilla ES modules, DOM `contenteditable`, CSS media queries, Node `node:test`, existing Chromium browser harness when available.

**Spec:** Approved chat design on 2026-09-02: iPhone/iPad launches to a new blank snippet unless pinned; running app resumes in place; desktop return-window behavior remains; sub-900px editor becomes edge-to-edge and comfortably sized; continuous cross-line text selection replaces independent line editing hosts.

## Global Constraints

- Desktop starts at 900px and keeps its existing sidebar/workspace behavior.
- Pinned snippet overrides mobile capture-first launch.
- Mobile/tablet initial load below 900px opens a blank snippet; desktop keeps `returnWindow` behavior.
- iPad mini portrait (~744 CSS px) receives mobile/tablet typography and edge-to-edge editor treatment.
- iPad sheets remain centered; phone sheets below 720px remain bottom sheets.
- Markdown stays rendered on inactive lines and raw only on the active editing line.
- Todo checkbox/reorder behavior, Markdown todo continuation, Cmd/Ctrl-B/I, auto-linking, and sync behavior remain intact.
- Version becomes 0.4.7 and service-worker cache remains in the r4 patch family.

---

### Task 1: Mobile capture-first launch policy

**Files:**
- Modify: `src/domain/launchPolicy.js`
- Modify: `src/app.js`
- Test: `tests/unit/launchPolicy.test.js`
- Test: `tests/unit/revision47.test.js`

**Interfaces:**
- Consumes: existing `chooseLaunchTarget({ snippets, now, returnWindow })`.
- Produces: `chooseLaunchTarget({ snippets, now, returnWindow, captureFirst = false })` where pin priority remains first and `captureFirst` returns `{ type: 'blank' }` before recency/Inbox logic.

- [ ] **Step 1: Write failing launch-policy tests**

```js
test('capture-first mobile launch opens blank even when recent snippets exist', () => {
  assert.deepEqual(
    chooseLaunchTarget({ snippets: [snippet('a', 99_000)], now: 100_000, returnWindow: '60s', captureFirst: true }),
    { type: 'blank' }
  );
});

test('pinned snippet still overrides capture-first mobile launch', () => {
  assert.deepEqual(
    chooseLaunchTarget({ snippets: [snippet('p', 1, true), snippet('a', 99_000)], now: 100_000, captureFirst: true }),
    { type: 'snippet', id: 'p' }
  );
});
```

- [ ] **Step 2: Run tests and verify expected failure**

Run: `node --test tests/unit/launchPolicy.test.js`
Expected: capture-first test fails because current policy reopens the recent snippet.

- [ ] **Step 3: Implement minimal launch-policy flag and app wiring**

In `launchPolicy.js`, after pin resolution and before latest-snippet resolution:

```js
if (captureFirst) return { type: 'blank' };
```

In `app.js` initial routing:

```js
const target = chooseLaunchTarget({
  snippets: initialSnippets,
  returnWindow: state.preferences.returnWindow,
  captureFirst: !isDesktop()
});
```

- [ ] **Step 4: Run launch tests and revision test**

Run: `node --test tests/unit/launchPolicy.test.js tests/unit/revision47.test.js`
Expected: PASS.

- [ ] **Step 5: Commit task**

```bash
git add src/domain/launchPolicy.js src/app.js tests/unit/launchPolicy.test.js tests/unit/revision47.test.js
git commit -m "feat: make mobile launch capture-first"
```

---

### Task 2: iPad mini responsive typography and edge-to-edge editor

**Files:**
- Modify: `src/styles/responsive.css`
- Modify: `src/storage/preferencesRepository.js`
- Test: `tests/unit/editorSurfaceStyles.test.js`
- Test: `tests/unit/revision47.test.js`

**Interfaces:**
- Consumes: desktop breakpoint `min-width: 900px`, existing mobile rules at `max-width: 719px`.
- Produces: shared sub-900px editor/library/control typography and geometry; phone-only sheet docking remains max-719px; default editor font size becomes 20px for new/default preferences.

- [ ] **Step 1: Write failing responsive tests**

Add assertions that `@media (max-width: 899px)` contains edge-to-edge `.editor-sheet`, full-width `.editor-wrap`, 18px library titles/16px previews, and 52px control buttons. Add assertion that the phone-only `@media (max-width: 719px)` still owns `.sheet-backdrop { ... align-items: end; }`. Assert `DEFAULT_PREFERENCES.fontSize === 20`.

- [ ] **Step 2: Run tests and verify expected failure**

Run: `node --test tests/unit/editorSurfaceStyles.test.js tests/unit/revision47.test.js`
Expected: FAIL because editor/library sizing is currently restricted to max-width 719px and default is 18px.

- [ ] **Step 3: Split responsive rules**

Move these rules from max-719px into the existing max-899px block: editor screen/wrap/meta/sheet/markdown-editor, control strip/buttons, library/trash widths, segmented control sizing, library title/preview/tag/time/star typography, tag/search sizing, font grid. Keep bottom-sheet docking and phone sheet border-radius only in max-719px. Preserve `@media (min-width:720px)` centered sheet behavior.

Update `DEFAULT_PREFERENCES.fontSize` from `18` to `20` so users who have never explicitly saved a font-size preference receive the new default; explicitly persisted font sizes remain unchanged and continue to be honored.

- [ ] **Step 4: Run responsive tests**

Run: `node --test tests/unit/editorSurfaceStyles.test.js tests/unit/revision47.test.js`
Expected: PASS.

- [ ] **Step 5: Commit task**

```bash
git add src/styles/responsive.css src/storage/preferencesRepository.js tests/unit/editorSurfaceStyles.test.js tests/unit/revision47.test.js
git commit -m "feat: improve tablet editor layout and sizing"
```

---

### Task 3: One continuous Markdown editing host

**Files:**
- Modify: `src/editor/markdownEditor.js`
- Test: `tests/browser-tests.js`
- Test: `tests/unit/revision47.test.js`

**Interfaces:**
- Consumes: `doc` newline Markdown model, `applyEditorLineInput`, `splitLineAt`, `mergeLineWithPrevious`, `toggleTodoAtLine`, `renderInlineMarkdown`, `splitLineForDisplay`.
- Produces: one `.markdown-editor[contenteditable=true]` editing host; `.editor-line-text` children have no `contenteditable` attribute and inherit the parent editing host; active line remains raw Markdown while inactive lines render Markdown.

- [ ] **Step 1: Add failing structural and browser regression tests**

Unit/source assertions:

```js
assert.match(editorSource, /host\.contentEditable\s*=\s*['"]true['"]/);
assert.doesNotMatch(editorSource, /span\.contentEditable\s*=\s*['"]true['"]/);
```

Browser regression:

```js
await test('editor uses one editing host so selection can span hard-newline lines', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const editor = mountMarkdownEditor(host, { value: 'ARCHIVE\nTHE TALK SHOW\nParagraph text' });
  assert(host.isContentEditable, 'markdown editor is the editing host');
  const lines = [...host.querySelectorAll('.editor-line-text')];
  assert(lines.every(line => !line.hasAttribute('contenteditable')), 'line nodes inherit one editing host');
  const range = document.createRange();
  range.setStart(lines[0].firstChild, 0);
  range.setEnd(lines[1].firstChild, lines[1].firstChild.textContent.length);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  assert(selection.toString().includes('ARCHIVE') && selection.toString().includes('THE TALK SHOW'), 'selection spans hard-newline lines');
  editor.destroy(); host.remove();
});
```

- [ ] **Step 2: Run source/unit regression and confirm failure**

Run: `node --test tests/unit/revision47.test.js`
Expected: FAIL because each `.editor-line-text` is currently its own contenteditable host.

- [ ] **Step 3: Convert the editor to one editing host**

Set on mount:

```js
host.contentEditable = 'true';
host.spellcheck = true;
```

Remove `span.contentEditable = 'true'` and `span.spellcheck = true` from `makeLine`.

Track `activeLineIndex`. Add helpers to:
- identify the `.editor-line-text` containing the collapsed selection;
- convert an inactive rendered line to raw editable Markdown while preserving caret offset as closely as possible;
- re-render the previously active line when moving to another line or when a non-collapsed selection is created.

Delegate `input`, `keydown`, `paste`, pointer/click and selection-change behavior to the single host. Keep line-specific todo checkbox/drag handlers on their controls. Continue intercepting Enter and Backspace-at-start with existing document helpers. Let native left/right/up/down movement operate inside the shared editing host, then update the active raw line from `selectionchange` instead of jumping between separate editing hosts.

- [ ] **Step 4: Preserve formatting and todo behavior**

For Cmd/Ctrl-B/I, only apply inline markers when the selection starts and ends in the same `.editor-line-text`; allow multi-line selection to remain a normal selection without destructive formatting. Preserve first-typed-todo conversion, todo continuation on Enter, checkbox toggling, and todo reorder.

- [ ] **Step 5: Run unit tests and browser harness**

Run: `npm test`
Expected: PASS.

Run: `npm run test:browser`
Expected in a browser-capable environment: PASS including the new continuous-selection test. If this sandbox still returns `NO SUMMARY`, record browser harness as unavailable and do not claim browser execution passed.

- [ ] **Step 6: Commit task**

```bash
git add src/editor/markdownEditor.js tests/browser-tests.js tests/unit/revision47.test.js
git commit -m "fix: make snippet editing a continuous text surface"
```

---

### Task 4: Version, build, package, and verification

**Files:**
- Modify: `package.json`
- Modify: `src/version.js`
- Modify: `sw.js`
- Modify: `README.md`
- Test: `tests/unit/revision47.test.js`

**Interfaces:**
- Produces: v0.4.7 source repo, v0.4.7 production build, drop-in update ZIP, full repository ZIP.

- [ ] **Step 1: Add failing version/cache assertions**

Assert package and `src/version.js` are exactly `0.4.7`; service worker cache is `snippets-r4-7`.

- [ ] **Step 2: Run revision test and confirm failure**

Run: `node --test tests/unit/revision47.test.js`
Expected: FAIL on old version/cache.

- [ ] **Step 3: Bump version/cache and document revision**

Set package version and `APP_VERSION` to `0.4.7`, cache to `snippets-r4-7`, and add README release notes for mobile capture-first launch, iPad sizing/layout, and continuous editing surface.

- [ ] **Step 4: Full fresh verification**

Run:

```bash
npm test
npm run build
find src -name '*.js' -print0 | xargs -0 -n1 node --check
node --check sw.js
node --check scripts/build.js
git status --short
```

Expected: unit tests 0 failures; build exit 0; syntax checks exit 0; only intended tracked changes before commit.

- [ ] **Step 5: Commit release**

```bash
git add package.json src/version.js sw.js README.md tests/unit/revision47.test.js dist
git commit -m "release: Snippets v0.4.7"
```

- [ ] **Step 6: Package and verify artifacts**

Create `/mnt/data/Snippets-GitHub-repo-v0.4.7.zip` containing the full repository and `/mnt/data/Snippets-v0.4.7-update.zip` containing only files needed to update v0.4.6. Verify each with `unzip -t` and re-run `npm test` plus `npm run build` from an extracted copy of the packaged full repository.

---

## Self-Review

- Spec coverage: mobile blank launch, pin override, desktop return behavior, iPad mini responsive gap, 20px new default, centered iPad sheets, continuous hard-newline selection, existing Markdown/todo behavior, release packaging all have explicit tasks.
- Placeholder scan: no TBD/TODO/unspecified implementation steps.
- Type consistency: `captureFirst` is a boolean added only to `chooseLaunchTarget`; editor public API remains `getValue/setValue/focus/updateAppearance/destroy`.
