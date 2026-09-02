# Snippets v0.4.9 — Authentication and Editor Structure Design

**Date:** 2026-09-02

## Goal

Make Snippets reliable as an installed iPhone/iPad PWA by adding direct email-and-password sign-in, and correct the editor DOM so native text selection can cross todo/list lines without selecting drag handles, checkboxes, or decorative markers. Tighten tag-chip spacing as part of the same visual pass.

## Scope

v0.4.9 contains exactly three user-facing changes:

1. Email + password becomes the primary signed-out login method, while the existing email-link method remains available as a secondary fallback.
2. The editor is restructured so text selection operates only on text content; todo controls and list decoration are rendered outside the editable/selectable text surface.
3. Tag chips in the tag-assignment sheet are visually closer together.

No database schema, RLS, allowlist, bookmarklet, library, preservation, or launch-policy changes are included.

## Authentication Design

### Signed-out screen

The signed-out view will show:

- Email field
- Password field
- Primary **Sign in** button
- Secondary **Email me a sign-in link** action

The primary path uses Supabase `auth.signInWithPassword({ email, password })`.

The secondary path preserves the current `signInWithOtp` / magic-link behavior for browser use and recovery situations. It is not presented as the preferred path on an installed iPhone/iPad PWA because the link opens in Safari and does not transfer the local-storage session into the standalone PWA.

### Set or change password

While authenticated, Snippets Settings gains an **Account** section containing **Set/Change Password**.

The action:

- asks for a new password and confirmation,
- requires both fields to match,
- calls `supabase.auth.updateUser({ password })`,
- reports success or the Supabase error in the existing sheet/toast style,
- does not sign the user out after a successful change.

Because Snippets already prevents account creation with `shouldCreateUser: false` and uses the existing project allowlist/RLS, password sign-in does not introduce self-service registration.

### Shared Supabase project

Snippets continues to use the existing Ticking Supabase project. No Auth template, SMTP, redirect, RLS, or database-policy changes are required for this feature.

## Editor Structure Design

### Current problem

v0.4.7/v0.4.8 uses one `contenteditable` editor root, but todo drag handles, checkboxes, and bullet markers remain DOM children inside that root. Desktop browsers often tolerate this, but iOS Safari includes those non-text descendants when a selection range crosses multiple lines, producing large rectangular highlights and unstable selection handles.

### New structure

The editor will keep one continuous text-editing surface, but interactive/decorative controls will be physically outside it.

Conceptually each visual line becomes two aligned layers:

- **Control gutter** — non-selectable, non-editable UI for todo drag handles, todo checkboxes, and list markers.
- **Text surface** — the continuous selectable/editable content used for native selection, cursor movement, Markdown editing, and clipboard operations.

The control gutter must never be a descendant of the `contenteditable` node.

The text surface remains the authoritative source for selection geometry. Selection ranges therefore contain only text nodes and text-line wrappers.

### Todo behavior

Todo lines retain the Markdown source format:

- `- [ ] item`
- `- [x] item`

The visible checkbox lives in the control gutter. Toggling it updates the corresponding source line and re-renders completion styling.

Completed todo text remains struck through.

Todo drag handles remain usable. Reordering moves the underlying source line in the document and then re-renders both text and gutter from the same line index mapping.

### Bullet/list markers

Bullet/list markers are decorative gutter elements and are not selectable text. Their Markdown prefix remains part of the source model even when hidden in rendered mode.

### Markdown editing behavior

The existing rule remains:

- only the actively edited line exposes raw Markdown syntax,
- inactive lines render formatted Markdown,
- leaving a line returns it to rendered form.

The architecture change must not remove headings, emphasis, inline code, highlights, links, fenced-code behavior, todos, or keyboard formatting shortcuts.

### Selection behavior

The editor must support:

- drag selection from one hard-newline line into another,
- selection across todo and non-todo lines,
- Cmd/Ctrl-A selecting the whole snippet text,
- copy/cut across multiple lines,
- replacing a cross-line selection by typing or pasting,
- natural caret movement with arrow/Home/End keys.

Native selection must not highlight checkbox controls, drag handles, or decorative markers.

## Tag Spacing Design

The tag-assignment sheet currently spaces tag rows/chips too loosely. v0.4.9 will tighten the visual grouping without reducing tap targets.

- Text/chip spacing is reduced so adjacent tags read as one compact group.
- Checkbox hit areas remain comfortably tappable.
- The search field and overall sheet geometry remain unchanged.

The intended visual change is compactness, not smaller controls.

## Files Expected to Change

- `src/auth/authView.js` — signed-out email/password UI and magic-link fallback.
- `src/main.js` — `signInWithPassword`, existing link fallback, and authenticated password-update callbacks.
- `src/ui/moreMenu.js` and/or the existing Settings-sheet implementation — Account entry point.
- A focused account/password sheet module if the existing sheet code would otherwise become overloaded.
- `src/editor/markdownEditor.js` — split control gutter from continuous editable text surface while preserving source mapping and todo reorder behavior.
- `src/styles/app.css` — editor gutter/text geometry and tag spacing.
- `src/styles/responsive.css` — only if the new gutter needs phone/tablet-specific sizing.
- `src/version.js`, `package.json`, `sw.js`, `README.md` — release/version/cache documentation.
- Unit tests covering auth, editor DOM invariants, selection/source mapping, and tag spacing.

## Error Handling

### Authentication

- Wrong password: leave email populated, keep user on login screen, show the Supabase error in the existing auth error area.
- Password update mismatch: reject locally before calling Supabase.
- Password update failure: keep Settings open and show the error; do not destroy the current session.
- Magic-link fallback failure: preserve current error behavior.

### Editor

The editor continues to save the Markdown source as it does now. Control-gutter failures must never mutate text independently of the source model. Checkbox and drag operations update the source model first, then re-render.

## Testing Requirements

Implementation follows TDD. New tests must fail before production changes are made.

### Authentication tests

- Signed-out view renders email and password inputs and a primary Sign in button.
- Password sign-in calls the provided password-login callback with the entered credentials.
- Magic-link fallback remains available and invokes the existing email-link callback.
- Authenticated password update rejects mismatched confirmations locally.
- Authenticated password update invokes `updateUser({ password })` through the app callback.

### Editor tests

- The `contenteditable` node contains text-line content but no checkbox input, todo drag-handle button, or decorative list-marker element.
- Todo gutter controls map to the same source-line indices as their text lines.
- Checkbox toggling still produces `- [x]` / `- [ ]` in Markdown source.
- Todo reorder still moves the correct Markdown source line.
- Existing cross-line selection/source-replacement tests remain green.
- Existing Markdown rendering and keyboard shortcut tests remain green.

### Style tests

- Tag assignment rows/chips use tighter spacing while preserving minimum touch-target dimensions.
- Editor gutter and text surface stay aligned at phone/tablet and desktop breakpoints.

### Release verification

Before packaging:

- full unit suite passes,
- production build succeeds,
- JavaScript syntax checks pass,
- packaged repository is re-tested,
- ZIP integrity checks pass.

The existing sandbox Chromium harness limitation (`NO SUMMARY` before the test page loads) must be reported separately if it persists; it must not be mislabeled as a passing browser test.

## Non-goals

v0.4.9 does not:

- set up custom SMTP,
- change Supabase email templates,
- create new users,
- alter Snippets RLS/allowlist policies,
- add password-reset-by-email UX,
- change bookmarklets,
- redesign the library,
- alter mobile launch-to-blank behavior,
- change editor font-size defaults,
- add new Markdown features.

## Acceptance Criteria

v0.4.9 is acceptable when:

1. A user who has set a password can sign into an installed iPhone/iPad PWA directly with email + password, without opening Safari.
2. A signed-in user can set/change that password from Snippets Settings.
3. Magic-link sign-in remains available as a secondary browser fallback.
4. iOS text selection can cross todo/list and ordinary text lines without selecting or highlighting todo controls/markers.
5. Todo completion, todo reordering, Markdown rendering/editing, copy/cut/paste, and whole-document selection still work.
6. The tag-assignment sheet is visibly more compact while preserving usable tap targets.
