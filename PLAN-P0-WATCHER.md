# Plan: Vault Watcher + SQLite Index (P0 MVP)

## Context

m3m is a local-first knowledge base where `.md` files are the source of truth. SQLite is a
derived, rebuildable cache at `.vault/index.db`. This plan implements two tightly-coupled P0
features:

1. **Vault watcher** — `notify` crate fires on any `.md` change → re-parse frontmatter → upsert SQLite
2. **Full-text search** — SQLite FTS5 over note titles and bodies

Currently `indexer.rs` is empty, no SQLite writes happen anywhere, and the frontend search files
are stubs. The `list_notes` command reads from the filesystem on every call; after this feature,
search goes through SQLite while `list_notes` continues to read from disk (source of truth
principle).

> **Note:** The existing `list_notes` only scans the vault root (non-recursive). The indexer
> will scan recursively. Fixing `list_notes` to be recursive is a follow-up, not part of this plan.

---

## Why SQLite + Watcher (Not Overengineering)

| Feature | Without SQLite | With SQLite |
|---|---|---|
| Full-text search | Read every file on every keystroke — unusable at 500+ notes | FTS5 indexed, instant |
| Backlink panel | Scan all files to find who links here | Single `SELECT` query |
| Tag sidebar | Scan all files to aggregate tags | Aggregated in index |

The watcher is necessary because `.md` files are the source of truth and users edit them in
other editors. Without a watcher, the app state goes stale until manual reload.

**Sync is NOT part of this plan.** Sync (Automerge, CRDT, cloud) is P2 — a completely separate
feature.

---

## Files to Create / Modify

### New files

| Path | Purpose |
|---|---|
| `src-tauri/src/frontmatter.rs` | Shared frontmatter parser (extracted + enhanced from `commands/notes.rs`) |
| `src-tauri/src/commands/vault.rs` | `open_vault` Tauri command |

### Modified files

| Path | Change |
|---|---|
| `src-tauri/Cargo.toml` | Add `sha2 = "0.10"` dep + `tempfile = "3"` dev-dep |
| `src-tauri/src/lib.rs` | Add module declarations, `AppState`, `.manage()`, register new commands |
| `src-tauri/src/indexer.rs` | Full implementation (currently empty) |
| `src-tauri/src/commands/mod.rs` | Export `vault` and `search` modules |
| `src-tauri/src/commands/notes.rs` | Replace inline `extract_list_item` with `crate::frontmatter::parse` |
| `src-tauri/src/commands/search.rs` | Implement `search_notes` (currently empty) |
| `src-tauri/src/models/note.rs` | Add `SearchResult` struct |
| `src-tauri/src/tests/indexer_test.rs` | Async unit tests |
| `src-tauri/src/tests/frontmatter_test.rs` | Unit tests for pure parser |
| `src/types/note.ts` | Add `SearchResult` interface |
| `src/lib/ipc.ts` | Add `openVault` and `searchNotes` wrappers |
| `src/hooks/useVault.ts` | Add `initVault` (calls `open_vault`, sets up event listener) |
| `src/hooks/useSearch.ts` | Full implementation (currently empty) |

---

## Implementation Steps

### Step 1 — Cargo.toml

Add to `[dependencies]`:
```toml
sha2 = "0.10"
```
Add to `[dev-dependencies]`:
```toml
tempfile = "3"
```

---

### Step 2 — `src-tauri/src/frontmatter.rs` (new)

Extract and enhance the logic from `commands/notes.rs::extract_list_item`. Expose:

```rust
pub struct Frontmatter {
    pub id: String,
    pub title: String,
    pub created: String,
    pub modified: String,
    pub tags: Vec<String>,
    pub links: Vec<String>,
}

pub struct ParsedMd {
    pub frontmatter: Frontmatter,
    pub body: String,       // raw markdown after closing ---
}

/// Pure function — never panics.
/// Unknown frontmatter keys are silently ignored (never removed from source file).
pub fn parse(content: &str) -> ParsedMd
```

Parser logic (state machine over lines):
- `i == 0 && line == "---"` → enter frontmatter
- `in_fm && line == "---"` → exit; remaining lines are `body`
- Inline list: `tags: [a, b]` via existing `parse_inline_yaml_list` helper
- Multi-line list: when `tags:` has empty value, collect `- item` lines until a non-list line

The `body` field is everything after the closing `---`, stripped of the leading newline.

Why no `serde_yaml`: the unknown-key preservation requirement is simpler with a custom parser;
`serde_yaml` would need extra boilerplate to preserve unknown fields and adds compile cost.

---

### Step 3 — `src-tauri/src/tests/frontmatter_test.rs`

All `#[test]` (sync — `parse` is pure):
1. Full frontmatter with all fields → correct struct values
2. No frontmatter block → empty `Frontmatter`, full content as body
3. Inline tags `[a, b, c]` → `vec!["a", "b", "c"]`
4. Multi-line tags list → same result as inline
5. Missing `id` field → empty string (no panic)
6. Only `---` delimiters, no content → no panic

---

### Step 4 — Refactor `commands/notes.rs`

Replace the inline `extract_list_item` and `parse_inline_yaml_list` helpers with
`crate::frontmatter::parse`. Behavior is preserved; the local helpers are removed.

```rust
use crate::frontmatter;

let parsed = frontmatter::parse(&content);
let item = NoteListItem {
    id: parsed.frontmatter.id,
    title: if parsed.frontmatter.title.is_empty() { /* filename fallback */ }
           else { parsed.frontmatter.title },
    path: file_path.to_string_lossy().to_string(),
    modified: parsed.frontmatter.modified,
    tags: parsed.frontmatter.tags,
};
```

---

### Step 5 — `src-tauri/src/models/note.rs`

Add:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub path: String,
    pub title: String,
    pub snippet: String,   // FTS5 snippet() output with <mark> tags
    pub tags: Vec<String>,
}
```

---

### Step 6 — `src-tauri/src/indexer.rs` (full implementation)

#### SQLite schema (bootstrapped inline via `sqlx::query`)

```sql
CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    path       TEXT NOT NULL UNIQUE,      -- relative to vault root
    title      TEXT NOT NULL DEFAULT '',
    created    TEXT NOT NULL DEFAULT '',
    modified   TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '[]', -- JSON array
    body       TEXT NOT NULL DEFAULT '',
    body_hash  TEXT NOT NULL DEFAULT '',   -- SHA-256 of full file content
    indexed_at TEXT NOT NULL DEFAULT ''
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    title, body, tags,
    content='notes',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, body, tags)
    VALUES (new.rowid, new.title, new.body, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, body, tags)
    VALUES ('delete', old.rowid, old.title, old.body, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, body, tags)
    VALUES ('delete', old.rowid, old.title, old.body, old.tags);
    INSERT INTO notes_fts(rowid, title, body, tags)
    VALUES (new.rowid, new.title, new.body, new.tags);
END;
```

#### Public API

```rust
/// Open or create `.vault/index.db`. Bootstrap schema. Return pool.
pub async fn open_db(vault_root: &Path) -> anyhow::Result<SqlitePool>

/// Walk vault recursively, upsert each .md (skip .vault/). Returns count of files processed.
pub async fn index_vault(pool: &SqlitePool, vault_root: &Path) -> anyhow::Result<usize>

/// Index one file. If body_hash matches stored hash, skip upsert (idempotent).
/// If file does not exist, delegates to remove_file.
pub async fn index_file(pool: &SqlitePool, path: &Path, vault_root: &Path) -> anyhow::Result<()>

/// Remove note from index by relative path.
pub async fn remove_file(pool: &SqlitePool, path: &Path, vault_root: &Path) -> anyhow::Result<()>

/// FTS5 MATCH query. Returns SearchResult vec sorted by BM25 rank.
pub async fn search(pool: &SqlitePool, query: &str, limit: u32) -> anyhow::Result<Vec<SearchResult>>

fn walk_md_files(dir: &Path) -> Vec<PathBuf>   // recursive, skips .vault/
fn hash_content(content: &str) -> String        // SHA-256 hex via sha2
fn path_to_relative(path: &Path, vault_root: &Path) -> String
```

Paths stored **relative to vault root** so the index remains portable if the vault moves.

`body_hash` is the idempotency key: `index_file` computes `SHA-256(file_content)`, compares to
stored `body_hash`, and skips the upsert if they match. This eliminates the need for timer-based
debouncing — the second event from an atomic-rename save is a no-op.

FTS5 search SQL:
```sql
SELECT n.id, n.path, n.title, n.tags,
    snippet(notes_fts, 1, '<mark>', '</mark>', '…', 20) AS snippet
FROM notes_fts
JOIN notes n ON notes_fts.rowid = n.rowid
WHERE notes_fts MATCH ?1
ORDER BY notes_fts.rank
LIMIT ?2
```

---

### Step 7 — `src-tauri/src/tests/indexer_test.rs`

All `#[tokio::test]` using `SqlitePool::connect("sqlite::memory:")` and `tempfile::TempDir`:
1. `bootstrap_schema` is idempotent (runs twice without error)
2. `index_file` inserts a row; re-calling with same content skips upsert (`body_hash` unchanged)
3. `index_file` with different content updates the row
4. `remove_file` deletes the row and FTS entry
5. `search` on empty vault returns empty vec
6. `search` after indexing finds a note by title keyword and by body keyword
7. `index_vault` on temp dir with 3 `.md` files returns 3; re-running returns 0
8. `index_vault` skips files inside a `.vault/` subdirectory

---

### Step 8 — `src-tauri/src/lib.rs`

Add module declarations and managed state:

```rust
mod commands;
mod frontmatter;
mod indexer;
mod models;

use std::sync::Mutex;
use notify::RecommendedWatcher;
use sqlx::SqlitePool;
use std::path::PathBuf;

pub struct VaultContext {
    pub vault_root: PathBuf,
    pub db: SqlitePool,
    /// Kept alive by ownership. Drop = watcher stops (RAII).
    pub _watcher: RecommendedWatcher,
}

pub struct AppState {
    pub vault: Mutex<Option<VaultContext>>,
}
```

Register in builder:
```rust
.manage(AppState { vault: Mutex::new(None) })
.invoke_handler(tauri::generate_handler![
    commands::notes::list_notes,
    commands::notes::read_note,
    commands::notes::write_note,
    commands::notes::create_note,
    commands::vault::open_vault,
    commands::search::search_notes,
])
```

---

### Step 9 — `src-tauri/src/commands/vault.rs` (new)

```rust
#[tauri::command]
pub async fn open_vault(
    vault_path: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<usize, String>
```

Flow:
1. Validate directory exists.
2. Create `.vault/` subdir if absent.
3. `indexer::open_db(path)` → `SqlitePool`.
4. `indexer::index_vault(&pool, path)` → note count.
5. Start watcher (below).
6. Replace `state.vault` lock with `Some(VaultContext { ... })` — dropping the old value stops
   the previous watcher automatically.
7. Return note count.

Watcher start pattern:

```rust
fn start_watcher(
    vault_root: PathBuf,
    pool: SqlitePool,
    app_handle: tauri::AppHandle,
) -> notify::Result<RecommendedWatcher> {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<notify::Result<notify::Event>>();

    // notify callback is sync — forward to the async task via mpsc
    let mut watcher = notify::recommended_watcher(move |res| { let _ = tx.send(res); })?;
    watcher.watch(&vault_root, RecursiveMode::Recursive)?;

    let root = vault_root.clone();
    tokio::spawn(async move {
        while let Some(Ok(event)) = rx.recv().await {
            for path in &event.paths {
                if path.extension().and_then(|e| e.to_str()) != Some("md") { continue; }
                if path.to_string_lossy().contains("/.vault/") { continue; }
                use notify::EventKind::*;
                match event.kind {
                    Remove(_) => { let _ = indexer::remove_file(&pool, path, &root).await; }
                    _         => { let _ = indexer::index_file(&pool, path, &root).await; }
                }
            }
            let _ = app_handle.emit("vault:index-updated", ());
        }
        // Channel closed when VaultContext is dropped → task exits cleanly
    });

    Ok(watcher)
}
```

---

### Step 10 — `src-tauri/src/commands/search.rs`

```rust
#[tauri::command]
pub async fn search_notes(
    query: String,
    limit: Option<u32>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SearchResult>, String>
```

Borrows `pool` from `state.vault`. Returns empty vec (not an error) if no vault is open.

---

### Step 11 — `src-tauri/src/commands/mod.rs`

```rust
pub mod notes;
pub mod vault;
pub mod search;
```

---

### Step 12 — `src/types/note.ts`

```typescript
export interface SearchResult {
  id: string;
  path: string;
  title: string;
  snippet: string;   // contains <mark> tags from FTS5 snippet()
  tags: string[];
}
```

---

### Step 13 — `src/lib/ipc.ts`

```typescript
export const openVault = (vaultPath: string) =>
  invoke<number>('open_vault', { vaultPath });

export const searchNotes = (query: string, limit = 20) =>
  invoke<SearchResult[]>('search_notes', { query, limit });
```

---

### Step 14 — `src/hooks/useVault.ts`

Add `initVault`: sets vault path, calls `openVault`, loads notes, subscribes to
`vault:index-updated` Tauri events to refresh the sidebar on external file changes.

```typescript
import { listen } from '@tauri-apps/api/event';
import { openVault } from '../lib/ipc';

const initVault = useCallback(async (path: string) => {
  store.setVaultPath(path);
  store.setLoading(true);
  store.setError(null);
  try {
    await openVault(path);
    const items = await listNotes(path);
    store.setNotes(items);
  } catch (err) {
    store.setError(String(err));
  } finally {
    store.setLoading(false);
  }
  const unlisten = await listen('vault:index-updated', () => loadNotes());
  return unlisten; // caller must invoke on component unmount
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Expose `initVault` in `useVault()` return value.

---

### Step 15 — `src/hooks/useSearch.ts`

```typescript
export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setIsSearching(true);
    try {
      setResults(await searchNotes(query.trim()));
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { results, isSearching, error, search, clearSearch: () => setResults([]) };
}
```

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Frontmatter parser | Custom `frontmatter.rs`, no `serde_yaml` | Unknown-key preservation; existing logic correct; no extra dep |
| FTS sync | Content table + triggers | Automatic consistency on all write paths |
| Change detection | `sha2` body hash in `body_hash` column | Idempotent by nature; no timer debounce needed |
| Watcher lifecycle | RAII — owned in `VaultContext`, stops on drop | No shutdown channel; Rust ownership handles cleanup |
| Watcher → async bridge | `tokio::sync::mpsc::unbounded_channel` | Standard pattern for sync notify callback → async tokio handler |
| Paths in SQLite | Relative to vault root | Index is portable when vault folder is moved |
| `list_notes` | Keep reading from filesystem | Source of truth is disk; index is a search cache |
| `snippet` rendering | `dangerouslySetInnerHTML` | FTS5 output is device-local user data; `<mark>` tags are hardcoded in SQL |

---

## Verification

1. **Rust unit tests**: `cargo test` from `src-tauri/` — all tests in `frontmatter_test.rs` and
   `indexer_test.rs` pass
2. **Compile check**: `cargo check` from `src-tauri/`
3. **Integration — initial index**: launch app, open a vault → sidebar shows all notes
4. **Integration — live watcher**: create a `.md` file outside the app → sidebar refreshes within ~1 s
5. **Integration — search**: type a body keyword into the search bar → matching note appears with
   `<mark>`-highlighted snippet
6. **Integration — vault switch**: open a second vault → first watcher stops (no duplicate events
   from old path in logs)
