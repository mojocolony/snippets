# Snippets — Working Prototype Design

**Date:** 2026-09-01  
**Status:** Approved design, awaiting spec review before implementation

## 1. Purpose

Snippets is a fast, personal, Markdown-first capture app inspired by the strongest parts of Drafts without growing into a full Notes application.

The core experience is:

> Open → type → leave.

Snippets prioritizes immediate capture, extremely light organization, fast retrieval, and easy sharing. It should feel modern, quiet, greyscale, and equally polished on mobile and desktop.

## 2. Prototype Scope

The first prototype is a **working local prototype**. It will use browser-local persistence and will not connect to Supabase yet.

The prototype must support:

- Immediate capture editor
- Inbox / Starred / Archive views
- Global tags
- Markdown editing
- Interactive, reorderable todo items
- Automatic strikethrough for checked todos
- Highlighting
- Editor font/theme/size controls
- Sharing/copying
- Search
- One pinned snippet
- Configurable return-to-latest window
- Trash with restore and 30-day retention
- Responsive mobile and desktop layouts
- Light and dark mode
- Local persistence

Web capture/bookmarklet behavior belongs to the product design, but it does **not** need to be wired into the first local prototype unless implementation remains small and isolated.

## 3. Non-Goals

Snippets V1 must not add:

- Folders or notebooks
- Nested organization
- Projects or workspaces
- Attachments or embedded images
- Drawing
- Calendar or reminders
- A standalone task manager
- Backlinks or wiki links
- Collaboration
- Multiple panes
- Kanban or dashboards
- AI features
- Document-layout tools
- Rich-text storage

Tags are the main organizational mechanism.

## 4. Primary Navigation Model

There are only two primary app states.

### 4.1 Editor

The default app state.

The editor occupies nearly the entire viewport. It has no visible card, page border, title field, Save button, or Done button.

A compact control strip remains fixed at the bottom on both mobile and desktop.

Editor control strip positions:

1. Library
2. Tags
3. Star
4. Appearance
5. Share
6. More

The positions remain stable even when controls are disabled.

### 4.2 Library

The Library is a full-screen list view.

A thin segmented control at the top switches between:

- Inbox
- Starred
- Archive

The bottom control strip remains present and adapts to Library actions:

1. New
2. Tags
3. Search
4. Appearance
5. More

Trash is not shown as a fourth primary Library tab. It lives under More.

## 5. Capture and Autosave

- On normal launch, Snippets presents a blank capture surface unless launch rules below select an existing snippet.
- A blank editor does not create a stored snippet.
- The first entered character creates the snippet.
- Changes autosave continuously.
- If all content is erased and the user leaves the editor, the empty snippet is removed automatically.
- There is no Save or Done command.
- From Library, New immediately opens a blank capture editor.

## 6. Launch Behavior

Snippets supports one pinned snippet at a time.

Launch priority:

1. If a snippet is pinned, open it.
2. Otherwise, if the most recently edited snippet falls within the configured return window, reopen it.
3. Otherwise, open a fresh blank capture.

Return-window setting options for the prototype:

- Always start fresh
- 30 seconds
- 1 minute (default)
- 5 minutes
- 15 minutes
- Always return to last

Pinning is available from More → Pin / Unpin.

Pinning a new snippet automatically unpins the previous one.

Deleting the pinned snippet clears the pin.

## 7. Snippet Data Model

The local prototype should keep the data model deliberately small.

Each snippet stores:

- `id`
- `content` (plain Markdown)
- `createdAt`
- `updatedAt`
- `starred`
- `archived`
- `deletedAt` (nullable)
- `pinned`
- `tags` (tag IDs or names)
- `sourceUrl` (nullable, future web capture)

Global preferences store:

- theme mode: system / light / dark
- editor font
- editor font size
- line spacing if implemented in prototype
- return window

## 8. Library List Items

The Library is ordered **most recently modified first**. No additional sort control exists in the prototype.

Each list item shows:

- First meaningful line of the snippet as the automatic title
- Second line as a preview
- Subdued visible tags
- Modified date/time
- Thin divider between items

No separate title field exists anywhere in the app.

Long title/preview lines are truncated rather than increasing row height substantially.

Very short snippets may show only one content line.

Todo previews may retain simple checkbox state where practical.

## 9. Tags

Tags are global and independent of Inbox / Starred / Archive.

### 9.1 Adding/removing tags

In the editor, tapping the Tags control opens a compact sheet/popover with:

- Search/create field
- Existing tag list
- Check state for currently assigned tags
- New-tag creation

Tapping a tag toggles its assignment.

Assigned tags appear quietly near the bottom of the editor so the user can confirm tagging worked.

### 9.2 Tag retrieval

In Library, tapping Tags opens the global tag list with counts.

Selecting a tag shows every matching snippet regardless of normal location.

A compact scope control may then filter tagged results by:

- All
- Inbox
- Starred
- Archive

### 9.3 Visual treatment

Tags are visible in Library rows but deliberately subdued.

Use monochrome or low-contrast pills/text. Avoid bright tag colors.

## 10. Starred and Archive Semantics

Starred is not a storage location. It is a property/filter.

A snippet may simultaneously be:

- Inbox + Starred
- Archive + Starred
- Any tag combination

Archive removes a snippet from normal Inbox circulation but retains it for retrieval.

## 11. Trash

Delete moves a snippet to Trash instead of permanently deleting it.

Trash behavior:

- Retain content, tags, star state, and timestamps
- Allow Restore
- Allow Delete Permanently
- Automatically purge after 30 days

Trash lives under More / Settings rather than beside Inbox / Starred / Archive.

## 12. Markdown Editing

Snippets stores plain Markdown but uses a hybrid editor presentation.

Desired behavior:

- Markdown remains the source of truth
- Formatting may render visually when the cursor is away from syntax
- Syntax remains easy to edit
- Bold, italic, headings, lists, links, blockquotes, and code receive typographic treatment
- `==highlight==` renders as highlighted text
- `- [ ]` renders as an interactive checkbox
- `- [x]` renders checked and the todo text is automatically struck through
- Unchecking restores normal text

### 12.1 Todo reordering

Consecutive checkbox-list rows can be reordered with a drag handle or equivalent touch-friendly interaction.

Reordering changes only Markdown line order.

Completed items do not automatically move to the bottom.

Snippets must not introduce task-manager behavior beyond improving Markdown checklists.

## 13. Sharing and Copying

The Share control should use the platform-native share mechanism where supported.

The More menu may include:

- Copy
- Copy Markdown
- Archive / Unarchive
- Pin / Unpin
- Delete
- Settings

Sharing should preserve URLs as real URLs and share the snippet body as text/Markdown rather than an internal Snippets URL.

## 14. Visual Design

Snippets should feel visually distinct from previous apps.

Design principles:

- Modern
- Minimal
- Sleek
- Mostly greyscale
- Typography-led
- Very low chrome
- Thin dividers instead of cards
- Generous whitespace
- Subtle rounded controls
- Restrained animation
- No unnecessary sidebars
- Mobile and desktop are peers

### 14.1 Light mode direction

Suggested palette direction:

- Background: `#F7F7F5` or `#FAFAF9`
- Primary text: `#171717`
- Secondary text: `#737373`
- Hairlines: `#E5E5E5`
- Control surface: `#EFEFED`

### 14.2 Dark mode direction

Suggested palette direction:

- Background: `#111111`
- Editor surface: `#151515`
- Primary text: `#ECECEC`
- Secondary text: `#929292`
- Hairlines: `#292929`
- Control surface: `#202020`

Dark mode must be applied before first paint where practical to avoid a white flash on launch.

### 14.3 Motion

Use only restrained transitions:

- Sheets glide up
- Popovers fade/scale slightly
- Checkbox state changes quickly
- Dragged todo rows lift subtly
- Theme switching crossfades briefly

No large or decorative transitions.

## 15. Typography

The app UI may use iA Writer Duo / Duospace as part of Snippets' visual identity.

Default editor font: **iA Writer Duo / Duospace**.

Editor font choices:

### Sans
- iA Writer Duo / Duospace
- Open Sans

### Serif
- Literata
- Bookerly (device-local when installed; not redistributed with the app)

### Mono
- IBM Plex Mono
- Roboto Mono

The prototype should gracefully fall back when a selected local font is unavailable.

## 16. Responsive Behavior

Snippets is designed mobile-first but desktop must be equally complete.

### Mobile

- Full-height editor
- Bottom strip sits above safe-area inset
- Sheets are used for secondary controls
- Large enough touch targets for one-handed use

### Desktop

- Same interaction model
- Bottom-centred control strip remains
- Editor uses a comfortable max-width rather than stretching edge-to-edge
- Popovers may replace sheets where appropriate
- No permanent desktop sidebar

## 17. Local Persistence Architecture

The prototype should use IndexedDB rather than localStorage for primary snippet storage.

Suggested separation:

- `snippetRepository`: CRUD, archive, star, trash, restore, pin
- `tagRepository`: create, assign, remove, list/count
- `preferencesRepository`: theme/font/return-window settings
- UI components/views consume those repositories without depending on storage internals

This keeps the prototype easy to migrate to Supabase later.

## 18. Future Backend Architecture

After the prototype UX is approved, the likely production stack is:

- GitHub Pages for frontend hosting
- Supabase for auth, data, and sync
- Passwordless email OTP
- Persistent browser sessions
- Row-level security per user

Production data should remain isolated from other apps even if infrastructure is shared.

The local prototype must avoid assumptions that would make replacing IndexedDB with Supabase difficult.

## 19. Web Capture Design

Planned capture modes:

### Save Link

Capture:

- Page title
- Original URL

### Save Selection

Capture:

- Selected text
- Page title
- Original URL

### Save Page

Capture:

- Readable page text
- Title/byline when available
- Original URL

Link and selected-text capture should be considered higher priority than perfect full-page extraction.

## 20. Error Handling

Prototype behavior should be quiet and recoverable.

- IndexedDB write failures should surface a small non-blocking error and retain editor text in memory when possible.
- Invalid or unavailable fonts fall back without breaking layout.
- Empty snippets are never persisted.
- Tag deletion/removal must not delete snippets.
- Restore from Trash must preserve original metadata.
- A failed Share API call should fall back to copy-to-clipboard where possible.

## 21. Testing Requirements

At minimum, verify:

### Capture
- Blank launch creates no record
- First character creates a record
- Autosave survives refresh
- Erasing all content removes the record

### Launch rules
- Pin overrides return-window behavior
- Only one snippet may be pinned
- Return window behaves at each configured value
- Deleting pinned snippet clears pin state

### Library
- Inbox/Starred/Archive filtering is correct
- Modified-first order updates immediately after edits
- Automatic title/preview extraction is stable

### Tags
- Add/remove tags
- Global tag retrieval across Inbox/Starred/Archive
- Tag counts
- Multiple tags per snippet

### Markdown/todos
- Checkbox state edits underlying Markdown
- Checked text is struck through
- Reordering changes line order only
- Highlight syntax renders correctly

### Trash
- Delete moves to Trash
- Restore returns item correctly
- Permanent delete removes it
- 30-day purge logic is correct

### Appearance
- Light/dark/system modes
- No obvious launch flash in dark mode
- Font selection/fallback
- Mobile and desktop layouts

### Sharing
- Native share where available
- Copy fallback
- URLs remain usable

## 22. Prototype Success Criteria

The prototype succeeds if:

1. Opening the app feels immediate.
2. Capturing a thought requires no organizational decision.
3. The editor feels visually quiet enough for longer writing.
4. Tags make retrieval easy without turning the app into a filing system.
5. Todo interaction feels natural without resembling a task manager.
6. Inbox/Starred/Archive browsing is fast and legible.
7. Mobile feels like a primary version, not a reduced desktop app.
8. Dark mode feels intentionally designed.
9. The interface has a distinct identity despite being mostly greyscale.
10. Nothing in the prototype creates pressure to add Notes-app complexity.
