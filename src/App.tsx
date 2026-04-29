import { useEffect, useState } from 'react';
import { useVault } from './hooks/useVault';
import { useVaultRegistry } from './hooks/useVaultRegistry';
import { Editor } from './components/editor/Editor';
import { Button } from './components/ui/Button';
import { BacklinkPanel } from './components/sidebar/BacklinkPanel';
import { TagList } from './components/sidebar/TagList';
import { WelcomeScreen } from './components/vault/WelcomeScreen';
import { VaultSwitcher } from './components/vault/VaultSwitcher';
import { useUiStore } from './store/ui';
import { cn } from './lib/cn';

export default function App() {
  const { notes, currentNote, vaultPath, loadNotes, openNote, newNote, error } = useVault();
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
  const [showWelcomeCreate, setShowWelcomeCreate] = useState(false);
  const displayedNotes = selectedTag ? notes.filter((n) => n.tags.includes(selectedTag)) : notes;

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

  // Show welcome create flow when triggered from the popover.
  if (showWelcomeCreate) {
    return (
      <WelcomeScreen
        onCreateNew={async (name, path) => {
          const entry = await createNewVault(name, path);
          setShowWelcomeCreate(false);
          return entry;
        }}
        onOpenExisting={async () => {
          const entry = await openExistingVault();
          setShowWelcomeCreate(false);
          return entry;
        }}
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
            onCreateNew={() => setShowWelcomeCreate(true)}
            onOpenExisting={openExistingVault}
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

        <ul className="flex-1 min-h-0 overflow-y-auto py-2">
          {displayedNotes.map((note) => (
            <li key={note.id || note.path}>
              <Button
                intent="ghost"
                size="sm"
                onClick={() => openNote(note.path)}
                className={cn(
                  'w-full justify-start rounded-none font-normal truncate',
                  currentNote?.path === note.path
                    ? 'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent'
                    : 'text-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {note.title || 'Untitled'}
              </Button>
            </li>
          ))}
        </ul>

        <TagList notes={notes} />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Editor />
      </main>

      {currentNote && <BacklinkPanel onOpenNote={openNote} />}
    </div>
  );
}
