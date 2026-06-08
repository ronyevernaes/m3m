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

**Frontmatter id** — use ULID. Generate on first save if absent. Never change after creation. Not surfaced in the Details tab — internal identifier only. `links[]` is auto-populated on every save by extracting `[[wikilinks]]` from the note body and resolving note titles to ULIDs via the vault store. Never write to `links[]` manually from the frontend — let `saveCurrentNote` in `useVault.ts` handle it via `extractWikilinkTitles` + `resolveLinksToIds` (`src/lib/wikilinkSync.ts`).

**Wikilinks** — `[[Note Title]]` in the note body is the canonical link syntax. The `WikilinkExtension` (TipTap inline atom node) renders these as styled chips and provides `[[` autocomplete. On save, all wikilink titles are resolved to ULIDs and written to `links[]` in frontmatter so the Rust indexer can populate `note_links` without any backend changes.

**Blockquotes** — `> ` typed at the start of a line auto-converts to a blockquote block via StarterKit's built-in input rule (no custom extension needed). The toolbar `>` button calls `toggleBlockquote()`. Styled in `src/index.css` under `.ProseMirror blockquote` with `var(--accent-border)` left border and muted italic text. Serializes to/from `>` markdown via `markdown.ts` (already handled before this feature was surfaced in the UI).

**Editor typography** — All heading levels `h1`–`h6` inside `.ProseMirror` are explicitly styled in `src/index.css` using `var(--heading)` font (Bricolage Grotesque), `color: var(--text-h)`, and a size scale from `2em` (h1) down to `0.9em` (h6). These `.ProseMirror h*` rules are required because the global `h1`/`h2` rules (56 px / 24 px) exist for non-editor contexts and leave `h3`–`h6` unstyled. Inline marks (`strong`, `b`, `em`, `i`) carry explicit `font-weight`/`font-style` and `color: inherit` — Tailwind v4's preflight strips browser defaults for these elements, which causes them to render black in dark mode without the `color: inherit` override.

**Markdown links** — `[Label](url)` syntax is handled by `LinkExtension` (`src/components/editor/extensions/LinkExtension.ts`), which extends TipTap's `@tiptap/extension-link` with a custom `InputRule` (auto-converts on `)`) and a `markPasteRule` (bare URLs). The `LinkTooltip` component (`src/components/editor/LinkTooltip.tsx`) is a `BubbleMenu` that appears on any link and allows opening, editing (label + URL), or unlinking. Opening URLs goes through `openUrl` in `src/lib/ipc.ts`, which normalises schemeless URLs to `https://` before calling `plugin:opener|open_url`. `window.prompt` is unavailable in Tauri's webview — the toolbar uses an inline input state instead.

**Note properties** — custom frontmatter keys (any key that is not `id`, `title`, `created`, `modified`, `tags`, `links`) are editable in the Details tab of the context panel. `SYSTEM_KEYS` is defined at module level in `AddPropertyRow.tsx` and mirrored in `DetailsTab.tsx` for filtering. Store actions `updateCurrentNoteFrontmatterKey` / `deleteCurrentNoteFrontmatterKey` in `vault.ts` handle mutations and mark the note dirty. All property values are stored as strings; `gray-matter` serialises them correctly in YAML. Save is triggered immediately after each mutation (same fire-and-forget pattern as the title input in `Editor.tsx`).

**Tags** — `frontmatter.tags: string[]` is the source of truth. Tag visualization uses `TagPill` (`src/components/ui/TagPill.tsx`) — a CVA component with three variants: `default` (read-only), `interactive` (clickable, used in sidebar), `removable` (with × button, used in the Details tab). Tag editing lives in `TagEditorSection` (`src/components/context-panel/TagEditorSection.tsx`): renders existing tags as removable chips, accepts new tags on Enter/comma (trimmed + lowercased, deduped), autocomplete dropdown derived from all vault notes. Store actions `addTagToCurrentNote` / `removeTagFromCurrentNote` in `vault.ts` handle mutations and mark the note dirty. Save is triggered immediately after each mutation (same fire-and-forget pattern as other frontmatter edits).

**Advanced search panel** — `SearchSection` (`src/components/search/SearchSection.tsx`) wraps the search input and a sliders toggle button in one row. Clicking the button expands/collapses a panel below containing `TagList` (`src/components/sidebar/TagList.tsx`) and, in the future, additional filter types. State is managed by `advancedSearchOpen` / `setAdvancedSearchOpen` in `useUiStore` (`src/store/ui.ts`), persisted to localStorage under `m3m-ui`. Collapsed by default. `TagList` renders plain label + pills with no collapsible chrome of its own — the panel container in `SearchSection` owns the structure.

**Note tabs** — `openTabs: OpenTab[]` in `vault.ts` stores a full `Note` + `isDirty` per tab. `activeTabPath: string | null` tracks the active tab. `currentNote` and `isDirty` are always kept in sync with the active tab by all store mutations — all existing consumers work without changes. `openNote()` in `useVault.ts` opens a new tab (IPC read) or switches to an existing one instantly (no disk read). `closeTab()` auto-saves the tab if dirty before removing it from the store. `saveAllDirtyTabs()` is called on window close. Tab bar rendered by `TabBar` (`src/components/editor/TabBar.tsx`); Cmd+W closes the active tab.

**Note deletion** — `delete_note` command removes the file on disk via `std::fs::remove_file`. The file watcher detects the Remove event and calls `indexer::remove_file()` to clean the notes table, FTS index, and outbound `note_links` from SQLite automatically. Frontend optimistically removes the note from the store and clears `currentNote` if it was open.

**PDF export** — "Export PDF" button in the editor header calls `window.print()`. Before printing, `document.title` is set to the note title (browser uses this as the default PDF filename); the `afterprint` event restores the original title. Print layout is CSS-only: `@media print` in `src/index.css` hides all app chrome via `print:hidden` (sidebar `<aside>`, both `<ResizeHandle>`, `<TabBar>`, `<EditorToolbar>`, and `<ContextPanel>`), forces light-mode CSS variables (overrides dark-theme custom properties including syntax highlight token colors), and targets `[data-editor-print-content]` to remove scroll/height constraints. A print-only `<h1>` in `Editor.tsx` renders the note title; the live `<input>` and action buttons carry `print:hidden`. `@page { margin: 2.5cm 3cm }` (top-level in `src/index.css`, not inside `@media print`) sets page margins. Requires `core:webview:allow-print` in `src-tauri/capabilities/default.json`.

**Markdown reference dialog** — `MarkdownHelpDialog` (`src/components/editor/MarkdownHelpDialog.tsx`) is triggered by a `?` button (`ml-auto` at the far right of the toolbar) via `showHelp` local state in `EditorToolbar`. The modal follows the `SettingsDialog` pattern: `fixed inset-0 bg-neutral-950/50` backdrop, `onMouseDown` backdrop-click-to-close, Escape key via `useEffect`. Content is a static table (no IPC) in four sections: Inline Formatting, Headings, Blocks, Lists. Print-safe via `print:hidden` on the backdrop.

**DevTools** — gated behind the `devtools` Cargo feature (`src-tauri/Cargo.toml`). The `tauri:dev` npm script passes `-- --features devtools` to enable right-click "Inspect Element" in development without auto-opening the panel. Production `tauri build` never passes the flag so the menu item is compiled out. Never add `devtools` to the default `[features]` or to the `tauri` dependency's feature list directly.

**Collapsible sections** — `CollapsibleHeadingExtension` (`src/components/editor/extensions/CollapsibleHeadingExtension.ts`) overrides StarterKit's `heading` node and is **fully self-contained**: it implements `addCommands()` (`setHeading` / `toggleHeading`), `addKeyboardShortcuts()` (`Mod-Alt-1` through `Mod-Alt-6`), and `addInputRules()` (`##` → heading input rules via `textblockTypeInputRule`) so that all heading behaviour that StarterKit previously provided is preserved after the override. It uses a **DOM-based NodeView** (not React) — React NodeViews use `flushSync` internally, which React 18 forbids inside passive effects where `editor.commands.setContent()` runs; DOM NodeViews avoid this entirely. The NodeView renders each heading with an **always-visible** `heading-chevron` button positioned absolutely in the left padding via Tailwind (`absolute -left-6 top-1/2 -translate-y-1/2`); the heading `dom` gets `className = 'relative'` to establish the positioning context. Chevron rotation is **CSS-driven**: the plugin adds `Decoration.node` with `{ class: 'heading-is-collapsed' }` on the heading node itself when it is collapsed — ProseMirror merges this class onto the NodeView's outer DOM element — and `.ProseMirror .heading-is-collapsed > .heading-chevron svg { transform: rotate(-90deg) }` in `src/index.css` handles the visual change. The same plugin pass applies `pm-section-hidden` (`display: none`) to every top-level block between a collapsed heading and the next equal-or-higher-level heading. Collapsed state lives in `useUiStore.collapsedSections: Record<string, string[]>` (noteId → section keys), persisted to localStorage under `m3m-ui`. Section keys are `{level}:{headingText}:{occurrenceIndex}`. On note open, `Editor.tsx` initializes `extension.storage.collapsedSections` from the store **before** `setContent` runs (the two `useEffect` hooks share the same dependency and execute in declaration order). `@media print` hides `.heading-chevron` and resets `.pm-section-hidden` to `display: block` so PDFs always include full content.

**Markdown paste** — `MarkdownPasteExtension` (`src/components/editor/extensions/MarkdownPasteExtension.ts`) intercepts plain-text paste events via a ProseMirror plugin. If `text/html` is present in the clipboard (e.g., copying from a browser or rich-text editor), the extension returns `false` and lets TipTap's default HTML paste handler run. If only `text/plain` is available, the text is parsed with `markdownToTipTap()`, converted to a ProseMirror `Slice` via `schema.nodeFromJSON()`, and inserted with `replaceSelection`.

**Tables** — GFM pipe-table syntax. TipTap extension: `import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'` — all four are named exports from a single package (no separate `table-row`/`table-cell`/`table-header` packages needed at import time). Registered in `Editor.tsx` with `Table.configure({ resizable: false })`. Markdown serialization in `src/lib/markdown.ts`: MDAST `table` node → TipTap JSON in `mdastNodeToTipTap` (first row → `tableHeader` cells, body rows → `tableCell` cells, each wrapped in a `paragraph`); TipTap `table` node → MDAST in `tiptapNodeToMdast` (both `tableHeader` and `tableCell` map to `tableCell` in MDAST — GFM pipe syntax treats the first row as the header implicitly). Selected-cell highlight: `.ProseMirror .selectedCell { background-color: var(--accent-subtle) }` in `src/index.css`. Toolbar: "Table" button calls `insertTable({ rows: 2, cols: 2, withHeaderRow: true })`.

**Onboarding tours** — driver.js (installed via npm, bundled by Vite — no CDN, fully offline). Tour definitions and driver factories live in `src/lib/tours.ts`; the `useTour()` hook in `src/hooks/useTour.ts` wraps driver.js and reads/writes `useUiStore`. Two tours: `general-onboarding-v1` (triggered in `App.tsx` on first `vaultPath` set, via `requestAnimationFrame` guard) and `editor-onboarding-v1` (triggered on first new-note creation via `justCreatedNoteRef` in `App.tsx` — a plain ref set in the `+ New` button's onClick, consumed and cleared in a `useEffect` watching `currentNote`). Tour completion is stored in `completedTours: string[]` on `useUiStore`, persisted under the `m3m-ui` localStorage key. Tour IDs are versioned strings (`general-onboarding-v1`, `editor-onboarding-v1`) — bumping the version string re-triggers the tour for all existing users. Steps are filtered at start time via `document.querySelector` so steps whose targets aren't in the DOM are skipped silently. Popovers are themed using project CSS variable tokens via the `.driver-m3m-popover` class in `src/index.css` (scoped to avoid Tailwind v4 preflight conflicts with `.ProseMirror`); driver.js CSS is imported before `index.css` in `main.tsx` so our overrides always win at equal specificity. Targets are identified by `data-tour` HTML attributes. Each new tour step requires: a `data-tour` attribute on the target element, a `DriveStep` entry in `tours.ts`, and a factory registered in the `startTour` dispatcher in `useTour.ts`.

**Changelog dialog** — `ChangelogDialog` (`src/components/changelog/ChangelogDialog.tsx`) is a modal that visualises `CHANGELOG.md` as structured release notes. The file is bundled as a raw string via Vite's `?raw` import (`import changelogRaw from '../../../CHANGELOG.md?raw'`) and parsed by `parseChangelog()` in `src/lib/changelog.ts` into `ChangelogEntry[]` (version, date, sections[]). The parser splits on `## [` to isolate version blocks, then on `### ` to isolate section types, collecting `- ` bullet lines as items. Section types are color-coded (Added → emerald, Fixed → amber, Changed → blue, Deprecated → yellow, Removed → red, Security → purple) using static record lookup. Auto-shown once per app version: `App.tsx` compares the bundled `version` (from `package.json`, imported via `resolveJsonModule`) against `lastSeenVersion: string` in `useUiStore` (persisted in `m3m-ui`); on mismatch the version is updated and the dialog opens. Also accessible at any time via the `m3m vX.Y.Z` button at the bottom of `<aside>`. Modal pattern matches `SettingsDialog`.

**NodeActionsPanel** — `NodeActionsPanel` (`src/components/editor/node-actions/NodeActionsPanel.tsx`) is a React overlay for **hover-triggered** per-node actions. It accepts `leftActions`/`rightActions` maps (`Partial<Record<string, ActionComponent[]>>`). A global `document.mousemove` listener resolves the hovered top-level block via `view.posAtCoords` + DOM walk-up, renders a `position: fixed` panel aligned to the editor's left/right edge, and keeps the panel open when the cursor moves from the node into the panel's geometric hitbox (`hoveredBlockRef` avoids stale closure). Currently no actions are registered; the always-visible collapse chevron lives in the NodeView. When the first hover action for headings is added, widen the editor padding to `pt-6 pr-6 pb-6 pl-12` (48px left) so the hover panel occupies the outer 24px and the persistent chevron stays in the inner 24px.

## Prompt conventions

When starting work on a specific area, include the relevant section from `SPEC.md`:
- New feature → paste the feature bullet + P-level
- Sync work → paste `## Sync Architecture` from SPEC
- AI work → paste `## AI Architecture` from SPEC
- Stack question → paste `## Stack` from SPEC
- Telegram bridge work → paste `## Telegram Bridge Architecture` from SPEC
- Do not make any reference to Anthropic or Claude in the code or in the commit message

## Commit conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`
- Scope is optional but encouraged (e.g. `feat(vault):`, `fix(indexer):`)
- Subject line: imperative mood, no period, ≤72 chars
- Never include references to AI tooling, Anthropic, or Claude in any commit message or trailer

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

## UI Primitives — `src/components/ui/`

| Component | Notes |
|---|---|
| `Button` | CVA; `intent` (primary/secondary/ghost/danger) × `size` (sm/md/lg); `sm` = `py-1.5 text-sm` |
| `Select` | Native `<select>` with custom chevron SVG; `py-1.5 text-sm` matches `Button sm` height; `appearance-none` resets browser defaults; use for any dropdown choice |
| `FormInput` | Text input; `py-2.5 text-sm`; use for larger form contexts (e.g. text fields, paths) |
| `TagPill` | CVA; variants: `default` (read-only), `interactive` (clickable), `removable` (with × button) |
| `FieldLabel` | Uppercase tracking-wider section label |
| `ConfirmDialog` | Modal for destructive actions |
