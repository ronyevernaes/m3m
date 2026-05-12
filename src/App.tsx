import { useEffect, useState, useCallback, useRef } from 'react';
import { useVault } from './hooks/useVault';
import { useVaultRegistry } from './hooks/useVaultRegistry';
import { useSearch } from './hooks/useSearch';
import { Editor } from './components/editor/Editor';
import { Button } from './components/ui/Button';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { BacklinkPanel } from './components/sidebar/BacklinkPanel';
import { TagList } from './components/sidebar/TagList';
import { WelcomeScreen } from './components/vault/WelcomeScreen';
import { VaultSwitcher } from './components/vault/VaultSwitcher';
import { NewVaultDialog } from './components/vault/NewVaultDialog';
import { SearchBar } from './components/search/SearchBar';
import { SearchResults } from './components/search/SearchResults';
import { NoteListItem } from './components/note/NoteListItem';
import { useUiStore } from './store/ui';
import { useVaultStore } from './store/vault';
import type { NoteListItem as NoteListItemType } from './types/note';

export default function App() {
  const { notes, currentNote, vaultPath, loadNotes, openNote, newNote, deleteNote, saveCurrentNote, error } = useVault();
  const {
    vaults,
    activeVaultId,
    registryLoading,
    loadVaults,
    createNewVault,
    openExistingVault,
    switchVault,
    renameVaultEntry,
    removeVaultEntry,
    revealVaultEntry,
  } = useVaultRegistry();
  const { selectedTag, setSelectedTag } = useUiStore();
  const { results, isSearching, search, clearSearch } = useSearch();
  const [showNewVaultDialog, setShowNewVaultDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<NoteListItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const displayedNotes = selectedTag ? notes.filter((n) => n.tags.includes(selectedTag)) : notes;

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => search(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, search, clearSearch]);

  const saveCurrentNoteRef = useRef(saveCurrentNote);
  useEffect(() => { saveCurrentNoteRef.current = saveCurrentNote; }, [saveCurrentNote]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      unlisten = await appWindow.onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          const { isDirty, currentNote: note } = useVaultStore.getState();
          if (isDirty && note) {
            await saveCurrentNoteRef.current();
          }
        } finally {
          appWindow.destroy();
        }
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, []);

  // Load registry on mount — restores last active vault automatically.
  useEffect(() => {
    loadVaults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When vault path changes, reload notes.
  useEffect(() => {
    if (vaultPath) {
      setSelectedTag(null);
      loadNotes();
    }
  }, [vaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // First launch: no vaults registered.
  if (!registryLoading && vaults.length === 0) {
    return (
      <WelcomeScreen
        onCreateNew={createNewVault}
        onOpenExisting={openExistingVault}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <VaultSwitcher
            vaults={vaults}
            activeVaultId={activeVaultId}
            onSwitch={switchVault}
            onRename={renameVaultEntry}
            onRemove={removeVaultEntry}
            onReveal={revealVaultEntry}
            onCreateNew={() => setShowNewVaultDialog(true)}
          />
          <Button
            intent="ghost"
            size="sm"
            onClick={() => newNote()}
            disabled={!vaultPath}
          >
            + New
          </Button>
        </div>

        {error && (
          <div
            className="mx-2 mt-2 px-3 py-2 rounded text-xs text-error-700 bg-error-50 border border-error-200 break-words"
            title={error}
          >
            {error}
          </div>
        )}

        <SearchBar query={searchQuery} onChange={handleSearchChange} />

        {searchQuery.trim() ? (
          <SearchResults
            results={results}
            isSearching={isSearching}
            onSelect={openNote}
            className="flex-1"
          />
        ) : (
          <ul className="flex-1 min-h-0 overflow-y-auto py-2">
            {displayedNotes.map((note) => (
              <NoteListItem
                key={note.id || note.path}
                note={note}
                isActive={currentNote?.path === note.path}
                onSelect={() => openNote(note.path)}
                onDelete={() => setNoteToDelete(note)}
              />
            ))}
          </ul>
        )}

        <TagList notes={notes} />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Editor />
      </main>

      {currentNote && <BacklinkPanel onOpenNote={openNote} />}

      {showNewVaultDialog && (
        <NewVaultDialog
          onConfirm={async (name, path, color) => {
            await createNewVault(name, path, color);
            setShowNewVaultDialog(false);
          }}
          onCancel={() => setShowNewVaultDialog(false)}
        />
      )}

      <ConfirmDialog
        open={noteToDelete !== null}
        title="Delete note"
        message={`Delete "${noteToDelete?.title || 'Untitled'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (noteToDelete) await deleteNote(noteToDelete.path);
          setNoteToDelete(null);
        }}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
}
