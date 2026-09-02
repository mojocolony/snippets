# Snippets v0.4.9 Authentication and Editor Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Snippets v0.4.9 with direct email/password PWA sign-in, in-app password setting, a continuous text-only editable surface whose todo/list controls live outside `contenteditable`, and tighter tag rows.

**Architecture:** Keep the existing Supabase project, allowlist, RLS, storage, and snippet source model unchanged. Authentication gains password callbacks at the existing `main.js` → `createApp`/auth-view boundaries. The editor host becomes a non-editable layout container with one child `.editor-text-surface[contenteditable=true]` plus a sibling absolute `.editor-control-gutter`; both are rendered from the same Markdown line-index model, and gutter positions are synchronized from the text-line geometry.

**Tech Stack:** Vanilla ES modules, Supabase JS client, IndexedDB repositories, Node built-in test runner, static GitHub Pages/PWA assets.

**Spec:** `docs/superpowers/specs/2026-09-02-snippets-v049-auth-editor-design.md`

## Global Constraints

- v0.4.9 contains exactly: password auth/settings, editor control-gutter restructuring, and tighter tag spacing.
- No database schema, RLS, allowlist, SMTP, email-template, bookmarklet, launch-policy, or font-default changes.
- Password login uses existing Supabase user accounts only; no signup UI is added.
- Magic-link login remains available as a secondary browser fallback.
- Todo and bullet controls/markers must never be descendants of the `contenteditable` element.
- Markdown source format and existing todo reorder/toggle semantics remain unchanged.
- Existing browser-harness `NO SUMMARY` limitation is reported separately if it persists.

---

### Task 1: Password-first authentication and Settings password update

**Files:**
- Modify: `src/auth/authView.js`
- Modify: `src/main.js`
- Modify: `src/app.js`
- Modify: `src/ui/appearanceSheet.js`
- Create: `src/auth/passwordChange.js`
- Modify: `src/styles/app.css`
- Test: `tests/unit/authView.test.js`
- Create: `tests/unit/revision49.test.js`

**Interfaces:**
- `renderAuthView(root, { onPasswordSignIn, onRequestLink, initialError })`
- `createApp(root, { onSignOut, onChangePassword })`
- `openAppearanceSheet({ preferences, onChange, onChangePassword, onClose })`
- `validatePasswordChange(password, confirmation) -> { ok: boolean, error?: string }`

- [ ] **Step 1: Write failing auth tests**

Add source/UI contract tests requiring the signed-out view to contain `type="email"`, `type="password"`, primary `Sign in`, secondary `Email me a sign-in link`, and callbacks named `onPasswordSignIn` and `onRequestLink`. Add a main-source assertion for `signInWithPassword` and `updateUser({ password })`. Add pure tests for `validatePasswordChange()` rejecting blank/mismatched values and accepting matching non-empty values.

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
node --test tests/unit/authView.test.js tests/unit/revision49.test.js
```

Expected: failures because password-first callbacks/UI and password-change helper do not exist yet.

- [ ] **Step 3: Implement password-first signed-out UI**

Change `renderAuthView` default mode to password sign-in. Render email and password inputs in one form, with primary `Sign in`. Add a secondary button `Email me a sign-in link`; clicking it sends the current email through `onRequestLink(email)` and switches to a simple “Check your email” state with a “Use email and password” return action. Do not expose the obsolete six-digit-code UI in the primary flow.

- [ ] **Step 4: Wire Supabase password sign-in in `main.js`**

In `showAuth`, provide:

```js
onPasswordSignIn: async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) await openAuthenticated(data.session);
},
onRequestLink: async email => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: appBaseUrl(), shouldCreateUser: false }
  });
  if (error) throw error;
}
```

Preserve the existing persisted-session boot path and access check.

- [ ] **Step 5: Add password-change validation and Settings account UI**

Create `src/auth/passwordChange.js`:

```js
export function validatePasswordChange(password, confirmation) {
  const value = String(password ?? '');
  if (!value) return { ok: false, error: 'Enter a new password.' };
  if (value !== String(confirmation ?? '')) return { ok: false, error: 'Passwords do not match.' };
  return { ok: true };
}
```

Extend `openAppearanceSheet` (retitled `Settings`) with an **Account** section containing new-password and confirm-password fields plus a `Set/Change Password` button. Validate locally, call `onChangePassword(password)`, leave the session active, clear the fields on success, and show inline success/error copy.

- [ ] **Step 6: Pass password-change callback through `createApp`**

Extend `createApp(root, { onSignOut, onChangePassword })`; pass it into `openAppearanceSheet`. In `main.js`, supply:

```js
onChangePassword: async password => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
```

No auth template or database changes.

- [ ] **Step 7: Run targeted auth tests and verify GREEN**

Run the same targeted command; expect all auth/revision49 tests to pass.

---

### Task 2: Separate the editable text surface from todo/list controls

**Files:**
- Modify: `src/editor/markdownEditor.js`
- Modify: `src/styles/app.css`
- Modify: `src/styles/responsive.css` only if gutter sizing needs breakpoint-specific values
- Modify: `tests/unit/editorSurfaceStyles.test.js`
- Modify: `tests/unit/revision49.test.js`
- Re-run: `tests/unit/editorState.test.js`, `tests/unit/markdownHelpers.test.js`, `tests/unit/revision47.test.js`

**Interfaces:**
- `mountMarkdownEditor(host, options)` public return shape remains unchanged.
- Internally `host` becomes a non-editable `.markdown-editor` container.
- New child `.editor-text-surface` is the sole `contenteditable="true"` node.
- New sibling `.editor-control-gutter` contains `.editor-gutter-item` controls keyed by `data-line-index`.

- [ ] **Step 1: Write failing DOM-structure/source tests**

Add tests requiring `markdownEditor.js` to create `.editor-text-surface` and `.editor-control-gutter`, set `surface.contentEditable = 'true'`, and never append `.todo-handle`, `.todo-check`, or `.bullet-marker` to the editable surface. Require gutter controls to carry the same `data-line-index` as text lines.

- [ ] **Step 2: Add failing style tests**

Require `.markdown-editor { position: relative; }`, `.editor-control-gutter { position: absolute; pointer-events: none; user-select: none; }`, interactive gutter controls to re-enable pointer events, and text lines to reserve left padding for todo/bullet controls while retaining full-width ordinary lines.

- [ ] **Step 3: Run editor-targeted tests and verify RED**

Run:

```bash
node --test tests/unit/editorSurfaceStyles.test.js tests/unit/revision47.test.js tests/unit/revision49.test.js tests/unit/editorState.test.js tests/unit/markdownHelpers.test.js
```

Expected: new structure/style assertions fail on the v0.4.8 architecture.

- [ ] **Step 4: Introduce the text surface and gutter containers**

At mount:

```js
host.classList.add('markdown-editor');
const gutter = document.createElement('div');
gutter.className = 'editor-control-gutter';
gutter.setAttribute('aria-hidden', 'false');
const surface = document.createElement('div');
surface.className = 'editor-text-surface';
surface.dataset.testid = 'editor-input';
surface.setAttribute('role', 'textbox');
surface.setAttribute('aria-multiline', 'true');
surface.contentEditable = 'true';
surface.spellcheck = true;
host.replaceChildren(gutter, surface);
```

Move all selection/caret/input/keydown/paste/copy/cut/beforeinput/blur listeners and containment checks from `host` to `surface`.

- [ ] **Step 5: Render text lines only inside the editable surface**

Refactor line rendering so `.editor-line-text` is the rendered line element inside `surface`. Give it `data-line-index`, type classes (`editor-line--todo`, `editor-line--bullet`, etc.), completion/heading/editing classes, and text/HTML exactly as before. No checkbox, drag handle, or marker nodes are appended beneath `surface`.

- [ ] **Step 6: Render gutter controls from the same line-index model**

Create a gutter item for each todo or bullet line. Todo items contain the drag handle and checkbox, both marked with the source line index. Bullet items contain only the decorative marker. Checkbox change calls `toggleTodoAtLine(doc, index)` before render/notify. Drag completion calls `moveLine(doc, from, to)` before render/notify.

- [ ] **Step 7: Synchronize gutter geometry to wrapped text lines**

After each render, schedule `syncGutterGeometry()` in `requestAnimationFrame`. For every gutter item, read its corresponding text line’s `offsetTop` and `offsetHeight`, then set gutter item `top` and `height`. Add a `ResizeObserver(surface)` when available (plus a `window.resize` fallback listener) so wrapped text stays aligned after viewport/font changes. Disconnect/remove observers on destroy.

- [ ] **Step 8: Update todo drag target lookup**

Replace `.editor-line` DOM hit-testing with a helper that maps `clientY` to the closest `.editor-line-text` bounding rectangle and returns its `data-line-index`. Keep `canReorderTodo()` as the gate so a drag can only cross contiguous todo lines.

- [ ] **Step 9: Preserve selection/source mapping behavior**

Update `spanForNode`, `selectionLineInfo`, `rangeLineInfo`, whole-document selection, `setCaretForLine`, `renderLine`, and link handling to operate on `surface`. Keep `displayOffsetToEditable`, `replaceCrossLineSelection`, Markdown keyboard shortcuts, Enter/Backspace, multi-line paste, copy/cut, and active-line rendering semantics unchanged.

- [ ] **Step 10: Update CSS for separate layers**

Make `.markdown-editor` relative. Style `.editor-text-surface` as the width/min-height/font-bearing editable node. Replace grid-column rules with per-line left padding: todo text reserves about 60px, bullet text about 24px; ordinary/heading/quote lines remain full width. Position `.editor-control-gutter` at `inset: 0 auto 0 0` with sufficient width, `pointer-events:none`, `user-select:none`, and absolute `.editor-gutter-item`s. Re-enable `pointer-events:auto` only on `.todo-handle`/`.todo-check`.

- [ ] **Step 11: Run editor-targeted tests and verify GREEN**

Run the Step 3 command. Expect all targeted tests green.

---

### Task 3: Tighten tag-assignment rows and prepare v0.4.9 release metadata

**Files:**
- Modify: `src/styles/app.css`
- Modify: `tests/unit/revision49.test.js`
- Modify: `src/version.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `sw.js`
- Modify: `README.md`

**Interfaces:**
- Existing `.tag-sheet-list` markup remains unchanged.
- Release version becomes `0.4.9`; service-worker cache becomes `snippets-r4-9`.

- [ ] **Step 1: Add failing tag-spacing/release tests**

Require `.tag-sheet-list .sheet-row` to use a visibly tighter row geometry than v0.4.8 (target `min-height: 34px`, `padding: 2px 11px`, no positive inter-row margin), while checkbox dimensions remain explicit and usable. Require `APP_VERSION = '0.4.9'`, package/lock versions `0.4.9`, and cache `snippets-r4-9`.

- [ ] **Step 2: Run revision49 test and verify RED**

Run:

```bash
node --test tests/unit/revision49.test.js
```

Expected: spacing/version/cache assertions fail.

- [ ] **Step 3: Tighten tag rows**

Set:

```css
.tag-sheet-list .sheet-row { min-height: 34px; padding: 2px 11px; }
.tag-sheet-list .sheet-row + .sheet-row { margin-top: 0; }
.tag-sheet-list input[type="checkbox"] { width: 20px; height: 20px; }
```

Keep the search field and sheet dimensions unchanged.

- [ ] **Step 4: Bump v0.4.9 metadata and docs**

Update `src/version.js`, `package.json`, `package-lock.json`, `sw.js`, and README feature/status notes to v0.4.9. Document password-first sign-in and the text-only selection surface; explicitly note that magic links remain fallback and no SMTP change is required.

- [ ] **Step 5: Run revision49 test and verify GREEN**

Run the Step 2 command and expect pass.

---

### Task 4: Full verification and packaging

**Files:**
- Generated: `/mnt/data/Snippets-GitHub-repo-v0.4.9.zip`
- Generated: `/mnt/data/Snippets-v0.4.9-update.zip`

**Interfaces:** None; release verification only.

- [ ] **Step 1: Run the full unit suite**

```bash
npm run test:unit
```

Expected: zero failures.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: exit 0 and refreshed `dist/`.

- [ ] **Step 3: Run JavaScript syntax checks**

```bash
find src tests scripts -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

Expected: exit 0.

- [ ] **Step 4: Run the browser harness and report its status separately**

```bash
npm run test:browser
```

If it still exits with the pre-page-load `NO SUMMARY` harness error, record that exact limitation and do not claim browser tests pass.

- [ ] **Step 5: Build clean release copies**

Create a full repository copy without transient working metadata and a drop-in update containing all files changed from v0.4.8 plus generated `dist/` assets needed for GitHub Pages deployment.

- [ ] **Step 6: Re-test the packaged repository**

From the packaged repo directory, rerun unit tests, build, and JS syntax checks. Verify `git diff`/file comparison against the intended source if applicable.

- [ ] **Step 7: Verify ZIP integrity**

```bash
unzip -t /mnt/data/Snippets-GitHub-repo-v0.4.9.zip
unzip -t /mnt/data/Snippets-v0.4.9-update.zip
```

Expected: no errors.
