# Snippets

Snippets is a personal, capture-first Markdown app: immediate writing, Inbox / Starred / Archive, global tags, interactive todos, pinning, dark mode, keyboard shortcuts, sharing, and browser capture.

## Production architecture

- **Frontend:** static vanilla HTML/CSS/JavaScript, designed for GitHub Pages.
- **Production URL target:** `https://mojocolony.github.io/snippets/`
- **Backend:** the existing Supabase project named **Ticking** (`appesztafatypbxzdunr`), shared with other personal apps.
- **Snippets isolation:** Snippets uses `snippets_items`, `snippets_tags`, `snippets_preferences`, and the access-control table `snippets_access`. Content tables require both `auth.uid() = user_id` and membership in the Snippets allowlist. No Snippets code reads or writes Ticking, Fetch, Podstream, or other application tables.
- **Auth session isolation:** Supabase Auth uses the browser storage key `snippets-auth`, so signing out of Snippets does not intentionally reuse another app's local session token even though the Supabase Auth user directory is shared.
- **Local cache:** IndexedDB database `snippets`; writes happen locally first and are queued to Supabase.

The publishable Supabase browser key in `src/cloud/supabaseClient.js` is intentionally public and relies on RLS. Never place a service-role key or other private secret in this repository.

## Authentication

Snippets uses the existing Supabase Auth user in the shared **Ticking** project and never offers self-service signup. Email + password is the primary sign-in method so an installed iPhone/iPad PWA can authenticate directly without handing the session to Safari. The signed-out screen keeps **Email me a sign-in link** as a secondary browser fallback and still sets `shouldCreateUser: false`. A signed-in Supabase user must also be present in `snippets_access` before the app opens. Authenticated users can set or change their password from **Settings → Account**; Snippets calls `auth.updateUser({ password })` and keeps the current session active. No custom SMTP or Auth-template change is required.

## Development

```bash
npm test
npm run build
python3 -m http.server 8765
```

Open `http://localhost:8765/`.

## Web capture

After deployment, open `bookmarklets.html` and drag one or more bookmarklets to the browser bar:

- **Save Link** — page title + URL
- **Save Selection** — selected text + source
- **Save Page Text** — transfers the page's text via `postMessage`, avoiding URL-length limits

## GitHub Pages deployment

Create a public repository named `snippets` under `mojocolony`, place these repository files at its root, and enable GitHub Pages from the default branch/root. The app uses only relative asset paths and a relative PWA scope, so it is compatible with the `/snippets/` project path.


## Revision 2

- Bare `http://` / `https://` URLs render as clickable links when the line is not actively being edited.
- Cmd/Ctrl-A selects the whole snippet, and arrow keys move between editor lines.
- Reordering todos no longer forces the moved item into raw Markdown display.
- Todo drag handles and checkboxes share the editor line-box geometry.
- Archiving from Inbox immediately advances away from the archived item.
- Tag assignment rows are more compact.
- Passwordless-auth request errors are shown in the UI, including failures encountered in an installed iPhone PWA.


## Revision 3 — v0.3.0

- Bare domains such as `cnn.com` and `cnn.com/world` become clickable links without turning email domains into links.
- Only the active editor line shows raw Markdown; leaving a line immediately restores rendered formatting.
- Todo reordering uses a Lucide-style SVG grip aligned in the same line box as the checkbox.
- Starred snippets sort to the top of Inbox and Archive, then by most recently modified.
- The launch preference is labeled **Time to return to Inbox**; after the selected interval, Snippets opens Inbox unless a snippet is pinned.
- Snippets authentication no longer creates new Supabase users and requires membership in the Snippets-specific allowlist.
- The app version is visible in Settings as **Snippets v0.3.0**.

## Revision 4 — v0.4.1

- Multi-select is available in Inbox, Starred, Archive, and Trash.
- On touch devices, long-press a snippet to start selecting; on desktop, Cmd/Ctrl-click toggles individual items and Shift-click selects a range. **Select** is also available from the More menu.
- Batch actions support star/unstar, archive/unarchive, tag assignment, and moving items to Trash.
- Batch tag assignment shows mixed tag states and can apply or remove a tag across the whole selection.
- Trash is consistently available from **More → Trash**, including from the desktop editor, and Trash supports batch restore and permanent deletion.
- The star / tags / add-tag metadata strip stays sticky while the note scrolls.

## Revision 4.2 — v0.4.2

- The normal and multi-select bottom toolbars now use the same Lucide-style SVG icon geometry, including matching Star size, stroke, alignment, and control spacing.
- The normal editor toolbar now uses SVG Menu, Tag, Star, Share, and Ellipsis icons; the library toolbar uses SVG Plus, Tag, Search, and Ellipsis icons. `Aa` remains text.
- Trash now includes **Delete All** when it contains items. The action requires explicit confirmation and permanently deletes every item currently in Trash.

## Revision 4.3 — v0.4.3

- **More → Web Capture** surfaces the existing bookmarklets directly inside Snippets.
- Desktop users can drag **Save Link**, **Save Selection**, or **Save Page Text** from the in-app Web Capture sheet to the bookmarks bar.
- iPhone/iPad users get a concise mobile note and a direct **Open Web Capture Setup** link instead of unusable drag controls.
- The in-app panel uses the shared bookmarklet generator; the standalone setup page ships literal bookmarklet links so it remains usable even when opened directly.

## Revision 4.4 — v0.4.4

- Save Page Text now prefers semantic article/main content, removes common page chrome, and falls back to full body text.
- Cmd/Ctrl-B and Cmd/Ctrl-I wrap or unwrap selected text with Markdown bold/italic markers.
- Inline code, fenced code blocks, and javascript bookmarklet source are excluded from automatic URL linkification.


## Revision 4.5 — v0.4.5

- Web Capture no longer flashes the underlying page when opened from More. The replacement sheet uses an immediately opaque backdrop instead of replaying the backdrop fade-in.

## Revision 4.6 — v0.4.6

- Fixes the Save Page Text bookmarklet so its generated JavaScript is syntactically valid.
- Dragged bookmarklet names now contain only the action label, not the descriptive subtitle.
- `bookmarklets.html` now contains literal bookmarklet links and no longer depends on a runtime ES-module import to display them.

## Revision 4.7 — v0.4.7

- iPhone and iPad now launch into a fresh blank snippet for capture-first use, unless a snippet is pinned. Desktop keeps the existing **Time to return to Inbox** behavior.
- Compact tablet widths below 900px now use the readable mobile/tablet layout, including an edge-to-edge editor, larger controls, and larger library text.
- New installs default to a 20px editor size while existing explicit Appearance choices remain respected.
- The Markdown editor now uses one continuous editing surface, so text selection can span hard-newline lines instead of stopping at each rendered line.


## Revision 4.9 — v0.4.9

- Email + password is now the primary sign-in method, allowing installed iPhone/iPad PWAs to authenticate without opening Safari. Magic-link sign-in remains available as a secondary browser fallback.
- **Settings → Account** includes **Set/Change Password** for the existing authorized Supabase account.
- The Markdown editor now keeps one continuous text-only `contenteditable` surface. Todo drag handles, checkboxes, and bullet markers live in a sibling control gutter, so native selection can cross list/todo lines without selecting those controls.
- Todo completion and reordering still update the same Markdown source lines, and gutter geometry is synchronized to wrapped text lines.
- Tag-assignment rows are tightened for a more compact list.

## Revision 4.10 — v0.4.10
- Shares the first meaningful line as the system share title, remaining plain text as text, and the captured source URL as URL when available.
- Adds a compact selection formatting palette for Bold, Italic, Highlight, Strikethrough, Code, Link, and Todo.
- Todo is also available at a collapsed caret: it starts a todo on a blank line, converts the current line, converts selected lines, and toggles existing todo lines back to text.


## Revision 4.11 — v0.4.11
- Replaces the redundant bottom-bar Star with a Todo control; starring remains available in the metadata strip above every snippet.
- Todo in the bottom bar starts, converts, removes, or applies todos to selected lines while preserving the selection-aware Todo action in the formatting palette.
- The formatting palette now appears only for an actual text selection, never for a collapsed caret, so no lone checkbox appears after launch or refresh.
- Transient formatting UI and bottom-toolbar focus are cleared when Snippets loses window focus or becomes hidden, preventing stale selection/focus chrome on return.
- Removes the duplicate Settings entry from More. Standard More actions are ordered Select, Trash, Web Capture, Keyboard shortcuts, Sign out.


## Revision 4.12 — v0.4.12
- Restores the quiet editor bottom bar to **Library, Tags, Aa, Share, More**; Todo is no longer a persistent toolbar control.
- **Aa** opens a compact editor-format menu with **Todo** and **Settings** when there is no text selection.
- The selection-formatting palette remains selection-only and never appears just because the editor has a caret.
- Backspace at the start of a todo removes the todo formatting first and keeps the caret at the start of the text; a second Backspace can then merge with the previous line normally. Empty todos become ordinary blank lines.

## Revision 4.13 — v0.4.13
- Adds a dedicated Todo control to the upper metadata toolbar immediately to the right of Star, using Lucide's Check icon.
- **Aa** again opens Appearance/Settings directly; the intermediate Todo/Settings popup is removed.
- Todo still remains available in the selected-text formatting palette.
- The editor remembers the last in-editor caret or selection so the upper Todo control can reliably start, convert, remove, or apply todos even after the browser moves focus to the toolbar.
- The bottom bar remains **Library, Tags, Aa, Share, More**.

## Revision 4.14 — v0.4.14
- On touch-capable iPhone/iPad layouts, selecting text while the software keyboard is open now moves the contextual formatting controls to a Craft-style bar attached to the top edge of the keyboard.
- The selection bar is **Highlight, Bold, Italic, Strikethrough, Code, Link**. Todo remains in the upper metadata toolbar rather than duplicating it in the selection bar.
- Formatting is applied on pointer-down using the remembered editor selection, before iOS can collapse the selected range by moving focus to a toolbar button.
- The bar follows `visualViewport` resize/scroll changes as the iOS keyboard moves or resizes. Without an on-screen keyboard, touch devices fall back to the floating selection palette.
- Desktop keeps the existing floating selection palette positioned near the selected text.

## Revision 4.15 — v0.4.15

- Changes the iOS selected-text keyboard toolbar to Todo, Highlight, Bold, Italic, Strikethrough, and Link.
- Uses Lucide-style Check and Link icons for the symbolic toolbar actions.
- Removes Code from the iOS keyboard toolbar while preserving Code in the desktop selection palette.


## Revision 4.16 — v0.4.16

- Uses Lucide Heading, Bold, Italic, and Strikethrough icons in the iOS/iPadOS selected-text keyboard toolbar, alongside the existing Lucide Check and Link icons.
- Keeps the underlying actions and order unchanged: Todo, Highlight, Bold, Italic, Strikethrough, Link.
- Desktop retains its existing floating selection controls.
