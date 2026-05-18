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
import { SettingsDialog } from './components/settings/SettingsDialog';
import { UpdateBanner } from './components/update/UpdateBanner';
import { useUpdater } from './hooks/useUpdater';
import { useUiStore } from './store/ui';
import { useVaultStore } from './store/vault';
import { useSettingsStore } from './store/settings';
import { useVaultSettingsStore } from './store/vaultSettings';
import { FONT_SIZE_PX } from './types/settings';
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
  const { settings, loadSettings } = useSettingsStore();
  const { update, isInstalling, dismissed, install, dismiss } = useUpdater();
  const { vaultSettings, loaded: vaultSettingsLoaded } = useVaultSettingsStore();
  const [showNewVaultDialog, setShowNewVaultDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // Load settings first, then vaults so the restoreLastVault setting is available.
  useEffect(() => {
    loadSettings().then(() => {
      const { settings: s } = useSettingsStore.getState();
      loadVaults(s.restoreLastVault);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (settings.theme !== 'system') root.classList.add(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--editor-font-size',
      FONT_SIZE_PX[settings.editorFontSize],
    );
  }, [settings.editorFontSize]);

  useEffect(() => {
    if (vaultSettingsLoaded) {
      document.documentElement.style.setProperty('--editor-line-width', `${vaultSettings.lineWidth}ch`);
    } else {
      document.documentElement.style.removeProperty('--editor-line-width');
    }
  }, [vaultSettingsLoaded, vaultSettings.lineWidth]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <Editor onSettingsClick={() => setShowSettings(true)} />
      </main>

      {currentNote && <BacklinkPanel onOpenNote={openNote} />}

      {showNewVaultDialog && (
        <NewVaultDialog
          onConfirm={async (name, path, color) => {
            await createNewVault(name, path, color);
            setShowNewVaultDialog(false);
          }}
          onCancel={() => setShowNewVaultDialog(false)}
          defaultPath={settings.defaultVaultLocation}
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

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}

      {update && !dismissed && (
        <UpdateBanner
          update={update}
          isInstalling={isInstalling}
          onInstall={install}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
