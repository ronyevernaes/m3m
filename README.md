# m3m

> Local-first, AI-native knowledge base. Your markdown files, your data, your machine.

m3m is a desktop knowledge base that treats `.md` files on disk as the one true source of truth. SQLite indexes, vector embeddings, and sync state are all derived caches — always rebuildable. Everything works offline. AI runs on-device. You own your data completely.

---

## Philosophy

- **Files first.** Notes are plain `.md` files you can open in any editor, commit to git, or migrate away from m3m at any time.
- **Offline by default.** No account required. No cloud dependency. Every P0 feature works without a network connection.
- **AI on your hardware.** Semantic search and AI features run locally via [Ollama](https://ollama.com). Cloud AI is opt-in, BYOK.
- **No telemetry.** Nothing leaves your machine unless you explicitly enable sync or cloud AI.
- **Vaults are portable.** Each vault is a self-contained folder. The app is a manager of vaults, not a container.

---

## Features

### Core (P0)

| Feature | Description |
|---|---|
| Markdown editor | Block-level editor (TipTap/ProseMirror), writes plain `.md` on save |
| Vault watcher | `notify` crate rebuilds SQLite index on any `.md` change |
| Full-text search | SQLite FTS5 — fast, offline, no external service |
| Backlink panel | Derived at index time from frontmatter + inline wikilinks |
| Tag sidebar | Auto-derived from YAML frontmatter |
| Delete a note | Permanent file deletion with confirmation; hover trash icon in note list |
| Daily note | `YYYY-MM-DD.md`, auto-linked to the previous day |
| Graph view | React Flow — nodes are notes, edges are links |
| Vault Manager | Create, open, switch, rename, remove vaults |

### AI (P1 — requires Ollama or API key)

| Feature | Description |
|---|---|
| Semantic search | nomic-embed-text + LanceDB vector index |
| AI-inferred connections | Cosine similarity + named entities + temporal co-occurrence + shared tags |
| Contradiction detection | LLM compares new note against semantically similar older notes |
| Knowledge decay | Freshness score + spaced resurfacing with AI review prompt |
| Daily synthesis | On open: unresolved threads, new connections, open questions |
| Draft from vault | Synthesise your own notes into a draft on demand |
| Socratic mode | AI challenges your claims using contradicting vault evidence |
| Voice capture | Local Whisper → structured note, linked to existing notes |

### Sync & Capture (P2)

- **BYOS sync** — encrypt vault, write Automerge CRDT patches to S3 / Dropbox / iCloud
- **Managed sync (premium)** — Cloudflare Workers WebSocket relay, E2E encrypted, server never sees plaintext
- **Telegram bridge (premium)** — send text, voice, or images to `@m3mBot`; messages land in your vault inbox on next sync

---

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

---

## Vault Structure

Each vault is a self-contained folder. Multiple vaults can live anywhere on the filesystem.

```
~/Documents/WorkVault/
├── note-slug.md
├── subfolder/
│   └── nested-note.md
└── .vault/
    ├── meta.json           # vault id (ulid), name, created date
    ├── index.json          # note manifest, timestamps, tags
    ├── graph.json          # backlinks + outlinks per note id
    ├── embeddings.lance    # LanceDB vector index
    ├── settings.json       # vault-level prefs (AI backend, theme override)
    └── sync.bin            # Automerge doc (absent if sync off)
```

The app registry lives outside vaults at the platform-appropriate path:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/m3m/` |
| Windows | `%APPDATA%\m3m\` |
| Linux | `~/.local/share/m3m/` |

Deleting the registry loses vault history, not vault data — vaults are re-registerable by pointing the app at the folder.

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

---

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform

### Setup

```bash
git clone https://github.com/ronyevernaes/m3m
cd m3m
bun install
```

### Run

```bash
bun tauri dev
```

### Test

```bash
# Frontend (Vitest)
bun test:run

# Rust backend
cd src-tauri && cargo test
```

---

## Repo layout

```
src-tauri/          # Rust backend — Tauri commands, file watcher, SQLite, LanceDB
src/                # React frontend — editor, graph, search UI
src/lib/            # Shared TS utilities
src-tauri/src/
  commands/         # #[tauri::command] handlers (one file per domain)
  indexer.rs        # vault watcher + SQLite rebuild
  ai.rs             # Ollama HTTP client + embedding pipeline
  sync.rs           # Automerge CRDT + encryption
```

---

## Principles

1. `.md` files on disk are the source of truth. SQLite, LanceDB, and sync state are derived caches — always rebuildable.
2. Everything works offline. Cloud sync is an enhancement, never a dependency.
3. No telemetry. No account required for local features. Vaults are portable to any markdown editor.
4. AI runs on-device via Ollama by default. Cloud AI is opt-in BYOK fallback.
5. Each vault is self-contained and independently portable. The app is a manager of vaults, not a container.

---

## License

TBD
