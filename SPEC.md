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
    ├── meta.json               # vault id (ulid), name, created date (planned)
    ├── embeddings.lance        # LanceDB vector index (planned, P1)
    ├── settings.json           # vault-level prefs (planned)
    └── sync.bin                # Automerge doc, absent if sync off (planned, P2)
```

**Note:** `.vault/index.db` is the only app-managed file currently written at runtime. All other `.vault/` files are planned. Subfolder scanning is not yet implemented — vault root only.

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
  - <target-note-ulid>   # explicit outlinks only; body wikilink extraction not yet implemented
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
- ✅ Vault watcher — `notify` crate rebuilds SQLite on `.md` change; emits `vault:index-updated`
- ✅ Full-text search — SQLite FTS5 with snippets
- ✅ Backlink panel — derived from `note_links` table, live-updated on watcher events
- ✅ Tag sidebar — derived from frontmatter `tags`, per-tag note filtering
- ⬜ Daily note — `YYYY-MM-DD.md`, auto-links to previous day
- ⬜ Graph view — React Flow, nodes = notes, edges = links
- ⬜ Settings UI — vault path, theme, AI backend (local / cloud / off)
- ⬜ Vault Manager — open, close, create, rename, remove vaults (see below)

### P1 — AI (requires Ollama or API key)

- Semantic search — nomic-embed + LanceDB
- AI-inferred connections — cosine similarity + named entities + temporal co-occurrence + shared tags; rendered as "suggested links", user accepts/dismisses
- Contradiction detection — LLM compares new note against similar older notes
- Knowledge decay — freshness score, spaced resurfacing with AI review prompt
- Daily synthesis — on open: unresolved threads, new connections, questions
- Draft from vault — synthesise user's own notes into a draft on demand
- Socratic mode — AI challenges claims using contradicting vault evidence
- Voice capture — local Whisper → structured note, linked to existing notes
- Cross-vault search — semantic search across all open vaults simultaneously (P1.5)

### P2 — Sync & Capture

- BYOS sync — encrypt vault, write CRDT patches to user-provided storage
- Managed sync (premium) — Cloudflare Workers WebSocket relay, E2E encrypted
- Conflict resolution UI — for the rare Automerge conflicts
- Telegram capture bridge (premium) — user links Telegram account via one-time
  code sent to `@m3mBot`; incoming text / voice / images queued in R2 as
  encrypted payloads; drained by desktop on next sync connection; voice runs
  through local Whisper pipeline on desktop; same E2E encryption as vault sync
- Sync is per-vault — each vault has independent sync config and passphrase

### P3 — Power

- Smart paste — URL / PDF / screenshot → AI distils signal, links to vault
- Knowledge gap detector — surfaces assumed-but-unwritten topics while editing
- Temporal graph — timeline scrub of knowledge graph evolution
- BYOM — swap AI backend per-feature (Ollama / Claude API / OpenAI API)
- Cross-vault AI connections — AI surfaces links between notes across vaults

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

**Production Build:** the Google Fonts @import requires internet. For production Tauri builds that must stay fully offline, the fonts should be bundled with @font-face pointing at local files and the @import removed