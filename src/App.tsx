import { useEffect } from 'react';
import { appDataDir } from '@tauri-apps/api/path';
import { useVault } from './hooks/useVault';
import { Editor } from './components/editor/Editor';
import { Button } from './components/ui/Button';
import { BacklinkPanel } from './components/sidebar/BacklinkPanel';
import { TagList } from './components/sidebar/TagList';
import { useUiStore } from './store/ui';
import { cn } from './lib/cn';

export default function App() {
  const { notes, currentNote, vaultPath, setVaultPath, loadNotes, openNote, newNote, error } = useVault();
  const { selectedTag, setSelectedTag } = useUiStore();
  const displayedNotes = selectedTag ? notes.filter((n) => n.tags.includes(selectedTag)) : notes;

  useEffect(() => {
    if (!vaultPath) {
      // TODO: replace with vault picker (Vault Manager, P0)
      appDataDir().then((dir) => {
        const vault = `${dir.replace(/\/$/, '')}/vault`;
        console.log('[App] vault path:', vault);
        setVaultPath(vault);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (vaultPath) {
      setSelectedTag(null);
      loadNotes();
    }
  }, [vaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-heading text-sm">m3m</span>
          <Button intent="ghost" size="sm" onClick={() => newNote()}>
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

        {vaultPath && (
          <div className="px-3 py-2 border-t border-border text-xs text-foreground truncate" title={vaultPath}>
            {vaultPath}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Editor />
      </main>

      {currentNote && <BacklinkPanel onOpenNote={openNote} />}
    </div>
  );
}
