# CLAUDE.md

Full spec: `SPEC.md` — read it before any non-trivial task.

## What this is

m3m — Local-first, AI-native knowledge base. Tauri (Rust) + React/TS desktop app.
Markdown files on disk are the canonical data store. Everything else is a cache.

Repo: https://github.com/ronyevernaes/m3m

## Repo layout

```
src-tauri/src/
  commands/       # #[tauri::command] handlers (one file per domain)
  registry.rs     # read/write registry.json (vault list); no Tauri types — pure std
  indexer.rs      # vault watcher + SQLite rebuild
  frontmatter.rs  # custom YAML frontmatter parser
  ai.rs           # stub — Ollama integration (P1)
  sync.rs         # stub — Automerge CRDT (P2)
src/
  components/     # React UI — includes components/vault/ for Vault Manager UI
  hooks/          # useVault, useVaultRegistry, useBacklinks, useSearch, useAI
  store/          # Zustand stores: vault.ts (notes + registry state), ui.ts, settings.ts
  types/          # TypeScript interfaces: note.ts, vault.ts, graph.ts
  lib/            # frontmatter.ts, markdown.ts, ulid.ts, ipc.ts, cn.ts
.vault/           # Runtime-generated, never commit
```

## Hard rules

- `.md` files are the source of truth — never write app state into them beyond frontmatter
- Never remove unknown frontmatter keys
- All SQLite / LanceDB / sync state must be rebuildable from `.md` files alone
- No network calls from any P0 feature — offline must always work
- Vault contents never leave the device unless user explicitly enables cloud AI or sync
- Every UI element has to be wrapped in a React component. Reuse as much as possible. Find patters and refactor. Make the code clean and comprehensive avoiding repetitiveness and verbosity. Use SOLID principles as long as they make sense. No multiple React components allowed in a single file. One component, one file.
- Inline styles and ModuleCSS have to be avoided. Use TailwindCSS. If patterns emerge, create TailwindCSS components.

## Stack at a glance

| What | Choice |
|---|---|
| Desktop shell | Tauri |
| Frontend | React + TypeScript |
| Editor | TipTap |
| Graph | React Flow |
| Local DB | SQLite via sqlx |
| Vectors | LanceDB (Rust SDK) |
| AI | Ollama sidecar → `localhost:11434` |
| Mobile | Capacitor (same React codebase) |
| Sync | Automerge CRDT + libsodium |
| Telegram bridge | Cloudflare Worker + Telegram Bot API (premium) |

## Key patterns

**Tauri IPC** — all backend calls go through `#[tauri::command]`. No direct filesystem access from the frontend. IPC bridge lives in `src/lib/ipc.ts`.

**Registry** — `registry.rs` reads/writes `app_data_dir()/m3m/registry.json`. Load-mutate-save on every write (no in-memory cache). All vault commands call `registry_path(app_handle.path().app_data_dir())` to resolve the path at runtime.

**Indexer** — `notify` watcher fires on any `.md` save → re-parse frontmatter → upsert SQLite → emit `vault:index-updated` event. Idempotent. Currently scans vault root only (non-recursive).

**Reactive updates** — frontend hooks (`useVault`, `useBacklinks`) listen for the `vault:index-updated` Tauri event to refresh state without polling.

**File naming** — `{slug}-{ulid}.md`. Generated on create; renamed automatically when the note title changes.

**AI calls** — always check `settings.ai_backend` first: `local` → Ollama, `cloud` → user API key, `off` → disable AI UI. Never hardcode a model name; read from settings.

**Frontmatter id** — use ULID. Generate on first save if absent. Never change after creation. `links[]` are explicit outlinks only — body wikilink extraction is not implemented yet.

## Prompt conventions

When starting work on a specific area, include the relevant section from `SPEC.md`:
- New feature → paste the feature bullet + P-level
- Sync work → paste `## Sync Architecture` from SPEC
- AI work → paste `## AI Architecture` from SPEC
- Stack question → paste `## Stack` from SPEC
- Telegram bridge work → paste `## Telegram Bridge Architecture` from SPEC

## Testing conventions

**Frontend — Vitest**
- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Coverage targets: `src/lib/`, `src/store/`, `src/hooks/` — pure logic only
- Skip component tests unless behaviour is non-trivial; UI is low ROI in Tauri env
- Mock Tauri IPC: `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))`
- Commands: `bun test:run` · `bun test:ui` · `bun test:coverage`

**Rust — cargo test**
- Test files: `src-tauri/src/tests/` — one file per domain module
- Keep Tauri commands thin; test the underlying functions they call
- High-value targets: indexer, frontmatter parser, registry, CRDT merge, encrypt/decrypt round-trips
- Command: `cargo test` (run from `src-tauri/`)

**What not to test**
- Tauri command wrappers directly (require runtime)
- React component markup (snapshot tests)
- Third-party library behaviour (TipTap, React Flow, Automerge internals)

# Design System Rules — Tailwind CSS

- All colors via tailwind.config.ts theme tokens (e.g. `bg-brand-500`, never `bg-[#3B82F6]`)
- Use `cn()` from lib/utils for all conditional classes
- Variants via cva() (class-variance-authority) — not inline ternaries
- Dark mode via `dark:` prefix (class strategy)
- No inline styles, no arbitrary values unless truly one-off
- Every component accepts a `className` prop for consumer overrides
- Spacing follows the 4px grid: use scale values (p-2, p-4, gap-6), not arbitrary
