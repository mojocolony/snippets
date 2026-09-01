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

Snippets requests passwordless email authentication with Supabase. The UI supports a six-digit email OTP (`verifyOtp`) and also tolerates the existing Supabase magic-link flow. The shared project's email template is global across all apps; to make the email visibly contain a six-digit code, its Magic Link/OTP template must include `{{ .Token }}`. Do not remove an existing confirmation link from the shared template without checking the other apps first.

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
