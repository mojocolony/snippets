# Snippets Working Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first, working Snippets prototype that opens into immediate Markdown capture, supports Inbox/Starred/Archive, tags, hybrid todos/highlighting, pin/return launch rules, Trash, appearance controls, search, and native sharing on equally capable mobile and desktop layouts.

**Architecture:** Use a framework-free Vite application written as focused ES modules. IndexedDB is the source of truth behind repository modules; UI views consume repository interfaces rather than IndexedDB directly, so Supabase can replace persistence later. CodeMirror 6 provides the Markdown editing surface while keeping plain Markdown as the stored value; custom decorations provide interactive checkboxes, checked-task strike-through, highlight rendering, and todo reordering.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Vite, IndexedDB via `idb`, CodeMirror 6, Vitest + jsdom + `fake-indexeddb`, Playwright for browser-level verification.

**Spec:** `docs/superpowers/specs/2026-09-01-snippets-prototype-design.md`

## Global Constraints

- Snippets is a personal, Markdown-first capture app; the core flow is **Open → type → leave**.
- The first prototype is local-only. Do not connect Supabase or implement authentication yet.
- Keep primary navigation to two states: Editor and full-screen Library.
- Library primary tabs are exactly Inbox / Starred / Archive. Trash remains secondary under More.
- Do not add folders, notebooks, projects, attachments, reminders, backlinks, collaboration, dashboards, AI, or rich-text storage.
- Store snippet content as plain Markdown only.
- Blank editors never create persisted snippets; the first entered character creates one; erasing all content removes it when leaving the editor.
- One pinned snippet maximum. Pin overrides the configurable return-to-latest window.
- Return-window values are exactly: fresh, 30 seconds, 1 minute (default), 5 minutes, 15 minutes, always.
- Library order is modified-first only.
- Tags are global, visible but subdued in Library rows, and work across Inbox / Starred / Archive.
- Checked Markdown todos render struck through but remain `- [x]` in stored Markdown.
- Delete moves to Trash; Trash retains items for 30 days unless restored or permanently deleted.
- UI is mostly greyscale, low-chrome, typography-led, with dark mode designed as a first-class theme.
- Bottom control strip remains bottom-centred on both mobile and desktop.
- Default UI/editor typeface is iA Writer Duo / Duospace when installed, with graceful fallbacks.
- Editor font choices: iA Writer Duo / Duospace, Open Sans, Literata, Bookerly (local only), IBM Plex Mono, Roboto Mono.
- Do not bundle or redistribute Bookerly or iA font files; reference them with `local()`/font-family fallbacks. Open fonts may be loaded from a web font provider in the prototype.
- Omit line-spacing controls in this prototype; font family and size are sufficient for the first UX test.
- Bookmarklet/web capture is deliberately deferred from this prototype because the approved spec makes it optional for the first local build.

---

## File Map

Create these files; keep responsibilities separated as shown.

```text
snippets/
├── index.html                         # Static shell + pre-paint theme bootstrap
├── package.json                       # Vite/test scripts and dependencies
├── vite.config.js                     # Relative-base build for GitHub Pages compatibility
├── playwright.config.js               # Browser-level test setup
├── src/
│   ├── main.js                        # App bootstrap only
│   ├── app.js                         # App state/navigation orchestration
│   ├── storage/
│   │   ├── db.js                      # IndexedDB schema/opening
│   │   ├── snippetRepository.js       # Snippet CRUD/state transitions
│   │   ├── tagRepository.js           # Tag creation/toggle/counts
│   │   └── preferencesRepository.js   # Theme/font/return-window preferences
│   ├── domain/
│   │   ├── snippetText.js             # title/preview/plain-text helpers
│   │   ├── launchPolicy.js            # pin + return-window launch decision
│   │   └── trashPolicy.js             # 30-day retention helpers
│   ├── editor/
│   │   ├── markdownEditor.js          # CodeMirror setup + content callbacks
│   │   ├── markdownDecorations.js     # highlight + checkbox + strike decorations
│   │   └── todoReorder.js             # drag/touch todo line movement
│   ├── ui/
│   │   ├── editorView.js              # Editor screen and bottom strip
│   │   ├── libraryView.js             # Inbox/Starred/Archive/Search list
│   │   ├── tagSheet.js                # Assign/filter tags
│   │   ├── appearanceSheet.js         # Theme/font/font-size controls
│   │   ├── moreMenu.js                # Archive/pin/delete/copy/settings/trash entry
│   │   ├── trashView.js               # Restore/permanent delete UI
│   │   └── toast.js                   # Quiet transient errors/status
│   └── styles/
│       ├── tokens.css                  # Greyscale theme + spacing/type tokens
│       ├── app.css                     # Shell/editor/library/control strip
│       └── responsive.css              # Mobile/desktop adaptations
├── tests/
│   ├── setup.js
│   ├── unit/
│   │   ├── snippetRepository.test.js
│   │   ├── tagRepository.test.js
│   │   ├── preferencesRepository.test.js
│   │   ├── snippetText.test.js
│   │   ├── launchPolicy.test.js
│   │   ├── trashPolicy.test.js
│   │   └── markdownDecorations.test.js
│   └── e2e/
│       └── snippets.spec.js
└── docs/superpowers/
    ├── specs/2026-09-01-snippets-prototype-design.md
    └── plans/2026-09-01-snippets-working-prototype.md
```

---

### Task 1: Scaffold the App Shell, Theme Tokens, and Test Harness

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `playwright.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Create: `src/styles/responsive.css`
- Create: `tests/setup.js`
- Create: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces: `#app` mount point, CSS theme contract via `html[data-theme]`, and npm scripts used by every later task.
- Produces npm scripts: `dev`, `build`, `test`, `test:watch`, `test:e2e`.

- [ ] **Step 1: Create the package and install runtime/test dependencies**

Create `package.json`:

```json
{
  "name": "snippets",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@codemirror/commands": "^6.8.1",
    "@codemirror/lang-markdown": "^6.3.4",
    "@codemirror/language": "^6.11.3",
    "@codemirror/state": "^6.5.2",
    "@codemirror/view": "^6.38.0",
    "idb": "^8.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "fake-indexeddb": "^6.1.0",
    "jsdom": "^26.1.0",
    "vite": "^7.1.3",
    "vitest": "^3.2.4"
  },
  "vitest": {
    "environment": "jsdom",
    "setupFiles": ["./tests/setup.js"]
  }
}
```

Run:

```bash
npm install
npx playwright install chromium
```

Expected: dependency install completes without errors.

- [ ] **Step 2: Add Vite and Playwright configuration**

Create `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 4173 },
  preview: { port: 4173 }
});
```

Create `playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 15 Pro'] } }
  ]
});
```

- [ ] **Step 3: Write the first browser-level failing test**

Create `tests/e2e/snippets.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('opens directly to a blank capture editor with a bottom control strip', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('editor-screen')).toBeVisible();
  await expect(page.getByTestId('editor-input')).toBeVisible();
  await expect(page.getByTestId('control-strip')).toBeVisible();
  await expect(page.getByTestId('editor-input')).toHaveText('');
});
```

Run:

```bash
npm run test:e2e -- --project=desktop
```

Expected: FAIL because the app shell does not exist yet.

- [ ] **Step 4: Create the pre-paint theme bootstrap and static mount point**

Create `index.html`:

```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f7f7f5" />
    <title>Snippets</title>
    <script>
      (() => {
        const saved = localStorage.getItem('snippets:themeMode') || 'system';
        const dark = saved === 'dark' || (saved === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      })();
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

Create `src/main.js` with a temporary shell:

```js
import './styles/tokens.css';
import './styles/app.css';
import './styles/responsive.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="editor-screen" data-testid="editor-screen">
    <div class="editor-input" data-testid="editor-input" contenteditable="true"></div>
    <nav class="control-strip" data-testid="control-strip" aria-label="Editor controls">
      <button type="button">Library</button>
      <button type="button">#</button>
      <button type="button">☆</button>
      <button type="button">Aa</button>
      <button type="button">Share</button>
      <button type="button">•••</button>
    </nav>
  </main>`;
```

Create `src/styles/tokens.css`:

```css
:root {
  --bg: #f7f7f5;
  --surface: #efefed;
  --text: #171717;
  --muted: #737373;
  --hairline: #e5e5e5;
  --editor-max: 760px;
  --radius-pill: 999px;
  --ui-font: "iA Writer Duo", "iA Writer Duospace", ui-monospace, SFMono-Regular, Menlo, monospace;
}

html[data-theme="dark"] {
  --bg: #111111;
  --surface: #202020;
  --text: #ececec;
  --muted: #929292;
  --hairline: #292929;
}
```

Create `src/styles/app.css`:

```css
* { box-sizing: border-box; }
html, body, #app { min-height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--ui-font);
  transition: background-color 120ms ease, color 120ms ease;
}
button, input { font: inherit; }
.editor-screen { min-height: 100dvh; }
.editor-input {
  width: min(calc(100% - 40px), var(--editor-max));
  min-height: calc(100dvh - 112px);
  margin: 0 auto;
  padding: 48px 0 120px;
  outline: none;
}
.control-strip {
  position: fixed;
  left: 50%;
  bottom: calc(14px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  padding: 5px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(18px);
}
.control-strip button {
  border: 0;
  background: transparent;
  color: var(--text);
  min-width: 48px;
  min-height: 44px;
  border-radius: var(--radius-pill);
}
```

Create `src/styles/responsive.css`:

```css
@media (max-width: 600px) {
  .editor-input {
    width: calc(100% - 28px);
    padding-top: 28px;
  }
  .control-strip {
    width: calc(100% - 20px);
    justify-content: space-between;
  }
  .control-strip button { min-width: 44px; }
}
```

Create `tests/setup.js`:

```js
import 'fake-indexeddb/auto';
```

- [ ] **Step 5: Run the browser test and build**

Run:

```bash
npm run test:e2e -- --project=desktop
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit the scaffold**

```bash
git add package.json package-lock.json vite.config.js playwright.config.js index.html src tests
 git commit -m "chore: scaffold Snippets prototype"
```

---

### Task 2: Implement IndexedDB Repositories and Domain Helpers

**Files:**
- Create: `src/storage/db.js`
- Create: `src/storage/snippetRepository.js`
- Create: `src/storage/tagRepository.js`
- Create: `src/storage/preferencesRepository.js`
- Create: `src/domain/snippetText.js`
- Create: `src/domain/launchPolicy.js`
- Create: `src/domain/trashPolicy.js`
- Create: `tests/unit/snippetRepository.test.js`
- Create: `tests/unit/tagRepository.test.js`
- Create: `tests/unit/preferencesRepository.test.js`
- Create: `tests/unit/snippetText.test.js`
- Create: `tests/unit/launchPolicy.test.js`
- Create: `tests/unit/trashPolicy.test.js`

**Interfaces:**
- Produces: `openSnippetsDb(): Promise<IDBPDatabase>`
- Produces snippet repository methods:
  - `createSnippet(content, now?) -> Promise<Snippet>`
  - `getSnippet(id) -> Promise<Snippet|undefined>`
  - `updateSnippet(id, patch, now?) -> Promise<Snippet>`
  - `removeSnippetIfEmpty(id) -> Promise<boolean>`
  - `listSnippets({scope, tag, query}) -> Promise<Snippet[]>`
  - `setPinnedSnippet(id|null) -> Promise<void>`
  - `moveToTrash(id, now?) -> Promise<void>`
  - `restoreSnippet(id, now?) -> Promise<void>`
  - `deleteSnippetPermanently(id) -> Promise<void>`
  - `purgeExpiredTrash(now?) -> Promise<number>`
- Produces tag repository methods:
  - `toggleSnippetTag(snippetId, rawName) -> Promise<Snippet>`
  - `listTagsWithCounts() -> Promise<Array<{name,count}>>`
- Produces preference methods:
  - `getPreferences() -> Promise<Preferences>`
  - `setPreference(key, value) -> Promise<Preferences>`
- Produces pure helpers: `getSnippetTitle`, `getSnippetPreview`, `toPlainText`, `chooseLaunchTarget`, `isTrashExpired`.

- [ ] **Step 1: Write failing repository and policy tests**

Create `tests/unit/snippetRepository.test.js` with these cases:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';
import {
  createSnippet, getSnippet, listSnippets, setPinnedSnippet,
  moveToTrash, restoreSnippet, purgeExpiredTrash
} from '../../src/storage/snippetRepository.js';

beforeEach(async () => { await deleteDB('snippets-prototype'); });

describe('snippetRepository', () => {
  it('creates plain Markdown and returns modified-first lists', async () => {
    const a = await createSnippet('older', 1000);
    const b = await createSnippet('newer', 2000);
    const items = await listSnippets({ scope: 'inbox' });
    expect(items.map(x => x.id)).toEqual([b.id, a.id]);
  });

  it('enforces one pinned snippet', async () => {
    const a = await createSnippet('a', 1000);
    const b = await createSnippet('b', 2000);
    await setPinnedSnippet(a.id);
    await setPinnedSnippet(b.id);
    expect((await getSnippet(a.id)).pinned).toBe(false);
    expect((await getSnippet(b.id)).pinned).toBe(true);
  });

  it('moves to Trash and restores without losing star/tags', async () => {
    const item = await createSnippet('hello', 1000);
    await moveToTrash(item.id, 2000);
    expect((await getSnippet(item.id)).deletedAt).toBe(2000);
    await restoreSnippet(item.id, 3000);
    expect((await getSnippet(item.id)).deletedAt).toBeNull();
  });

  it('purges Trash after 30 days', async () => {
    const day = 24 * 60 * 60 * 1000;
    const item = await createSnippet('old trash', 0);
    await moveToTrash(item.id, 0);
    expect(await purgeExpiredTrash(31 * day)).toBe(1);
    expect(await getSnippet(item.id)).toBeUndefined();
  });
});
```

Create `tests/unit/launchPolicy.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { chooseLaunchTarget } from '../../src/domain/launchPolicy.js';

const snippet = (id, updatedAt, pinned = false) => ({ id, updatedAt, pinned, deletedAt: null });

describe('chooseLaunchTarget', () => {
  it('prefers pinned over return window', () => {
    expect(chooseLaunchTarget({ snippets: [snippet('a', 1, true), snippet('b', 9999)], now: 10000, returnWindow: 'fresh' }))
      .toEqual({ type: 'snippet', id: 'a' });
  });

  it('reopens latest within one minute', () => {
    expect(chooseLaunchTarget({ snippets: [snippet('a', 50_000)], now: 100_000, returnWindow: '60s' }))
      .toEqual({ type: 'snippet', id: 'a' });
  });

  it('starts fresh outside the window', () => {
    expect(chooseLaunchTarget({ snippets: [snippet('a', 1)], now: 100_000, returnWindow: '60s' }))
      .toEqual({ type: 'blank' });
  });
});
```

Create `tests/unit/snippetText.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { getSnippetTitle, getSnippetPreview, toPlainText } from '../../src/domain/snippetText.js';

describe('snippet text helpers', () => {
  it('uses first meaningful line as title and second meaningful line as preview', () => {
    const content = '\n# Macbeth banquet scene\n\nBanquo enters after the toast.\nThird line';
    expect(getSnippetTitle(content)).toBe('Macbeth banquet scene');
    expect(getSnippetPreview(content)).toBe('Banquo enters after the toast.');
  });

  it('converts common Markdown to readable plain text without breaking URLs', () => {
    expect(toPlainText('**Read** https://example.com and ==remember== it'))
      .toBe('Read https://example.com and remember it');
  });
});
```

Run:

```bash
npm test
```

Expected: FAIL because repositories/helpers do not exist.

- [ ] **Step 2: Implement the IndexedDB schema**

Create `src/storage/db.js`:

```js
import { openDB } from 'idb';

export const DB_NAME = 'snippets-prototype';
export const DB_VERSION = 1;

export function openSnippetsDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const snippets = db.createObjectStore('snippets', { keyPath: 'id' });
      snippets.createIndex('updatedAt', 'updatedAt');
      snippets.createIndex('deletedAt', 'deletedAt');
      db.createObjectStore('tags', { keyPath: 'name' });
      db.createObjectStore('preferences', { keyPath: 'key' });
    }
  });
}
```

- [ ] **Step 3: Implement repository behavior**

Create `src/storage/snippetRepository.js` using the exact stored shape:

```js
import { openSnippetsDb } from './db.js';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function makeSnippet(content, now) {
  return {
    id: crypto.randomUUID(),
    content,
    createdAt: now,
    updatedAt: now,
    starred: false,
    archived: false,
    deletedAt: null,
    pinned: false,
    tags: [],
    sourceUrl: null
  };
}

export async function createSnippet(content, now = Date.now()) {
  const db = await openSnippetsDb();
  const snippet = makeSnippet(content, now);
  await db.put('snippets', snippet);
  return snippet;
}

export async function getSnippet(id) {
  return (await openSnippetsDb()).get('snippets', id);
}

export async function updateSnippet(id, patch, now = Date.now()) {
  const db = await openSnippetsDb();
  const current = await db.get('snippets', id);
  if (!current) throw new Error(`Snippet not found: ${id}`);
  const next = { ...current, ...patch, updatedAt: now };
  await db.put('snippets', next);
  return next;
}

export async function removeSnippetIfEmpty(id) {
  const db = await openSnippetsDb();
  const current = await db.get('snippets', id);
  if (!current || current.content.trim()) return false;
  await db.delete('snippets', id);
  return true;
}

export async function listSnippets({ scope = 'inbox', tag = null, query = '' } = {}) {
  const db = await openSnippetsDb();
  const all = await db.getAll('snippets');
  const q = query.trim().toLowerCase();
  return all.filter(item => {
    if (scope === 'trash') return item.deletedAt !== null;
    if (item.deletedAt !== null) return false;
    if (scope === 'inbox' && item.archived) return false;
    if (scope === 'starred' && !item.starred) return false;
    if (scope === 'archive' && !item.archived) return false;
    if (tag && !item.tags.includes(tag)) return false;
    if (q && !`${item.content}\n${item.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function setPinnedSnippet(id = null) {
  const db = await openSnippetsDb();
  const tx = db.transaction('snippets', 'readwrite');
  const all = await tx.store.getAll();
  for (const item of all) {
    const pinned = item.id === id;
    if (item.pinned !== pinned) await tx.store.put({ ...item, pinned });
  }
  await tx.done;
}

export async function moveToTrash(id, now = Date.now()) {
  const current = await getSnippet(id);
  if (!current) return;
  await updateSnippet(id, { deletedAt: now, pinned: false }, now);
}

export async function restoreSnippet(id, now = Date.now()) {
  const current = await getSnippet(id);
  if (!current) return;
  await updateSnippet(id, { deletedAt: null }, now);
}

export async function deleteSnippetPermanently(id) {
  await (await openSnippetsDb()).delete('snippets', id);
}

export async function purgeExpiredTrash(now = Date.now()) {
  const db = await openSnippetsDb();
  const tx = db.transaction('snippets', 'readwrite');
  const all = await tx.store.getAll();
  let purged = 0;
  for (const item of all) {
    if (item.deletedAt !== null && now - item.deletedAt >= THIRTY_DAYS) {
      await tx.store.delete(item.id);
      purged += 1;
    }
  }
  await tx.done;
  return purged;
}
```

- [ ] **Step 4: Implement tags, preferences, and pure domain helpers**

Create `src/storage/tagRepository.js`:

```js
import { openSnippetsDb } from './db.js';
import { getSnippet, updateSnippet } from './snippetRepository.js';

function normalize(raw) { return raw.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase(); }

export async function toggleSnippetTag(snippetId, rawName) {
  const name = normalize(rawName);
  if (!name) throw new Error('Tag name cannot be empty');
  const db = await openSnippetsDb();
  await db.put('tags', { name, createdAt: Date.now() });
  const snippet = await getSnippet(snippetId);
  const has = snippet.tags.includes(name);
  const tags = has ? snippet.tags.filter(tag => tag !== name) : [...snippet.tags, name].sort();
  return updateSnippet(snippetId, { tags });
}

export async function listTagsWithCounts() {
  const db = await openSnippetsDb();
  const [tags, snippets] = await Promise.all([db.getAll('tags'), db.getAll('snippets')]);
  return tags.map(({ name }) => ({
    name,
    count: snippets.filter(s => s.deletedAt === null && s.tags.includes(name)).length
  })).sort((a, b) => a.name.localeCompare(b.name));
}
```

Create `src/storage/preferencesRepository.js`:

```js
import { openSnippetsDb } from './db.js';

export const DEFAULT_PREFERENCES = {
  themeMode: 'system',
  editorFont: 'ia-writer-duo',
  fontSize: 18,
  returnWindow: '60s'
};

export async function getPreferences() {
  const db = await openSnippetsDb();
  const rows = await db.getAll('preferences');
  return rows.reduce((prefs, row) => ({ ...prefs, [row.key]: row.value }), { ...DEFAULT_PREFERENCES });
}

export async function setPreference(key, value) {
  const db = await openSnippetsDb();
  await db.put('preferences', { key, value });
  if (key === 'themeMode') localStorage.setItem('snippets:themeMode', value);
  return getPreferences();
}
```

Create `src/domain/snippetText.js`:

```js
function meaningfulLines(content) {
  return content.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}
function clean(line) {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/[*_~`]/g, '')
    .replace(/==(.+?)==/g, '$1')
    .trim();
}
export function getSnippetTitle(content) { return clean(meaningfulLines(content)[0] || ''); }
export function getSnippetPreview(content) { return clean(meaningfulLines(content)[1] || ''); }
export function toPlainText(content) { return content.split(/\r?\n/).map(clean).join('\n').trim(); }
```

Create `src/domain/launchPolicy.js`:

```js
const WINDOWS = { fresh: 0, '30s': 30_000, '60s': 60_000, '5m': 300_000, '15m': 900_000, always: Infinity };

export function chooseLaunchTarget({ snippets, now = Date.now(), returnWindow = '60s' }) {
  const live = snippets.filter(s => s.deletedAt === null);
  const pinned = live.find(s => s.pinned);
  if (pinned) return { type: 'snippet', id: pinned.id };
  const latest = [...live].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!latest) return { type: 'blank' };
  const windowMs = WINDOWS[returnWindow] ?? WINDOWS['60s'];
  return now - latest.updatedAt <= windowMs ? { type: 'snippet', id: latest.id } : { type: 'blank' };
}
```

Create `src/domain/trashPolicy.js`:

```js
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export function isTrashExpired(deletedAt, now = Date.now()) {
  return deletedAt !== null && now - deletedAt >= TRASH_RETENTION_MS;
}
```

- [ ] **Step 5: Add remaining tag/preferences tests and run the full unit suite**

Create `tests/unit/tagRepository.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';
import { createSnippet } from '../../src/storage/snippetRepository.js';
import { toggleSnippetTag, listTagsWithCounts } from '../../src/storage/tagRepository.js';

beforeEach(async () => { await deleteDB('snippets-prototype'); });

describe('tagRepository', () => {
  it('toggles a normalized tag and reports global counts', async () => {
    const a = await createSnippet('A', 1000);
    const b = await createSnippet('B', 2000);
    await toggleSnippetTag(a.id, '#Macbeth');
    await toggleSnippetTag(b.id, 'Macbeth');
    expect(await listTagsWithCounts()).toEqual([{ name: 'macbeth', count: 2 }]);
    const updated = await toggleSnippetTag(a.id, 'macbeth');
    expect(updated.tags).toEqual([]);
    expect(await listTagsWithCounts()).toEqual([{ name: 'macbeth', count: 1 }]);
  });
});
```

Create `tests/unit/preferencesRepository.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';
import { getPreferences, setPreference } from '../../src/storage/preferencesRepository.js';

beforeEach(async () => {
  await deleteDB('snippets-prototype');
  localStorage.clear();
});

describe('preferencesRepository', () => {
  it('returns approved defaults and persists changes', async () => {
    expect(await getPreferences()).toMatchObject({
      themeMode: 'system', editorFont: 'ia-writer-duo', fontSize: 18, returnWindow: '60s'
    });
    const next = await setPreference('themeMode', 'dark');
    expect(next.themeMode).toBe('dark');
    expect(localStorage.getItem('snippets:themeMode')).toBe('dark');
  });
});
```

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit storage/domain foundation**

```bash
git add src/storage src/domain tests/unit
 git commit -m "feat: add local Snippets data model"
```

---

### Task 3: Build App State, Launch Rules, and Autosaving Capture

**Files:**
- Create: `src/app.js`
- Create: `src/ui/editorView.js`
- Modify: `src/main.js`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Consumes repository methods from Task 2.
- Produces `createApp(root): Promise<{destroy():void}>`.
- `editorView` emits callbacks: `onContentChange(markdown)`, `onLibrary()`, `onTags()`, `onStar()`, `onAppearance()`, `onShare()`, `onMore()`.

- [ ] **Step 1: Add failing E2E tests for first-character creation, autosave, and launch return**

Append to `tests/e2e/snippets.spec.js`:

```js
test('first character creates a snippet and autosave survives refresh', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByTestId('editor-input');
  await editor.click();
  await editor.fill('Remember this');
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.getByTestId('editor-input')).toContainText('Remember this');
});

test('a blank launch does not create a library row', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('library-button').click();
  await expect(page.getByTestId('library-row')).toHaveCount(0);
});
```

Run the two tests and confirm FAIL.

- [ ] **Step 2: Implement app bootstrap and launch choice**

Create `src/app.js` with state fields:

```js
import { listSnippets, getSnippet, createSnippet, updateSnippet, removeSnippetIfEmpty, purgeExpiredTrash } from './storage/snippetRepository.js';
import { getPreferences } from './storage/preferencesRepository.js';
import { chooseLaunchTarget } from './domain/launchPolicy.js';
import { renderEditorView } from './ui/editorView.js';

export async function createApp(root) {
  await purgeExpiredTrash();
  const prefs = await getPreferences();
  const snippets = await listSnippets({ scope: 'all' });
  const target = chooseLaunchTarget({ snippets, returnWindow: prefs.returnWindow });
  let currentSnippet = target.type === 'snippet' ? await getSnippet(target.id) : null;
  let saveTimer = null;

  async function saveMarkdown(markdown) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!currentSnippet && markdown.trim()) currentSnippet = await createSnippet(markdown);
      else if (currentSnippet) currentSnippet = await updateSnippet(currentSnippet.id, { content: markdown });
    }, 120);
  }

  async function leaveEditor() {
    clearTimeout(saveTimer);
    if (currentSnippet) await removeSnippetIfEmpty(currentSnippet.id);
  }

  renderEditorView(root, {
    content: currentSnippet?.content || '',
    preferences: prefs,
    onContentChange: saveMarkdown,
    onBeforeLeave: leaveEditor
  });

  return { destroy() { clearTimeout(saveTimer); root.replaceChildren(); } };
}
```

Update `src/main.js`:

```js
import './styles/tokens.css';
import './styles/app.css';
import './styles/responsive.css';
import { createApp } from './app.js';

createApp(document.querySelector('#app'));
```

- [ ] **Step 3: Implement the editor screen with a temporary textarea-backed surface**

Create `src/ui/editorView.js` so it renders the final bottom-strip positions and a text surface that Task 4 will replace with CodeMirror. Use `textarea` with `data-testid="editor-input"`, no title field, and stable control positions.

Key markup:

```js
export function renderEditorView(root, options) {
  root.innerHTML = `
    <main class="editor-screen" data-testid="editor-screen">
      <textarea class="editor-input" data-testid="editor-input" aria-label="Snippet"></textarea>
      <nav class="control-strip" data-testid="control-strip">
        <button data-testid="library-button" aria-label="Library">Library</button>
        <button data-action="tags" aria-label="Tags">#</button>
        <button data-action="star" aria-label="Star">☆</button>
        <button data-action="appearance" aria-label="Appearance">Aa</button>
        <button data-action="share" aria-label="Share">Share</button>
        <button data-action="more" aria-label="More">•••</button>
      </nav>
    </main>`;
  const input = root.querySelector('[data-testid="editor-input"]');
  input.value = options.content;
  input.addEventListener('input', () => options.onContentChange(input.value));
  input.focus();
}
```

- [ ] **Step 4: Run autosave tests and commit**

Run:

```bash
npm test
npm run test:e2e -- --project=desktop
```

Expected: autosave and blank-launch tests PASS.

Commit:

```bash
git add src tests/e2e
 git commit -m "feat: add immediate autosaving capture flow"
```

---

### Task 4: Replace the Temporary Editor with Hybrid Markdown, Todos, Highlighting, and Reordering

**Files:**
- Create: `src/editor/markdownEditor.js`
- Create: `src/editor/markdownDecorations.js`
- Create: `src/editor/todoReorder.js`
- Create: `tests/unit/markdownDecorations.test.js`
- Modify: `src/ui/editorView.js`
- Modify: `src/styles/app.css`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces `mountMarkdownEditor(host, {value,onChange,fontFamily,fontSize}) -> {getValue(), setValue(), focus(), destroy()}`.
- Produces pure `parseTodoLine(line)` and `findHighlightRanges(text)` helpers for unit testing.
- Produces `moveTodoLine(doc, fromLine, toLine) -> string` for deterministic reorder tests.

- [ ] **Step 1: Write failing pure-function tests for todo parsing, highlight ranges, and reorder**

Create `tests/unit/markdownDecorations.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { parseTodoLine, findHighlightRanges } from '../../src/editor/markdownDecorations.js';
import { moveTodoLine } from '../../src/editor/todoReorder.js';

describe('hybrid Markdown helpers', () => {
  it('parses unchecked and checked Markdown todos', () => {
    expect(parseTodoLine('- [ ] Call dentist')).toMatchObject({ checked: false, text: 'Call dentist' });
    expect(parseTodoLine('- [x] Email Mark')).toMatchObject({ checked: true, text: 'Email Mark' });
  });

  it('finds ==highlight== content excluding delimiters', () => {
    expect(findHighlightRanges('a ==bright== idea')).toEqual([{ from: 4, to: 10 }]);
  });

  it('reorders only Markdown lines', () => {
    const doc = '- [ ] A\n- [x] B\n- [ ] C';
    expect(moveTodoLine(doc, 1, 3)).toBe('- [x] B\n- [ ] C\n- [ ] A');
  });
});
```

Run `npm test`; expected FAIL.

- [ ] **Step 2: Implement pure Markdown helpers**

Create `src/editor/markdownDecorations.js` with:

```js
export function parseTodoLine(line) {
  const match = line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/);
  return match ? { prefix: match[1], checked: match[2].toLowerCase() === 'x', text: match[3] } : null;
}

export function findHighlightRanges(text) {
  const ranges = [];
  const regex = /==(.+?)==/g;
  let match;
  while ((match = regex.exec(text))) ranges.push({ from: match.index + 2, to: match.index + 2 + match[1].length });
  return ranges;
}
```

Create `src/editor/todoReorder.js`:

```js
export function moveTodoLine(doc, fromLine, toLine) {
  const lines = doc.split('\n');
  const [moved] = lines.splice(fromLine - 1, 1);
  lines.splice(toLine - 1, 0, moved);
  return lines.join('\n');
}
```

Run `npm test`; expected PASS.

- [ ] **Step 3: Mount CodeMirror 6 with Markdown source-of-truth**

Create `src/editor/markdownEditor.js`. Configure `EditorState`, `EditorView`, `markdown()`, `history()`, `keymap`, `lineWrapping`, and an update listener. The update listener must call `onChange(view.state.doc.toString())` only when `update.docChanged` is true.

The editor must expose the exact interface from this task and add `data-testid="editor-input"` to `.cm-editor` after mounting so existing E2E tests keep working.

- [ ] **Step 4: Add decorations for checked strike-through and `==highlight==`**

In `markdownDecorations.js`, add a CodeMirror `ViewPlugin` that:

- Scans visible lines.
- Adds a subdued strike-through class to the task text portion of checked `- [x]` lines.
- Adds `cm-snippets-highlight` to the content between `==` delimiters.
- Adds a checkbox widget over the `[ ]`/`[x]` token; clicking dispatches a source edit that toggles only the marker character.
- Keeps Markdown source unchanged except for the checkbox marker toggle.

Add CSS:

```css
.cm-snippets-complete { text-decoration: line-through; color: var(--muted); }
.cm-snippets-highlight { background: color-mix(in srgb, #d8c98f 38%, transparent); border-radius: 2px; }
.cm-editor { font-family: var(--editor-font, var(--ui-font)); font-size: var(--editor-size, 18px); }
.cm-editor.cm-focused { outline: none; }
.cm-scroller { font-family: inherit; line-height: 1.65; }
```

- [ ] **Step 5: Add a touch-friendly drag handle only for consecutive todo rows**

Extend the decoration plugin with a small `≡` widget positioned in the gutter area for todo lines. Pointer-down records the source line; pointer-up on another todo line calls `moveTodoLine()` and dispatches a whole-document replacement only when source and destination differ. Do not auto-sort completed items.

- [ ] **Step 6: Add browser tests for checkbox persistence and strike-through**

Append:

```js
test('checking a Markdown todo persists - [x] and displays strike-through', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByTestId('editor-input');
  await editor.click();
  await page.keyboard.type('- [ ] Email Mark');
  await page.getByRole('checkbox').click();
  await expect(page.locator('.cm-snippets-complete')).toContainText('Email Mark');
  await page.reload();
  await expect(page.locator('.cm-snippets-complete')).toContainText('Email Mark');
});
```

Run desktop E2E and unit tests. Expected: PASS.

- [ ] **Step 7: Commit the hybrid editor**

```bash
git add src/editor src/ui/editorView.js src/styles/app.css tests
 git commit -m "feat: add hybrid Markdown editor"
```

---

### Task 5: Build Full-Screen Library, Filters, Search, Star, and Archive

**Files:**
- Create: `src/ui/libraryView.js`
- Modify: `src/app.js`
- Modify: `src/ui/editorView.js`
- Modify: `src/styles/app.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces `renderLibraryView(root, {scope,items,query,activeTag,onScope,onOpen,onNew,onSearch,onTags,onAppearance,onMore})`.
- Consumes `getSnippetTitle()` and `getSnippetPreview()`.
- `app.js` becomes the only owner of current screen/scope/query/activeTag/currentSnippet.

- [ ] **Step 1: Add failing E2E coverage for two-line rows, modified date, star, archive, and search**

Append this browser test:

```js
test('library is modified-first and supports star archive and search', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('First title\nFirst preview');
  await page.waitForTimeout(180);
  await page.getByTestId('library-button').click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Second title\nSecond preview');
  await page.waitForTimeout(180);
  await page.getByTestId('library-button').click();
  const rows = page.getByTestId('library-row');
  await expect(rows.nth(0)).toContainText('Second title');
  await expect(rows.nth(0)).toContainText('Second preview');
  await expect(rows.nth(0).locator('time')).toBeVisible();
  await rows.nth(0).click();
  await page.getByRole('button', { name: 'Star' }).click();
  await page.getByTestId('library-button').click();
  await page.getByRole('tab', { name: 'Starred' }).click();
  await expect(page.getByTestId('library-row')).toHaveCount(1);
  await page.getByTestId('library-row').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await page.getByTestId('library-button').click();
  await expect(page.getByTestId('library-row').filter({ hasText: 'Second title' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Archive' }).click();
  await expect(page.getByTestId('library-row')).toContainText('Second title');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByPlaceholder('Search snippets').fill('Second preview');
  await expect(page.getByTestId('library-row')).toHaveCount(1);
});
```

Run the test; expected FAIL until the Library task is implemented.

- [ ] **Step 2: Implement `libraryView.js` with the approved flat list treatment**

Each row must use this semantic structure:

```html
<button class="library-row" data-testid="library-row">
  <span class="library-title"></span>
  <span class="library-preview"></span>
  <span class="library-tags"></span>
  <time class="library-modified"></time>
</button>
```

At the top render a thin `role="tablist"` containing exactly Inbox / Starred / Archive. At the bottom render New / Tags / Search / Appearance / More. Do not render cards or a desktop sidebar.

- [ ] **Step 3: Wire navigation and state transitions in `app.js`**

Implement app methods:

```js
async function showEditor(id = null) { /* load id or blank and render editor */ }
async function showLibrary(scope = 'inbox') { /* list and render */ }
async function setStar(id, starred) { await updateSnippet(id, { starred }); }
async function setArchive(id, archived) { await updateSnippet(id, { archived }); }
```

When leaving an editor, flush the pending content write before querying Library. Opening a row calls `showEditor(id)`. New calls `showEditor(null)`.

- [ ] **Step 4: Implement a minimal inline search mode**

Tapping Search replaces the Library heading area with a single search field. Input updates `query` and refreshes the current scope using `listSnippets({scope,tag:activeTag,query})`. Escape or a clear button restores the non-search header. Search must include Markdown content and tag names.

- [ ] **Step 5: Add list styling and responsive parity**

Use thin `var(--hairline)` dividers, no row card background, title weight 600, muted preview/tags/time. Cap title and preview at one line each with ellipsis. Use the same full-screen list on mobile and desktop; desktop only increases max list width to about 860px.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
npm run test:e2e
```

Expected: PASS on desktop and mobile projects.

Commit:

```bash
git add src tests/e2e
 git commit -m "feat: add Snippets library views"
```

---

### Task 6: Add Global Tags, Tag Assignment Feedback, and Tagged Retrieval

**Files:**
- Create: `src/ui/tagSheet.js`
- Modify: `src/app.js`
- Modify: `src/ui/editorView.js`
- Modify: `src/ui/libraryView.js`
- Modify: `src/styles/app.css`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces `openTagSheet({mode,tags,assigned,onToggle,onCreate,onSelect,onClose})`.
- Editor mode toggles assignment on current snippet.
- Library mode selects a global tag and shows scope control All / Inbox / Starred / Archive.

- [ ] **Step 1: Add failing E2E tag tests**

Append this browser test:

```js
test('tags are visible and retrieve across normal locations', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Inbox note');
  await page.getByRole('button', { name: 'Tags' }).click();
  await page.getByPlaceholder('Search or create tag…').fill('macbeth');
  await page.getByRole('button', { name: 'Create “macbeth”' }).click();
  await page.getByRole('button', { name: 'Close tags' }).click();
  await page.getByTestId('library-button').click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Archived note');
  await page.getByRole('button', { name: 'Tags' }).click();
  await page.getByRole('checkbox', { name: 'macbeth' }).check();
  await page.getByRole('button', { name: 'Close tags' }).click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await page.getByTestId('library-button').click();
  await expect(page.getByTestId('library-row').first()).toContainText('macbeth');
  await page.getByRole('button', { name: 'Tags' }).click();
  await expect(page.getByRole('button', { name: /macbeth/ })).toContainText('2');
  await page.getByRole('button', { name: /macbeth/ }).click();
  await expect(page.getByTestId('library-row')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Archive' }).click();
  await expect(page.getByTestId('library-row')).toHaveCount(1);
  await expect(page.getByTestId('library-row')).toContainText('Archived note');
});
```

Run; expected FAIL until tag UI and tagged Library mode are implemented.

- [ ] **Step 2: Implement the editor tag sheet**

`tagSheet.js` must render as a bottom sheet below 700px and a centred popover above 700px. It includes:

- `input[placeholder="Search or create tag…"]`
- existing tags with checkmarks for assigned tags;
- `+ Create “name”` when the typed normalized tag does not exist;
- close on Escape, outside click, or downward swipe gesture on mobile.

- [ ] **Step 3: Ensure tagging a blank editor first creates the snippet only when there is content**

If the current editor is blank, the Tags control may open and browse tags, but assigning a tag must be disabled until content exists. Once the first character has created a snippet, tag toggles call `toggleSnippetTag(currentSnippet.id, name)` and immediately refresh the quiet tag line above the control strip.

- [ ] **Step 4: Implement global tagged Library mode**

When Library Tags selects a tag, set `activeTag`. Render a small tag heading and scope control with values `all`, `inbox`, `starred`, `archive`. Use `listSnippets({scope: taggedScope === 'all' ? 'all' : taggedScope, tag: activeTag, query})`.

Update `listSnippets()` so `scope: 'all'` includes every non-deleted snippet regardless of archived/starred state.

- [ ] **Step 5: Run tests and commit**

```bash
npm test
npm run test:e2e
```

Expected: PASS.

Commit:

```bash
git add src tests/e2e
 git commit -m "feat: add global tag workflow"
```

---

### Task 7: Add Appearance Settings and Configurable Launch Return Window

**Files:**
- Create: `src/ui/appearanceSheet.js`
- Modify: `src/app.js`
- Modify: `src/ui/editorView.js`
- Modify: `src/ui/libraryView.js`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/app.css`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces `openAppearanceSheet({preferences,onChange,onClose})`.
- Preference keys remain exactly `themeMode`, `editorFont`, `fontSize`, `returnWindow`.

- [ ] **Step 1: Add failing E2E tests for theme, font size, and return-window selection**

Append these browser tests:

```js
test('appearance settings persist theme and editor size', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.getByLabel('Font size').fill('22');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('editor-input')).toHaveCSS('font-size', '22px');
});

test('return window can force fresh or resume recent work', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Return window note');
  await page.waitForTimeout(180);
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByLabel('Return to last snippet').selectOption('fresh');
  await page.reload();
  await expect(page.getByTestId('editor-input')).toHaveText('');
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByLabel('Return to last snippet').selectOption('60s');
  await page.getByTestId('library-button').click();
  await page.getByTestId('library-row').filter({ hasText: 'Return window note' }).click();
  await page.reload();
  await expect(page.getByTestId('editor-input')).toContainText('Return window note');
});
```

Run; expected FAIL until appearance and launch-setting controls are implemented.

- [ ] **Step 2: Implement the appearance sheet with exact options**

Theme options: System / Light / Dark.

Font options and CSS stacks:

```js
export const EDITOR_FONTS = {
  'ia-writer-duo': '"iA Writer Duo", "iA Writer Duospace", ui-monospace, SFMono-Regular, Menlo, monospace',
  'open-sans': '"Open Sans", Arial, sans-serif',
  literata: '"Literata", Georgia, serif',
  bookerly: '"Bookerly", Georgia, serif',
  'ibm-plex-mono': '"IBM Plex Mono", ui-monospace, monospace',
  'roboto-mono': '"Roboto Mono", ui-monospace, monospace'
};
```

Font-size control: 14–26px in 1px steps, default 18px.

Return-window choices: Always start fresh / 30 seconds / 1 minute / 5 minutes / 15 minutes / Always return to last.

- [ ] **Step 3: Apply theme without launch flash and system-theme changes live**

When `themeMode === 'system'`, listen to `(prefers-color-scheme: dark)` and update `html.dataset.theme`. When a manual theme is selected, detach/ignore that media-query change. Continue mirroring only `themeMode` to localStorage for the pre-paint script; IndexedDB remains the primary preference store.

- [ ] **Step 4: Apply editor font and size without changing UI chrome**

Set CSS variables on the editor host:

```js
host.style.setProperty('--editor-font', EDITOR_FONTS[preferences.editorFont]);
host.style.setProperty('--editor-size', `${preferences.fontSize}px`);
```

Keep UI controls on the iA Writer Duo/Duospace UI stack.

- [ ] **Step 5: Run tests and commit**

```bash
npm test
npm run test:e2e
```

Expected: PASS.

Commit:

```bash
git add src tests/e2e
 git commit -m "feat: add Snippets appearance settings"
```

---

### Task 8: Add Pin/Archive/Delete More Menu, Trash, Sharing, and Copying

**Files:**
- Create: `src/ui/moreMenu.js`
- Create: `src/ui/trashView.js`
- Create: `src/ui/toast.js`
- Modify: `src/app.js`
- Modify: `src/ui/editorView.js`
- Modify: `src/ui/libraryView.js`
- Modify: `src/domain/snippetText.js`
- Modify: `tests/e2e/snippets.spec.js`

**Interfaces:**
- Produces `openMoreMenu({context,snippet,onAction,onClose})`.
- Produces `renderTrashView(root,{items,onRestore,onDeletePermanently,onBack})`.
- Produces `shareSnippet(snippet): Promise<'shared'|'copied'>` within `app.js` or a small local helper.

- [ ] **Step 1: Add failing E2E tests for pin priority, Trash restore, permanent delete, and copy fallback**

Append these browser tests:

```js
test('pin overrides fresh launch and only one snippet stays pinned', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Pinned A');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Pin' }).click();
  await page.getByTestId('library-button').click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Pinned B');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Pin' }).click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByLabel('Return to last snippet').selectOption('fresh');
  await page.reload();
  await expect(page.getByTestId('editor-input')).toContainText('Pinned B');
});

test('delete moves to Trash and restore returns the snippet', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('editor-input').click();
  await page.keyboard.type('Recover me');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Trash' }).click();
  await expect(page.getByTestId('trash-row')).toContainText('Recover me');
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByTestId('library-row')).toContainText('Recover me');
});
```

For share fallback, inject a clipboard spy before loading the app and assert the `Copied` toast after Share.

Run; expected FAIL until pin/Trash/share workflows are implemented.

- [ ] **Step 2: Implement `moreMenu.js` with context-sensitive actions**

Editor menu order:

1. Pin / Unpin
2. Archive / Unarchive
3. Copy
4. Copy Markdown
5. Delete
6. Settings

Library More menu:

1. Trash
2. Settings

Do not expose Trash as a primary tab.

- [ ] **Step 3: Implement Trash full-screen secondary view**

`trashView.js` lists title, preview, deleted date, and two row actions: Restore and Delete Permanently. Permanent delete requires a confirmation dialog. Trash has a Back control returning to the previous Library scope.

On app bootstrap, `purgeExpiredTrash()` already removes items at or beyond 30 days.

- [ ] **Step 4: Implement sharing and copy semantics**

Use:

```js
async function shareSnippet(snippet) {
  if (navigator.share) {
    await navigator.share({ text: snippet.content });
    return 'shared';
  }
  await navigator.clipboard.writeText(snippet.content);
  return 'copied';
}
```

`Copy Markdown` copies `snippet.content` exactly. `Copy` uses `toPlainText(snippet.content)` so Markdown markers are removed while URLs remain literal URLs.

If native Share throws an error other than `AbortError`, fall back to copying Markdown and show a quiet toast.

- [ ] **Step 5: Implement pin/archive/delete actions through repositories**

Pin calls `setPinnedSnippet(currentSnippet.id)`; Unpin calls `setPinnedSnippet(null)` only if the current snippet is pinned. Archive updates `{archived:true}`; Unarchive updates `{archived:false}`. Delete calls `moveToTrash(id)` and returns to Library Inbox.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
npm run test:e2e
```

Expected: PASS.

Commit:

```bash
git add src tests/e2e
 git commit -m "feat: add pin trash and sharing workflows"
```

---

### Task 9: Final Responsive Polish, Accessibility, Error Handling, and Release Verification

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/app.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/app.js`
- Modify: `src/ui/toast.js`
- Modify: `tests/e2e/snippets.spec.js`
- Create: `README.md`

**Interfaces:**
- No new public interfaces. This task hardens the approved prototype behavior.

- [ ] **Step 1: Add final E2E acceptance tests at mobile and desktop widths**

Append this responsive acceptance test; Playwright will execute it in both configured projects:

```js
test('responsive shell keeps the same bottom-strip interaction model', async ({ page }) => {
  await page.goto('/');
  const strip = page.getByTestId('control-strip');
  await expect(strip).toBeVisible();
  const box = await strip.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport.height - (box.y + box.height)).toBeLessThan(48);
  for (const button of await strip.getByRole('button').all()) {
    const b = await button.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('library-button').click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
```

Also append a blank-erasure acceptance test:

```js
test('erasing all content and leaving removes the snippet', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByTestId('editor-input');
  await editor.click();
  await page.keyboard.type('temporary');
  await page.waitForTimeout(180);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Backspace');
  await page.getByTestId('library-button').click();
  await expect(page.getByTestId('library-row')).toHaveCount(0);
});
```

Run tests; any remaining failures now identify concrete polish gaps.

- [ ] **Step 2: Harden save flushing and storage-error recovery**

In `app.js`, replace the bare timer with `pendingMarkdown` + `flushSave()` so navigation, `pagehide`, and `visibilitychange` flush pending content. Wrap repository writes in `try/catch`; on failure call `showToast('Could not save — text is still on screen')` without clearing editor state.

- [ ] **Step 3: Finalize visual tokens and focus/accessibility states**

Ensure:

- all interactive controls have visible `:focus-visible` rings using text/muted greys rather than accent colors;
- `prefers-reduced-motion: reduce` disables sheet/popover transitions;
- control-strip buttons are at least 44×44px;
- desktop editor max width remains 760px and Library max width remains 860px;
- sheets use safe-area padding on iOS;
- background/text contrast remains readable in both themes;
- no bright accent color is introduced.

- [ ] **Step 4: Write the prototype README**

Create `README.md` with exactly these sections:

```markdown
# Snippets

Working local prototype of a minimal Markdown-first capture app.

## Run locally
npm install
npm run dev

## Test
npm test
npm run test:e2e

## Build
npm run build

## Prototype storage
All snippet data is stored in browser IndexedDB. Clearing site data deletes prototype data.

## Deferred from this prototype
Supabase authentication/sync and the web-capture bookmarklet are intentionally not implemented yet.
```

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
npm test
npm run test:e2e
npm run build
```

Expected:

- Unit suite: PASS
- Desktop E2E: PASS
- Mobile E2E: PASS
- Vite production build: PASS with output in `dist/`

- [ ] **Step 6: Manually smoke-test the essential Drafts-like flow**

In Chromium desktop and a mobile-sized viewport:

1. Load Snippets and verify the cursor lands in the editor.
2. Type two lines; wait 200ms; open Library.
3. Verify the first line is title, second is preview, and modified time appears.
4. Add a tag and verify it appears quietly on the row.
5. Star the snippet; verify it remains in Inbox and appears in Starred.
6. Archive it; verify it leaves Inbox and appears in Archive.
7. Open it, add `- [ ] test`, check it, and verify strike-through.
8. Pin it; set launch to Always start fresh; reload and verify the pin wins.
9. Delete it; restore from Trash; verify content/tags/star state survive.
10. Switch Light/Dark/System and two editor fonts.
11. Share/copy and verify the original URL text remains usable when present.

- [ ] **Step 7: Commit the verified prototype**

```bash
git add .
 git commit -m "feat: complete Snippets working prototype"
```

---

## Plan Self-Review

### Spec coverage

- Immediate capture/autosave: Tasks 3 and 9.
- Inbox/Starred/Archive: Task 5.
- Global tags and tag filtering: Task 6.
- Markdown/highlighting/interactive todos/reordering: Task 4.
- Themes/fonts/sizes/dark mode: Task 7.
- Sharing/copying: Task 8.
- Search: Task 5.
- One pinned snippet + return window: Tasks 2, 7, 8.
- Trash/restore/30-day purge: Tasks 2 and 8.
- Mobile/desktop parity and minimal greyscale UI: Tasks 1 and 9.
- Local persistence and Supabase-ready repository boundaries: Task 2.
- Web capture: intentionally deferred exactly as permitted by the approved prototype spec.

### Placeholder scan

No implementation step depends on TBD/TODO placeholders. CodeMirror decoration mechanics are constrained to explicit behaviors and interfaces; implementation is isolated in Task 4.

### Type/name consistency

- Snippet timestamps are numeric milliseconds throughout.
- Stored tags are normalized string names throughout.
- Preference keys remain `themeMode`, `editorFont`, `fontSize`, `returnWindow` throughout.
- Scope values are `inbox`, `starred`, `archive`, `trash`, and internal tagged `all`.
- Repository names used by later tasks match Task 2 exports.

