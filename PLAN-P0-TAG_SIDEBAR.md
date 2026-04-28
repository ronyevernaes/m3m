# Plan: Tag Sidebar (P0 MVP)

## Context

The tag sidebar shows all tags used across vault notes, with note counts, and lets the user
filter the notes list by clicking a tag. Tags are already stored in `notes.tags: string[]` in the
Zustand store (populated by `list_notes` from frontmatter) and in the SQLite index. No new Rust
code is needed — aggregation and filtering are done client-side from the in-memory notes array.

The `src/store/ui.ts` and `src/components/sidebar/TagList.tsx` files were empty placeholders
that were filled in by this plan.

---

## Files Modified

| File | Change |
|---|---|
| `src/store/ui.ts` | Implemented `useUiStore` with `selectedTag` / `setSelectedTag` |
| `src/components/sidebar/TagList.tsx` | New component — tag list with counts, selection state |
| `src/App.tsx` | Import TagList, filter notes by selected tag, reset on vault change |

**No Rust / IPC changes needed.**

---

## Implementation

### `src/store/ui.ts`

```typescript
import { create } from 'zustand';

interface UiState {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedTag: null,
  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));
```

### `src/components/sidebar/TagList.tsx`

Receives `notes: NoteListItem[]` as a prop. Derives tag counts internally. Reads and writes
`selectedTag` via `useUiStore` directly (no prop drilling needed; `App.tsx` reads the same store
to filter the notes list).

- Returns `null` when vault has no tags → nothing renders, no empty header shown
- Clicking a tag selects it; clicking the same tag again deselects (toggle)
- Tag counts come from the live `notes` array — automatically correct after any notes reload
- Layout: `flex-shrink-0 border-t border-border max-h-48 overflow-y-auto`

### `src/App.tsx` changes

1. Added imports for `TagList` and `useUiStore`
2. Reads `selectedTag` / `setSelectedTag` from `useUiStore`
3. `displayedNotes` = filtered subset when a tag is active, otherwise the full `notes` array
4. `vaultPath` effect resets `selectedTag` to `null` before reloading notes
5. Notes `<ul>` gets `min-h-0` so it shrinks correctly when TagList occupies space
6. `<TagList notes={notes} />` rendered inside `<aside>` above the vault path footer
7. `notes` (unfiltered) passed to TagList so counts reflect the whole vault

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Client-side aggregation | Derive from `notes` array | Zero backend changes; notes already carry `tags`; re-derives on every `vault:index-updated` reload |
| `useUiStore` for `selectedTag` | Zustand store (existing placeholder) | Avoids prop drilling; `App.tsx` and `TagList.tsx` share state cleanly |
| TagList receives `notes` prop | Not `useVaultStore` internally | Keeps the component testable and avoids coupling to global store |
| Count from unfiltered notes | Pass `notes` (not `displayedNotes`) | Tag counts always reflect the whole vault |
| Toggle on re-click | `selectedTag === tag ? null : tag` | Lets user dismiss filter without needing a separate "All" button |
| `return null` when no tags | Skip header entirely | Avoids rendering an empty "Tags" section on a fresh vault |
| `max-h-48 overflow-y-auto` | Fixed cap on tag list height | Left sidebar stays usable with many tags; notes list keeps `flex-1` |

---

## Verification

1. Open vault with tagged notes → Tags section appears below the notes list
2. Click a tag → notes list filters to only notes with that tag; tag has accent highlight
3. Click the same tag again → filter clears, all notes visible
4. Add a new tag to a note in an external editor → watcher fires `vault:index-updated` →
   `loadNotes()` runs → tag appears in the sidebar automatically
5. Switch vault path → tag filter resets to null, fresh tag list for new vault
6. Vault with no tags → Tags section is absent (no empty header)
