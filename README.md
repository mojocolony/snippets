# Snippets

Snippets is a personal, capture-first Markdown app: immediate writing, Inbox / Starred / Archive, global tags, interactive todos, pinning, dark mode, keyboard shortcuts, sharing, and browser capture.

## Production architecture

- **Frontend:** static vanilla HTML/CSS/JavaScript, designed for GitHub Pages.
- **Production URL target:** `https://mojocolony.github.io/snippets/`
- **Backend:** the existing Supabase project named **Ticking** (`appesztafatypbxzdunr`), shared with other personal apps.
- **Snippets isolation:** Snippets uses only `snippets_items`, `snippets_tags`, and `snippets_preferences`. Each table has RLS policies requiring `auth.uid() = user_id`. No Snippets code reads or writes Ticking, Fetch, Podstream, or other application tables.
- **Auth session isolation:** Supabase Auth uses the browser storage key `snippets-auth`, so signing out of Snippets does not intentionally reuse another app's local session token even though the Supabase Auth user directory is shared.
- **Local cache:** IndexedDB database `snippets`; writes happen locally first and are queued to Supabase.

The publishable Supabase browser key in `src/cloud/supabaseClient.js` is intentionally public and relies on RLS. Never place a service-role key or other private secret in this repository.

## Authentication

Snippets requests passwordless email authentication with Supabase. The production login uses Supabase passwordless email. With the shared project's current default mailer, the primary flow is a magic link; the app can also verify a six-digit OTP if the shared Magic Link/OTP template is later configured to include `{{ .Token }}`. Authentication errors are surfaced in the login panel rather than failing silently.

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
