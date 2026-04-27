# Plan: Core Editor (P0)

## Context

Implementing the P0 Core Editor for m3m — a block-level Markdown editor using TipTap (ProseMirror) that reads from and writes to plain `.md` files via Tauri IPC. The codebase is a clean scaffold: all infrastructure and dependencies are installed, but zero feature code exists. This plan covers the full editor slice end-to-end — from the Rust filesystem commands up through the React UI.

---

## Dependency to install first

```bash
bun add @tauri-apps/api
```
`@tauri-apps/api` is missing from `package.json` — required for all Tauri `invoke()` calls in the frontend.

---

## Implementation order

### 1. TypeScript types — `src/types/note.ts`

```ts
export interface Frontmatter {
  id: string;
  title: string;
  created: string;   // ISO8601
  modified: string;  // ISO8601
  tags: string[];
  links: string[];   // ULIDs of explicit outlinks
  [key: string]: unknown; // preserve unknown keys
}

export interface Note {
  path: string;
  frontmatter: Frontmatter;
  body: string;      // raw markdown body (no frontmatter)
}

export interface NoteListItem {
  id: string;
  title: string;
  path: string;
  modified: string;
  tags: string[];
}
```

### 2. ULID util — `src/lib/ulid.ts`

```ts
import { ulid } from 'ulid';
export const newUlid = () => ulid();
export const isValidUlid = (s: string) => /^[0-9A-Z]{26}$/.test(s);
```

### 3. Frontmatter util — `src/lib/frontmatter.ts`

Uses `gray-matter` to parse and stringify. Key invariants:
- Unknown keys preserved via matter's data passthrough
- `id` assigned on first stringify (ULID) — never overwritten
- `created` set on first stringify — never overwritten
- `modified` updated on every stringify
- Tags serialized as inline flow list so the Rust line-scanner can read them

```ts
import matter from 'gray-matter';
import { newUlid } from './ulid';
import type { Note, Frontmatter } from '../types/note';

export function parseNote(content: string, path: string): Note {
  const { data, content: body } = matter(content);
  const fm = data as Frontmatter;
  return {
    path,
    frontmatter: {
      id: fm.id ?? '',
      title: fm.title ?? '',
      created: fm.created ?? '',
      modified: fm.modified ?? '',
      tags: fm.tags ?? [],
      links: fm.links ?? [],
      ...data, // preserve unknown keys
    },
    body: body.trimStart(),
  };
}

export function stringifyNote(note: Note): string {
  const now = new Date().toISOString();
  const fm: Frontmatter = {
    ...note.frontmatter,
    id: note.frontmatter.id || newUlid(),
    created: note.frontmatter.created || now,
    modified: now,
  };
  return matter.stringify('\n' + note.body, fm);
}
```

### 4. Markdown ↔ TipTap conversion — `src/lib/markdown.ts` *(new file)*

**Approach chosen: remark/unified pipeline** (already installed). Do NOT install `@tiptap/extension-markdown` — remark gives full control and keeps the stack simpler.

- `markdownToTipTap(markdown: string): JSONContent` — uses `remark-parse` to build an mdast, then walks it to produce ProseMirror JSON
- `tipTapToMarkdown(json: JSONContent): string` — walks ProseMirror JSON and produces an mdast, then serializes with `remark-stringify`

Key challenge: ProseMirror uses a flat `[text, marks[]]` model while mdast uses nested wrapper nodes for marks. The `flattenInline` helper converts between them.

Lists must be serialized with `spread: false` on both the `list` and each `listItem` node, otherwise remark-stringify adds blank lines between items.

Expose:
```ts
export function markdownToTipTap(md: string): JSONContent
export function tipTapToMarkdown(json: JSONContent): string
```

### 5. IPC helpers — `src/lib/ipc.ts`

```ts
import { invoke } from '@tauri-apps/api/core';
import type { NoteListItem } from '../types/note';

export const listNotes = (vaultPath: string) =>
  invoke<NoteListItem[]>('list_notes', { vaultPath });

export const readNote = (path: string) =>
  invoke<{ path: string; content: string }>('read_note', { path });

export const writeNote = (path: string, content: string) =>
  invoke<string>('write_note', { path, content });

export const createNote = (vaultPath: string, title: string) =>
  invoke<{ path: string; content: string }>('create_note', { vaultPath, title });
```

### 6. Rust models — `src-tauri/src/models/`

**`src-tauri/src/models/mod.rs`**
```rust
pub mod note;
```

**`src-tauri/src/models/note.rs`**
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteListItem {
    pub id: String,
    pub title: String,
    pub path: String,
    pub modified: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNote {
    pub path: String,
    pub content: String,
}
```
Rust does not parse YAML frontmatter in P0 — parsing lives in the TS layer. `list_notes` uses a fast line-scan of the frontmatter block.

### 7. Rust commands — `src-tauri/src/commands/notes.rs`

Four commands:

| Command | Signature |
|---|---|
| `list_notes` | `(vault_path: String) -> Result<Vec<NoteListItem>, String>` |
| `read_note` | `(path: String) -> Result<RawNote, String>` |
| `write_note` | `(path: String, content: String) -> Result<String, String>` |
| `create_note` | `(vault_path: String, title: String) -> Result<RawNote, String>` |

`list_notes`:
- Reads directory entries with `std::fs::read_dir`
- Skips non-`.md` files and anything under `.vault/`
- Line-scans frontmatter block for `id:`, `title:`, `modified:`, `tags:` (fast, no YAML crate)
- Assumes gray-matter writes tags as inline `[a, b]` flow list
- Results sorted by `modified` descending

`create_note`:
- Slugifies the title → filename
- Resolves filename collisions by appending a counter
- Writes an empty file (TS side populates frontmatter on first save)

`write_note`:
- Creates parent dirs if needed (`fs::create_dir_all`)
- Overwrites the file

Note: Uses blocking `std::fs` (not `tokio::fs`) — acceptable for P0 note sizes. Async file I/O is a P1 concern.

### 8. Register commands — `src-tauri/src/commands/mod.rs`

```rust
pub mod notes;
```

### 9. Update `src-tauri/src/lib.rs`

Add `mod commands; mod models;` at the top, add `.invoke_handler(tauri::generate_handler![...])` with all four commands before `.run(...)`.

### 10. Zustand store — `src/store/vault.ts`

State shape:
- `vaultPath: string | null`
- `notes: NoteListItem[]`
- `currentNote: Note | null`
- `isDirty: boolean`
- `isLoading: boolean`
- `error: string | null`

Actions: `setVaultPath`, `setNotes`, `setCurrentNote`, `updateCurrentNoteBody` (sets `isDirty = true` only when a note is open), `markClean`, `setLoading`, `setError`.

### 11. Hook — `src/hooks/useVault.ts`

Wraps async IPC calls with loading/error state management. Exposes: `loadNotes`, `openNote(path)`, `saveCurrentNote`, `newNote(title?)`.

`saveCurrentNote` calls `stringifyNote` (which stamps `id` + `modified`) then `writeNote`, then re-parses to sync state, then refreshes the notes list.

### 12. Editor component — `src/components/editor/Editor.tsx`

TipTap setup:
- Extensions: `StarterKit.configure({ codeBlock: false })`, `Link`, `CodeBlockLowlight`
- `createLowlight(all)` outside the component (singleton)

Key patterns:
- `suppressUpdate` ref: guards against infinite loop (`setContent` → `onUpdate` → `updateCurrentNoteBody` → re-render → `setContent`)
- `useEffect` keyed on `currentNote?.path` (not the full object) — fires only when a different file opens
- `onUpdate`: calls `tipTapToMarkdown(editor.getJSON())` → `store.updateCurrentNoteBody(markdown)`
- Cmd+S / Ctrl+S via `window.addEventListener('keydown', ...)` in a `useEffect`
- TipTap v3: `setContent` takes no boolean second arg — suppression handled entirely by the ref

UI structure:
1. Metadata bar — note title + "Unsaved changes" badge + Save button
2. Toolbar
3. Scrollable editor body (`EditorContent`)

Empty state: "Select or create a note to start editing."

### 13. Toolbar — `src/components/editor/EditorToolbar.tsx`

Buttons: Bold, Italic, Strikethrough, Inline code, H1/H2/H3, HR, Bullet list, Ordered list, Code block, Link (P0: `window.prompt` for URL — replace with popover in P1).

Active state driven by `editor.isActive(...)`.

### 14. App shell — `src/App.tsx`

Replace Vite boilerplate. Layout: sidebar (note list + "New" button) + main editor panel.

Vault path for P0 dev: hardcoded `/tmp/m3m-dev-vault` with a `// TODO: replace with vault picker (Vault Manager, P0)` comment. The Vault Manager feature will replace this.

Also fix `src/index.css`: remove `max-width: 1126px`, `text-align: center`, and `padding` from `#root` — these break the full-screen layout.

---

## Files touched

| File | Action |
|---|---|
| `src/types/note.ts` | Write |
| `src/lib/ulid.ts` | Write |
| `src/lib/frontmatter.ts` | Write |
| `src/lib/markdown.ts` | Create (new file) |
| `src/lib/ipc.ts` | Write |
| `src/store/vault.ts` | Write |
| `src/hooks/useVault.ts` | Write |
| `src/components/editor/Editor.tsx` | Write |
| `src/components/editor/EditorToolbar.tsx` | Write |
| `src/App.tsx` | Replace boilerplate |
| `src/index.css` | Fix `#root` styles |
| `src-tauri/src/models/mod.rs` | Create |
| `src-tauri/src/models/note.rs` | Create |
| `src-tauri/src/commands/notes.rs` | Write |
| `src-tauri/src/commands/mod.rs` | Write |
| `src-tauri/src/lib.rs` | Add modules + invoke_handler |

---

## Tests

**`src/lib/ulid.test.ts`** — `newUlid()` returns 26-char string; `isValidUlid()` works.

**`src/lib/frontmatter.test.ts`** — roundtrip preserves unknown keys; `id` assigned on first stringify; `modified` updates on every call; `created` stays fixed.

**`src/lib/markdown.test.ts`** — roundtrip fixtures for: heading, bold/italic nested, inline code, code block with language, bullet list, ordered list, link, blockquote. Assert `tipTapToMarkdown(markdownToTipTap(input)) === input`.

**`src/store/vault.test.ts`** — `updateCurrentNoteBody` sets `isDirty`; `setCurrentNote` resets `isDirty`; `markClean` clears it.

**`src/hooks/useVault.test.ts`** — mock `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))`. Verify `openNote` calls `invoke('read_note', ...)` and dispatches to store; `saveCurrentNote` calls `invoke('write_note', ...)`.

---

## Risks

| Risk | Mitigation |
|---|---|
| `gray-matter` is CJS in an ESM project | Add `optimizeDeps: { include: ['gray-matter'] }` to `vite.config.ts` if default import fails |
| mdast mark nesting (bold inside italic, etc.) | Implement and test `flattenInline` helper independently before integrating into `markdown.ts` |
| `suppressUpdate` loop in React StrictMode | Ref is synchronous; `setContent` is synchronous — suppression window is correctly scoped within the same tick, safe in StrictMode |
| `list_notes` line-scan assumes flow-style tags | Enforce `tags` as inline list in `stringifyNote` and verify with a frontmatter roundtrip test |
| TipTap v3 `setContent` API change | Second arg is no longer a boolean — use `suppressUpdate` ref instead of `emitUpdate: false` |

---

## Running the app

```bash
# Install Tauri CLI (one-time)
bun add -d @tauri-apps/cli

# Create dev vault
mkdir /tmp/m3m-dev-vault

# Launch (starts Vite + compiles Rust + opens window)
bun tauri dev
```

First run compiles all Rust dependencies — takes 2–3 minutes. Subsequent runs are fast.

## Verification checklist

- [ ] `bun add @tauri-apps/api` — appears in `package.json`
- [ ] `bun test:run` — 32 tests pass
- [ ] `cargo check` (from `src-tauri/`) — compiles clean
- [ ] `bun tauri dev` — desktop window opens
- [ ] Sidebar lists `.md` files from vault directory
- [ ] Opening a note renders its body in TipTap
- [ ] Editing + Cmd+S writes the file to disk
- [ ] Reloading the app — content persists
- [ ] "+ New" creates a file in the vault directory
