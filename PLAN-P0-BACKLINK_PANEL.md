# Plan: Backlink Panel (P0 MVP)

## Context

Notes in m3m carry explicit outlinks in frontmatter: `links: [ulid1, ulid2]`. A backlink is the
reverse edge — if note A links to B, then B's backlink panel shows A. The `frontmatter::parse`
function already extracted `links`, but `index_file` discarded them — no `note_links` table
existed. This plan adds the link storage layer to SQLite, a `get_backlinks` query, and the
right-panel UI.

The vault watcher already emits `vault:index-updated` on every file change; the backlink panel
reuses that event to stay live without any new backend plumbing.

---

## Files Modified / Created

| File | Change |
|---|---|
| `src-tauri/src/indexer.rs` | `note_links` schema, link persistence in `index_file`, cleanup in `remove_file`, new `get_backlinks` fn |
| `src-tauri/src/models/note.rs` | Added `BacklinkItem` struct |
| `src-tauri/src/commands/graph.rs` | Implemented `get_backlinks` command (was empty) |
| `src-tauri/src/commands/mod.rs` | Added `pub mod graph` |
| `src-tauri/src/lib.rs` | Registered `commands::graph::get_backlinks` |
| `src-tauri/src/tests/indexer_test.rs` | Added 6 backlink tests |
| `src/types/note.ts` | Added `BacklinkItem` interface |
| `src/lib/ipc.ts` | Added `getBacklinks` IPC wrapper |
| `src/hooks/useBacklinks.ts` | New hook |
| `src/components/sidebar/BacklinkPanel.tsx` | New component |
| `src/App.tsx` | Added `BacklinkPanel` to right of editor |

---

## Implementation

### SQLite schema addition (`indexer.rs — bootstrap_schema`)

```sql
CREATE TABLE IF NOT EXISTS note_links (
    source_id  TEXT NOT NULL,
    target_id  TEXT NOT NULL,
    PRIMARY KEY (source_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links (target_id);
```

No FK on `target_id` — forward references are valid (a note may link to one not yet indexed).

### Link persistence (`indexer.rs — index_file`)

After the note upsert, inside the "hash changed" branch:

```rust
if !fm.id.is_empty() {
    sqlx::query("DELETE FROM note_links WHERE source_id = ?1")
        .bind(&fm.id).execute(pool).await?;
    for target_id in &fm.links {
        if target_id.is_empty() { continue; }
        sqlx::query(
            "INSERT OR IGNORE INTO note_links (source_id, target_id) VALUES (?1, ?2)"
        )
        .bind(&fm.id).bind(target_id).execute(pool).await?;
    }
}
```

Delete-then-insert clears stale links automatically when a user removes links from frontmatter.

### Link cleanup on delete (`indexer.rs — remove_file`)

Fetch `id` BEFORE deleting the note row, then clean `note_links`:

```rust
let note_id = sqlx::query_scalar("SELECT id FROM notes WHERE path = ?1")
    .bind(&rel).fetch_optional(pool).await?;
if let Some(id) = note_id {
    sqlx::query("DELETE FROM note_links WHERE source_id = ?1")
        .bind(&id).execute(pool).await?;
}
sqlx::query("DELETE FROM notes WHERE path = ?1").bind(&rel).execute(pool).await?;
```

### `get_backlinks` function (`indexer.rs`)

```rust
pub async fn get_backlinks(pool: &SqlitePool, note_id: &str) -> anyhow::Result<Vec<BacklinkItem>>
```

SQL:
```sql
SELECT n.id, n.path, n.title, n.modified
FROM note_links nl
JOIN notes n ON n.id = nl.source_id
WHERE nl.target_id = ?1
ORDER BY n.modified DESC
```

JOIN on `nl.source_id` ensures only fully-indexed source notes appear; dangling forward-reference
rows are harmlessly excluded.

### `commands/graph.rs` — Tauri command

```rust
#[tauri::command]
pub async fn get_backlinks(note_id: String, state: tauri::State<'_, AppState>)
    -> Result<Vec<BacklinkItem>, String>
```

Borrows pool from `AppState`. Returns empty vec (not error) when no vault is open.

### Frontend hook (`src/hooks/useBacklinks.ts`)

```typescript
export function useBacklinks(noteId: string | null) {
  // Fetches on noteId change + on vault:index-updated event
  return { backlinks, isLoading, error };
}
```

No Zustand — ephemeral per-note UI state.

### UI layout (`src/App.tsx`)

```
aside(w-64) | main(flex-1) | BacklinkPanel(w-64, only when currentNote set)
```

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| No FK on `note_links.target_id` | Intentional | Forward references must not cause index errors |
| `remove_file` ordering | Fetch id → delete links → delete note | Must fetch id before the row is gone |
| `BacklinkItem` vs `NoteListItem` | Dedicated type | Excludes `tags` (not displayed; avoids JSON parse per row) |
| Panel always visible when note open | No toggle for P0 | Simplicity; collapse is a P1 addition |
| `onOpenNote` prop on `BacklinkPanel` | Prop instead of `useVault` import | Clean dependency boundary |
| Forward reference behavior | Source appears as backlink immediately | Correct: id-future shows its backlinks even before it is created |

---

## Verification

1. `cargo test` — 25/25 pass (8 frontmatter + 11 indexer + 6 backlink)
2. `cargo check` — zero warnings
3. Note A links to B → B's panel shows A
4. External edit adds a link to B → panel refreshes within ~1 s
5. Remove link from A → A disappears from B's panel on next save
6. No note open → panel absent from layout
