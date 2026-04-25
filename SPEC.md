# m3m — Spec

> m3m — Local-first, AI-native knowledge base. Markdown files are the source of truth. User always owns their data.

## Core Principles

1. `.md` files on disk are the source of truth. SQLite, LanceDB, and sync state are derived caches — always rebuildable.
2. Everything works offline. Cloud sync is an enhancement, never a dependency.
3. No telemetry. No account required for local features. Vault is portable to any markdown editor.
4. AI runs on-device via Ollama by default. Cloud AI is opt-in BYOK fallback.

## Stack

### Desktop (macOS / Windows / Linux)

| Layer | Choice |
|---|---|
| Shell | Tauri |
| Frontend | React + TypeScript |
| Editor | TipTap (ProseMirror) |
| Graph UI | React Flow |
| Local DB | SQLite — sqlx |
| Vector DB | LanceDB (Rust SDK) |
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
| Auth | Clerk or Supabase Auth |
| Billing | Stripe |
| Telegram bridge | Cloudflare Worker + Telegram Bot API (shares sync infra) |

## Vault Structure

```
~/Documents/MyVault/
├── note-slug.md
├── subfolder/
│   └── nested-note.md
└── .vault/
    ├── index.json       # note manifest, timestamps, tags
    ├── graph.json       # backlinks + outlinks per note id
    ├── embeddings.lance # LanceDB vector index
    ├── settings.json    # user prefs, AI backend, theme
    └── sync.bin         # Automerge doc (absent if sync off)
```

### Note frontmatter

```yaml
---
id: <ulid>
title: string
created: ISO8601
modified: ISO8601
tags: [string]
links: [ulid]   # explicit outlinks; backlinks derived at index time
---
```

Unknown frontmatter keys are preserved — never removed by the app.

## Features

### P0 — MVP

- Markdown editor — block-level, writes plain `.md` on save
- Vault watcher — `notify` crate rebuilds SQLite index on `.md` change
- Full-text search — SQLite FTS5
- Backlink panel
- Tag sidebar — derived from frontmatter
- Daily note — `YYYY-MM-DD.md`, auto-links to previous day
- Graph view — React Flow, nodes = notes, edges = links
- Settings — vault path, theme, AI backend (local / cloud / off)

### P1 — AI (requires Ollama or API key)

- Semantic search — nomic-embed + LanceDB
- AI-inferred connections — cosine similarity + named entities + temporal co-occurrence + shared tags; rendered as "suggested links", user accepts/dismisses
- Contradiction detection — LLM compares new note against similar older notes
- Knowledge decay — freshness score, spaced resurfacing with AI review prompt
- Daily synthesis — on open: unresolved threads, new connections, questions
- Draft from vault — synthesise user's own notes into a draft on demand
- Socratic mode — AI challenges claims using contradicting vault evidence
- Voice capture — local Whisper → structured note, linked to existing notes

### P2 — Sync & Capture

- BYOS sync — encrypt vault, write CRDT patches to user-provided storage
- Managed sync (premium) — Cloudflare Workers WebSocket relay, E2E encrypted
- Conflict resolution UI — for the rare Automerge conflicts
- Telegram capture bridge (premium) — user links Telegram account via one-time
  code sent to `@MemorBot`; incoming text / voice / images queued in R2 as
  encrypted payloads; drained by desktop on next sync connection; voice runs
  through local Whisper pipeline on desktop; same E2E encryption as vault sync

### P3 — Power

- Smart paste — URL / PDF / screenshot → AI distils signal, links to vault
- Knowledge gap detector — surfaces assumed-but-unwritten topics while editing
- Temporal graph — timeline scrub of knowledge graph evolution
- BYOM — swap AI backend per-feature (Ollama / Claude API / OpenAI API)

## AI Architecture

```
React frontend
  └─ Tauri IPC (#[tauri::command])
       └─ Rust backend
            ├─ notify (file watcher)
            ├─ sqlx (SQLite index)
            ├─ LanceDB (vectors)
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

## Non-goals (v1)

- Multiplayer / real-time collaboration
- Web-only / browser app
- Public note sharing
- Plugin system
- Mobile-native UI (Capacitor WebView is acceptable)

## Open Questions

1. **iOS vault path** — Capacitor Filesystem vs iCloud Drive container
2. **Ollama distribution** — prompt user to install separately vs bundle llama.cpp bindings for a default small model
3. **BYOS sync engine** — Automerge vs git-based sync (simpler, more transparent to power users)
4. **Mobile AI scope** — which P1 features degrade gracefully vs desktop-only
5. **Pricing** — whether BYOS sync is free or paywalled

## Telegram Bridge Architecture

```
Mobile (Telegram app)
  │  text / voice / image
  ▼
Telegram Bot API (@MemorBot)
  │  webhook POST
  ▼
Cloudflare Worker (shares premium sync infra)
  │  authenticates: chat_id → user_id mapping (R2)
  │  encrypts payload (libsodium, same scheme as sync)
  │  queues as R2 object: telegram/{user_id}/{ulid}
  ▼
Desktop app — sync connection drains queue
  │  decrypt → write .md to vault inbox/
  │  voice .ogg → Whisper → structured note
  ▼
notify watcher → index → AI pipeline
```

**Onboarding flow:**
1. User opens Settings → Connect Telegram
2. App generates a one-time code tied to their account
3. User sends the code to `@MemorBot` in Telegram
4. Worker maps `chat_id ↔ user_id` and stores in R2
5. Confirmation message sent back via bot

**Incoming payload handling:**

| Type | Processing |
|---|---|
| Text | Written as `inbox/YYYY-MM-DD-HH-MM.md` with `source: telegram` frontmatter |
| Voice | Queued as `.ogg`, transcribed by Whisper on next desktop connection |
| Image | Saved to vault assets, triggers smart paste AI pipeline |
| Document | Saved to vault assets, linked from an inbox note |

**Offline behaviour:** payloads queue in R2 until desktop app connects. No message is lost. Queue TTL: 30 days.
