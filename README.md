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

Snippets requests passwordless email authentication with Supabase and sets `shouldCreateUser: false`. A signed-in Supabase user must also be present in `snippets_access` before the app opens. The production login uses Supabase passwordless email. With the shared project's current default mailer, the primary flow is a magic link; the app can also verify a six-digit OTP if the shared Magic Link/OTP template is later configured to include `{{ .Token }}`. Authentication errors are surfaced in the login panel rather than failing silently.

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
