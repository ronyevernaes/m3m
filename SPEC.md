# m3m — Spec

> m3m — Local-first, AI-native knowledge base. Markdown files are the source of truth. User always owns their data.

## Core Principles

1. `.md` files on disk are the source of truth. SQLite, LanceDB, and sync state are derived caches — always rebuildable.
2. Everything works offline. Cloud sync is an enhancement, never a dependency.
3. No telemetry. No account required for local features. Vaults are portable to any markdown editor.
4. AI runs on-device via Ollama by default. Cloud AI is opt-in BYOK fallback.
5. Each vault is self-contained and independently portable. The app is a manager of vaults, not a container.

## Stack

### Desktop (macOS / Windows / Linux)

| Layer | Choice |
|---|---|
| Shell | Tauri |
| Frontend | React + TypeScript |
| Editor | TipTap (ProseMirror) |
| Graph UI | React Flow |
| Local DB | SQLite — sqlx (one DB per vault) |
| Vector DB | LanceDB (Rust SDK, one store per vault) |
| AI runtime | Ollama sidecar (spawned by Tauri) |
| Backend | Rust — Tauri commands |

### Mobile (iOS / Android)

| Layer | Choice |
|---|---|
| Shell | Capacitor (~90% code reuse from desktop) |
| Filesystem | Capacitor Filesystem plugin |
| AI | Cloud API fallback (user API key) |

### Sync / Cloud — premium only

| Layer | Choice |
|---|---|
| Sync engine | Automerge (CRDT) |
| Free sync | BYOS — S3 / Dropbox / iCloud |
| Premium relay | Cloudflare Workers + R2 |
| Encryption | libsodium secretbox (client-side, Argon2id key derivation) |
| Auth | Clerk, Better Auth or Supabase Auth |
| Billing | Stripe |
| Telegram bridge | Cloudflare Worker + Telegram Bot API (shares sync infra) |

## Vault Structure

Each vault is a self-contained folder. Multiple vaults can exist anywhere on the filesystem — the app tracks them via a global registry file (see below).

```
~/Documents/WorkVault/          # vault root — any folder name, any location
├── note-title-01J5ABCDEF.md   # filename = {slug}-{ulid}.md
└── .vault/                     # app-managed, one per vault
    ├── index.db                # SQLite — notes, FTS5, note_links (implemented)
    ├── meta.json               # vault name, created date (implemented)
    ├── embeddings.lance        # LanceDB vector index (planned, P1)
    ├── settings.json           # vault-level prefs (planned)
    └── sync.bin                # Automerge doc, absent if sync off (planned, P2)
```

**Note:** `.vault/index.db` and `.vault/meta.json` are written at runtime. `embeddings.lance`, `settings.json`, and `sync.bin` are planned. Subfolder scanning is not yet implemented — vault root only.

### Global app registry

Stored outside any vault. Path resolved at runtime via platform API — never hardcoded:

- **Desktop (Tauri):** `tauri::path::app_data_dir()` → `m3m/`
- **Mobile (Capacitor):** `Filesystem.Directory.Data` → `m3m/`

| Platform | Resolved path |
|---|---|
| macOS | `~/Library/Application Support/m3m/` |
| Windows | `%APPDATA%\m3m\` |
| Linux | `~/.local/share/m3m/` |
| iOS | `<sandbox>/Library/Application Support/m3m/` |
| Android | `<app-data>/files/m3m/` |

```
<app_data_dir>/m3m/
├── registry.json               # list of known vaults
└── app-settings.json           # global prefs (theme, default AI backend)
```

`registry.json` schema:

```json
{
  "vaults": [
    {
      "id": "<ulid>",
      "name": "Work",
      "path": "/Users/rvernaes/Documents/WorkVault",
      "last_opened": "ISO8601",
      "color": "#hex"
    }
  ],
  "last_active_vault": "<ulid>"
}
```

The registry is the only file the app writes outside vault folders. Deleting it loses vault history but not vault data — vaults are re-registerable by pointing the app at the folder.

### Note frontmatter

```yaml
---
id: <ulid>
title: Note Title
created: 2025-01-01T12:00:00Z
modified: 2025-01-01T12:00:00Z
tags:
  - tag1
  - tag2
links:
  - <target-note-ulid>   # auto-populated from [[wikilinks]] in the note body on save
---
```

Unknown frontmatter keys are preserved — never removed by the app.

### SQLite schema (`.vault/index.db`)

```sql
CREATE TABLE notes (
  id TEXT, path TEXT UNIQUE, title TEXT,
  created TEXT, modified TEXT,
  tags TEXT,       -- JSON array
  body TEXT, body_hash TEXT, indexed_at TEXT
);
CREATE VIRTUAL TABLE notes_fts USING fts5(title, body, tags, content='notes', content_rowid='rowid');
-- auto-maintained by INSERT/UPDATE/DELETE triggers

CREATE TABLE note_links (
  source_id TEXT, target_id TEXT,
  PRIMARY KEY (source_id, target_id)
);
CREATE INDEX idx_note_links_target ON note_links (target_id);
```

## Features

### P0 — MVP

- ✅ Markdown editor — TipTap, writes plain `.md` on save; inline title editing in editor header
- ✅ Markdown links — `[Label](url)` input rule auto-converts on closing `)`, bare URL paste auto-links; bubble menu (open, edit label + URL, unlink); Cmd/Ctrl+click opens URL via `plugin:opener`; toolbar inline URL input (no native dialog)
- ✅ Blockquotes — `> ` input rule auto-converts to a blockquote block; toolbar `>` button toggles; serialized as standard `>` markdown; styled with accent-border left bar and muted italic text
- ✅ Vault watcher — `notify` crate rebuilds SQLite on `.md` change; emits `vault:index-updated`
- ✅ Full-text search — SQLite FTS5 with snippets
- ✅ Context panel — multi-tab inspector (Details, Links, Outline, Insights, Agent); resizable; Links tab (`LinksAndBacklinksTab`, `src/components/context-panel/LinksAndBacklinksTab.tsx`) unifies outgoing links and backlinks into two collapsible accordion sub-sections ("Outgoing", "Backlinks") — each section only rendered when it has items; backlinks derived from `note_links` table via `useBacklinks`, live-updated on watcher events; persisted `'backlinks'` tab value migrates to `'links'` transparently; Outline tab (`OutlineTab`, `src/components/context-panel/OutlineTab.tsx`) parses headings from `currentNote.body` (markdown string in vault store) and renders them as a clickable table of contents — clicking a heading scrolls the editor to it smoothly and focuses the cursor; Details tab shows word count, created/modified dates, tags, and custom properties — note `id` is intentionally not displayed (internal identifier)
- ✅ Wikilinks — `[[Note Title]]` syntax in the editor body; autocomplete dropdown on `[[`; chip rendering (resolved/unresolved styling); `links[]` frontmatter auto-synced on save; backlinks tracked automatically via existing `note_links` table
- ✅ Tags — derived from frontmatter `tags`; pill/chip visualization app-wide; per-tag note filtering via advanced search panel in sidebar; full add/remove editing in the Details tab of the context panel (autocomplete from vault tags, confirm on Enter or comma, backspace removes last tag)
- ✅ Advanced search panel — collapsible section between the search bar and the notes list; toggled by a sliders icon button to the right of the search input; tag filter included; open/closed state persisted to localStorage; designed to host future filter types (date ranges, properties, etc.)
- ✅ Delete a note — permanent file deletion with confirmation dialog; watcher cleans SQLite automatically
- ⬜ Daily note — `YYYY-MM-DD.md`, auto-links to previous day
- ⬜ Graph view — React Flow, nodes = notes, edges = links
- ✅ Settings UI — gear icon in editor header alongside Save button; ⌘, shortcut; accessible with or without an open note:
  - ✅ Global (app-settings.json)
    - ✅ Theme — light, dark, system default; visible on first launch
    - ✅ Editor font size — base size applied across all vaults
    - ✅ Editor font family — body font applied across all vaults; choices: Inter, Lora, JetBrains Mono, system default; dropdown selector
    - ✅ Restore last vault on launch — whether to reopen the previous active vault
    - ✅ Default new vault location — pre-fills the folder picker path
  - ✅ Per vault (.vault/settings.json) — Vault tab in Settings dialog
    - ✅ Vault name & color — editable in vault settings panel, persisted to registry
    - ✅ Autosave delay — debounce before writing to disk (default 2000ms); segmented control: 500ms / 1s / 2s / 5s
    - ✅ Line width — max characters per line in the editor (prose width); range slider 40–200ch, applied via CSS variable
    - ⬜ Daily note template — markdown template injected on creation; will differ heavily per vault type
    - ⬜ Note filename template — {slug}-{ulid} default, but many users expect date prefixes or title-only names
- ✅ Note tabs — multi-tab editor strip; each opened note becomes a tab; `openTabs` in vault store caches full `Note` per tab; switching is instant (no disk read if already open); dirty indicator dot per tab; Cmd+W closes the active tab; dirty tabs auto-save on close and on app quit
- ✅ Export as PDF — "Export PDF" button in the editor header; sets `document.title` to the note title so the browser uses it as the default PDF filename (`afterprint` restores previous title); `window.print()` opens the system print dialog; print CSS hides all app chrome (sidebar, resize handles, tabs, toolbar, context panel) via `print:hidden` and forces light-mode CSS variables; `@page { margin: 2.5cm 3cm }` sets document margins; requires `core:webview:allow-print` in `src-tauri/capabilities/default.json`
- ✅ Markdown tables — GFM pipe-table syntax; `@tiptap/extension-table` (`Table`, `TableRow`, `TableHeader`, `TableCell` — all named exports from a single package); round-trip serialization in `src/lib/markdown.ts` (`case 'table'` in both `mdastNodeToTipTap` and `tiptapNodeToMdast`); first MDAST row maps to `tableHeader` cells in TipTap, body rows to `tableCell`; "Table" toolbar button inserts a 2×2 table with a header row; Tab navigates between cells; `.selectedCell` highlight via `var(--accent-subtle)` in `src/index.css`; remark-gfm (already a dependency) handles parse and stringify
- ✅ Markdown reference — `?` button at the far right of the editor toolbar opens `MarkdownHelpDialog` (`src/components/editor/MarkdownHelpDialog.tsx`); modal lists all supported syntax in five sections: Inline Formatting, Headings, Blocks, Lists (including wikilinks), Tables; Escape key and backdrop click close the dialog; `print:hidden` on the backdrop
- ✅ Markdown paste — pasting plain text (no `text/html` in clipboard) automatically runs through `markdownToTipTap()` and inserts as formatted content; pasting rich text from a browser falls through to TipTap's HTML paste handler unchanged; when the parsed result is a single paragraph and the cursor is in a text block the slice uses `openStart/openEnd = 1` so inline content (e.g. a URL pasted inside `[Label](`) merges inline without adding newlines; implemented in `MarkdownPasteExtension` (`src/components/editor/extensions/MarkdownPasteExtension.ts`)
- ✅ Resizable panels — sidebar and context panel widths are drag-resizable and persisted across sessions
- ✅ In-app update notifications — `tauri-plugin-updater` checks for new releases on launch; dismissable banner guides user through install
- ✅ Changelog / What's New — `ChangelogDialog` (`src/components/changelog/ChangelogDialog.tsx`) renders the full `CHANGELOG.md` (Keep a Changelog format) as structured, color-coded release notes; imported at build time via Vite `?raw` import and parsed by `src/lib/changelog.ts` into `ChangelogEntry[]`; auto-appears once per version upgrade (detected by comparing `lastSeenVersion` in `useUiStore` against the bundle version from `package.json`); permanently accessible via the `m3m vX.Y.Z` version badge at the bottom of the sidebar; sections are color-coded by type (Added → green, Fixed → amber, Changed → blue, Deprecated → yellow, Removed → red, Security → purple); close via Escape or backdrop click; `lastSeenVersion` persisted in `m3m-ui` localStorage
- ✅ Vault Manager — open, close, create, rename, remove vaults (see below)
- ✅ Onboarding tours — driver.js (npm, bundled offline); two versioned tours: `general-onboarding-v1` fires the first time the vault view opens (triggered in `App.tsx` on `vaultPath` change via `requestAnimationFrame`), `editor-onboarding-v1` fires the first time the user creates a note (detected via `justCreatedNoteRef` in `App.tsx`); tour steps are filtered at fire time to only mounted DOM targets so steps for unmounted elements are skipped silently; completion persisted in `useUiStore.completedTours: string[]` under `m3m-ui` localStorage key; tour ID is a versioned string — bumping it re-triggers for all users; popovers themed via `.driver-m3m-popover` CSS class using project CSS variable tokens (`--bg`, `--text-h`, `--accent`, etc.), z-index 9998–10000 overrides all existing modals (z-50); tour definitions and driver factories in `src/lib/tours.ts`; hook in `src/hooks/useTour.ts`; targets identified by `data-tour` attributes; restart via Settings → App → Help → "Take the tour"

### P1 — AI (requires Ollama or API key)

- ⬜ Semantic search — nomic-embed + LanceDB
- ⬜ AI-inferred connections — cosine similarity + named entities + temporal co-occurrence + shared tags; rendered as "suggested links", user accepts/dismisses
- ⬜ Contradiction detection — LLM compares new note against similar older notes
- ⬜ Knowledge decay — freshness score, spaced resurfacing with AI review prompt
- ⬜ Daily synthesis — on open: unresolved threads, new connections, questions
- ⬜ Draft from vault — synthesise user's own notes into a draft on demand
- ⬜ Socratic mode — AI challenges claims using contradicting vault evidence
- ⬜ Voice capture — local Whisper → structured note, linked to existing notes
- ⬜ Cross-vault search — semantic search across all open vaults simultaneously (P1.5)

### P2 — Sync & Capture

- ⬜ BYOS sync — encrypt vault, write CRDT patches to user-provided storage
- ⬜ Managed sync (premium) — Cloudflare Workers WebSocket relay, E2E encrypted
- ⬜ Conflict resolution UI — for the rare Automerge conflicts
- ⬜ Telegram capture bridge (premium) — user links Telegram account via one-time
  code sent to `@m3mBot`; incoming text / voice / images queued in R2 as
  encrypted payloads; drained by desktop on next sync connection; voice runs
  through local Whisper pipeline on desktop; same E2E encryption as vault sync
- ⬜ Sync is per-vault — each vault has independent sync config and passphrase

### P3 — Power

- ⬜ Smart paste — URL / PDF / screenshot → AI distils signal, links to vault
- ⬜ Knowledge gap detector — surfaces assumed-but-unwritten topics while editing
- ⬜ Temporal graph — timeline scrub of knowledge graph evolution
- ⬜ BYOM — swap AI backend per-feature (Ollama / Claude API / OpenAI API)
- ⬜ Cross-vault AI connections — AI surfaces links between notes across vaults
- ✅ Outline panel — see context panel entry in P0 above
- ✅ Collapse sections in a document — always-visible chevron on every heading folds all block content until the next equal-or-higher-level heading; `CollapsibleHeadingExtension` (`src/components/editor/extensions/CollapsibleHeadingExtension.ts`) overrides StarterKit's `heading` node and is fully self-contained (provides `addCommands`, `addKeyboardShortcuts` `Mod-Alt-1…6`, and `addInputRules` `##` input rules); state stored in `useUiStore.collapsedSections` (localStorage, keyed by `frontmatter.id ?? note path`); section keys are the heading's ordinal position among all headings (`'0'`, `'1'`, …) — stable through renames, no text-based collisions; content hidden via `pm-section-hidden` decorations — document is never modified; collapsed visual state driven by `heading-is-collapsed` CSS class added via `Decoration.node` on the heading itself; print CSS hides chevrons and always expands all sections
- ⬜ Actions in blocks of content (copy code in one click)
- ⬜ Modes: Edit, Preview, Source Code
- ✅ Notes properties / metadata
- ⬜ Power Search / Notes Explorer: Additional advanced filters (date ranges, custom properties, note size) extending the existing advanced search panel
- ⬜ Templates: pre-filled propeties, content structure

## Vault Manager

Core UX for managing multiple vaults. Available from any screen via a persistent
vault switcher in the sidebar header.

### Actions

| Action | Behaviour |
|---|---|
| **Create vault** | Pick a folder name + location → app writes `.vault/meta.json`, registers in registry |
| **Open vault** | File picker → select existing folder → app validates `.vault/` presence or offers to initialise |
| **Switch vault** | Click vault name in switcher → loads vault index, restores last open note |
| **Close vault** | Removes from active state, stays in registry — re-openable instantly |
| **Rename vault** | Updates `name` in registry only — folder on disk unchanged |
| **Remove vault** | Removes from registry only — folder and all `.md` files untouched on disk |
| **Reveal in Finder** | Opens vault folder in OS file manager |

### Active vault scope

Only one vault is active (focused) at a time. The editor, graph view, backlink
panel, tag sidebar, and daily note all operate on the active vault. Cross-vault
features (search, AI connections) are explicitly opt-in per action.

### Vault switcher UI

Persistent element in the sidebar header. Shows vault name + color dot. Click
opens a popover listing all registered vaults with last-opened timestamp.
Keyboard shortcut: `⌘ + Shift + V` (desktop).

### First launch

On first launch with no registry: show a full-screen welcome that offers
"Create new vault" or "Open existing folder". No onboarding wizard beyond this.

## AI Architecture

```
React frontend
  └─ Tauri IPC (#[tauri::command])
       └─ Rust backend
            ├─ notify (file watcher — one watcher per open vault)
            ├─ sqlx (SQLite — one DB per vault: .vault/index.db)
            ├─ LanceDB (one store per vault: .vault/embeddings.lance)
            └─ reqwest → Ollama :11434
                  ├─ nomic-embed-text  (~270MB)
                  ├─ phi-3-mini        (~2.3GB)  or  mistral-7b (~4.1GB)
                  └─ whisper-base      (~145MB)
```

Mobile replaces Ollama with direct HTTPS to user-configured cloud API.
App detects VRAM on first launch and recommends models accordingly.

## Sync Architecture

**BYOS (free):** vault change → Automerge diff → libsodium encrypt → write to S3/Dropbox/iCloud → other devices poll, decrypt, apply patch.

**Managed (premium):** same scheme, WebSocket relay via Cloudflare Worker instead of polling. R2 stores encrypted snapshots for device bootstrap. Server never sees plaintext.

**Encryption:** Argon2id(passphrase) → 32-byte key → `crypto_secretbox_easy`. Key never leaves device. No passphrase recovery — recovery key exported on setup.

**Per-vault sync:** each vault is synced independently. A user can sync their Work vault via managed premium and their Personal vault via BYOS, or not sync a vault at all. Sync config lives in `.vault/settings.json`.

## Release & Versioning

**Versioning:** semantic versioning (`MAJOR.MINOR.PATCH`). Managed via `release-plz` — bumps `Cargo.toml`, updates `CHANGELOG.md`, tags, and pushes in one command.

**Update mechanism:** `tauri-plugin-updater` (built into Tauri v2). Checks a versioned JSON manifest on launch. Updates are cryptographically signed — Tauri keypair generated once, private key stored in GitHub secrets.

**Distribution phases:**

| Phase | Mechanism | Infrastructure |
|---|---|---|
| Early / free | GitHub Releases + Tauri updater | GitHub Actions builds all platforms on tag push |
| Premium live | Cloudflare R2 manifest + Worker | Reuses sync infra; enables update channels |

**Update channels:**

| Channel | Audience |
|---|---|
| `stable` | All users |
| `beta` | Opt-in (Settings → Beta updates) |
| `nightly` | Internal / dev only |

Channel is a URL in `tauri.conf.json` — switching is a settings toggle.

**GitHub Actions release workflow:** `.github/workflows/release.yml` triggers on `v*` tag push. Builds macOS (arm64 + x64 universal), Windows, and Linux in parallel via matrix strategy. Signs artifacts with `TAURI_SIGNING_PRIVATE_KEY` secret. Uploads to GitHub Releases as a draft for manual review before publishing.

**Release command:**
```bash
# Cut a release (bumps version, tags, pushes)
release-plz release
```

## Non-goals (v1)

- Multiplayer / real-time collaboration
- Web-only / browser app
- Public note sharing
- Plugin system
- Mobile-native UI (Capacitor WebView is acceptable)
- Simultaneous editing of multiple vaults (one active vault at a time)

## Open Questions

1. **iOS vault path** — Capacitor Filesystem vs iCloud Drive container
2. **Ollama distribution** — prompt user to install separately vs bundle llama.cpp bindings for a default small model
3. **BYOS sync engine** — Automerge vs git-based sync (simpler, more transparent to power users)
4. **Mobile AI scope** — which P1 features degrade gracefully vs desktop-only
5. **Pricing** — whether BYOS sync is free or paywalled
6. **Cross-vault links** — should notes be linkable across vaults via `vault-id::note-id` syntax, or keep vaults strictly isolated?
7. **Vault limit** — cap the number of registered vaults (e.g. 3 for free, unlimited for premium) or keep unlimited?

## Open UX/UI Topics

1. **Search** — full-word match only vs. substring/contains match
2. **Empty state** — what to show when app starts with no active vault
3. **Moving panels** — main panels should be moveable and toggleable
4. **Multi-language** — i18n support scope and implementation

## Telegram Bridge Architecture

```
Mobile (Telegram app)
  │  text / voice / image
  ▼
Telegram Bot API (@m3mBot)
  │  webhook POST
  ▼
Cloudflare Worker (shares premium sync infra)
  │  authenticates: chat_id → user_id mapping (R2)
  │  resolves: user_id → active vault_id (from registry)
  │  encrypts payload (libsodium, same scheme as sync)
  │  queues as R2 object: telegram/{user_id}/{vault_id}/{ulid}
  ▼
Desktop app — sync connection drains queue
  │  decrypt → write .md to vault inbox/
  │  voice .ogg → Whisper → structured note
  ▼
notify watcher → index → AI pipeline
```

**Onboarding flow:**
1. User opens Settings → Connect Telegram
2. User selects which vault incoming messages should land in (default: active vault)
3. App generates a one-time code tied to their account
4. User sends the code to `@m3mBot` in Telegram
5. Worker maps `chat_id ↔ user_id ↔ vault_id` and stores in R2
6. Confirmation message sent back via bot

**Incoming payload handling:**

| Type | Processing |
|---|---|
| Text | Written as `inbox/YYYY-MM-DD-HH-MM.md` with `source: telegram` frontmatter |
| Voice | Queued as `.ogg`, transcribed by Whisper on next desktop connection |
| Image | Saved to vault assets, triggers smart paste AI pipeline |
| Document | Saved to vault assets, linked from an inbox note |

**Offline behaviour:** payloads queue in R2 until desktop app connects. No message is lost. Queue TTL: 30 days.

## Build Notes

- Google Fonts `@import` requires internet. For fully offline production Tauri builds, bundle fonts via `@font-face` pointing at local files and remove the `@import`.
- DevTools are gated behind a Cargo feature (`devtools = ["tauri/devtools"]` in `src-tauri/Cargo.toml`). The `tauri:dev` script passes `-- --features devtools` so right-click "Inspect Element" is available in development. Production builds omit the flag — the menu item is compiled out entirely. Never add `devtools` to the default feature set.
- Tailwind v4 preflight resets `strong`/`b` and `em`/`i` to inherit, stripping browser bold/italic defaults. Explicit `.ProseMirror strong`, `.ProseMirror b`, `.ProseMirror em`, `.ProseMirror i` rules with `color: inherit` in `src/index.css` are required to restore correct inline mark rendering, including proper dark-mode colors.
