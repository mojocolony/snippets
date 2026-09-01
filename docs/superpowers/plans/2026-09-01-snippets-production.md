# Snippets Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved local Snippets prototype into a GitHub Pages-ready personal app with persistent Supabase passwordless authentication, cross-device sync, local cache, and basic web capture.

**Architecture:** Keep the existing vanilla HTML/CSS/JavaScript UI and IndexedDB repositories. Add a small Supabase integration layer: authentication gates app startup, local writes remain immediate, cloud writes are queued/retried, and authenticated startup reconciles local and remote state. The shared Ticking Supabase project is used only through `snippets_*` tables protected by RLS.

**Tech Stack:** Vanilla ES modules, IndexedDB, Supabase JS 2.x from a browser ESM CDN, Supabase Auth/Postgres, GitHub Pages, Web App Manifest/service worker.

**Spec:** `docs/superpowers/specs/2026-09-01-snippets-prototype-design.md`

## Global Constraints

- Preserve the approved prototype UI and interaction model.
- Use `public.snippets_items`, `public.snippets_tags`, and `public.snippets_preferences` only; do not read or write other app tables.
- All cloud rows are scoped by authenticated `user_id` and protected by RLS.
- Keep local editing immediate; cloud failures must not erase on-screen/local text.
- Authentication must persist across launches.
- Support a six-digit email OTP when the shared Supabase email template contains `{{ .Token }}`; also tolerate the existing magic-link flow.
- Do not bundle or redistribute Bookerly or iA Writer font files; use local font lookup/fallbacks.
- Production URL target: `https://mojocolony.github.io/snippets/`.

---

### Task 1: Cloud model and sync queue

**Files:**
- Create: `src/cloud/cloudModels.js`
- Create: `src/cloud/syncQueue.js`
- Modify: `src/storage/db.js`
- Modify: `src/storage/snippetRepository.js`
- Modify: `src/storage/tagRepository.js`
- Modify: `src/storage/preferencesRepository.js`
- Test: `tests/unit/cloudModels.test.js`
- Test: `tests/unit/syncQueue.test.js`

**Interfaces:**
- Produces `snippetToRow(snippet,userId)`, `rowToSnippet(row)`, `preferencesToRow(preferences,userId)`, `rowToPreferences(row)`.
- Produces `enqueueSyncOperation(operation)`, `listSyncOperations()`, `removeSyncOperation(id)`.

- [ ] Write failing model mapping tests.
- [ ] Run targeted tests and verify failure.
- [ ] Implement mappings.
- [ ] Add IndexedDB `syncQueue` store and failing queue tests.
- [ ] Run targeted tests and verify failure.
- [ ] Implement queue helpers and repository enqueue calls.
- [ ] Run unit suite.
- [ ] Commit.

### Task 2: Supabase authenticated sync

**Files:**
- Create: `src/cloud/supabaseClient.js`
- Create: `src/cloud/cloudSync.js`
- Create: `src/cloud/cacheOwner.js`
- Test: `tests/unit/cloudSync.test.js`
- Test: `tests/unit/cacheOwner.test.js`

**Interfaces:**
- Produces `supabase` client.
- Produces `prepareCacheForUser(userId)`, `flushCloudQueue(client,userId)`, `pullCloudState(client,userId)`, `initialCloudSync(client,userId)`.

- [ ] Write failing queue-flush and row-fetch tests with a deterministic fake client.
- [ ] Verify failures.
- [ ] Implement cloud mutation execution and remote pull.
- [ ] Write cache-owner isolation tests.
- [ ] Implement first-user migration and cross-user cache clearing.
- [ ] Run unit suite.
- [ ] Commit.

### Task 3: Passwordless login gate and sign out

**Files:**
- Create: `src/auth/authView.js`
- Modify: `src/main.js`
- Modify: `src/app.js`
- Modify: `src/styles/app.css`
- Modify: `src/styles/responsive.css`
- Test: `tests/unit/authView.test.js`

**Interfaces:**
- `renderAuthView(root,{onRequestCode,onVerify})` renders email and code states.
- `createApp(root,{onSignOut})` adds unobtrusive Sign out in More.

- [ ] Write failing auth markup/state test.
- [ ] Verify failure.
- [ ] Implement minimal greyscale login/code UI.
- [ ] Gate app startup using persisted Supabase session.
- [ ] Request email via `signInWithOtp`; verify six-digit code via `verifyOtp`.
- [ ] Handle magic-link session callbacks through normal Supabase URL/session detection.
- [ ] Add sign out action and cleanup.
- [ ] Run unit suite.
- [ ] Commit.

### Task 4: Capture links and selected text

**Files:**
- Create: `src/capture/captureParams.js`
- Modify: `src/main.js`
- Create: `bookmarklets.html`
- Test: `tests/unit/captureParams.test.js`

**Interfaces:**
- `parseCaptureUrl(url)` returns `{markdown, sourceUrl}` or null.

- [ ] Write failing URL/selection capture parsing tests.
- [ ] Verify failure.
- [ ] Implement capture parsing and safe URL cleanup.
- [ ] On authenticated startup, create captured snippet locally before launching editor.
- [ ] Add simple bookmarklet helper page for Link and Selection capture.
- [ ] Run unit suite.
- [ ] Commit.

### Task 5: PWA and GitHub Pages packaging

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `assets/icon.svg`
- Create: `.nojekyll`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: `scripts/build.js`
- Test: `tests/unit/productionAssets.test.js`

**Interfaces:**
- App registers service worker on HTTPS/localhost.
- Manifest uses relative/start URL compatible with `/snippets/` GitHub Pages subpath.

- [ ] Write failing production asset tests.
- [ ] Verify failures.
- [ ] Add manifest, service worker, icon, `.nojekyll`, and registration.
- [ ] Document Supabase shared-backend isolation and deployment steps.
- [ ] Run full unit suite, build, and JS syntax checks.
- [ ] Package deployment-ready source.
- [ ] Commit.

### Task 6: Backend verification and deployment handoff

**Files:**
- No source files required unless verification exposes a defect.

- [ ] Verify `snippets_*` tables and RLS policies in Supabase.
- [ ] Run Supabase security advisor and ensure no Snippets-specific findings.
- [ ] Verify final local git status and full tests/build.
- [ ] If a GitHub write integration is unavailable, package the complete repository and give the user the minimum manual GitHub repository-creation/push step; do not claim deployment occurred.
