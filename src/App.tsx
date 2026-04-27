import { useEffect } from 'react';
import { appDataDir } from '@tauri-apps/api/path';
import { useVault } from './hooks/useVault';
import { Editor } from './components/editor/Editor';

export default function App() {
  const { notes, currentNote, vaultPath, setVaultPath, loadNotes, openNote, newNote, error } = useVault();

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
    if (vaultPath) loadNotes();
  }, [vaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)]">
      <aside className="w-64 flex-shrink-0 border-r border-[var(--border)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-h)] text-sm">m3m</span>
          <button
            onClick={() => newNote()}
            className="text-xs px-2 py-1 rounded bg-[var(--accent-bg)] text-[var(--accent)]"
          >
            + New
          </button>
        </div>

        {error && (
          <div
            className="mx-2 mt-2 px-3 py-2 rounded text-xs text-red-700 bg-red-50 border border-red-200 break-words"
            title={error}
          >
            {error}
          </div>
        )}

        <ul className="flex-1 overflow-y-auto py-2">
          {notes.map((note) => (
            <li key={note.id || note.path}>
              <button
                onClick={() => openNote(note.path)}
                className={`w-full text-left px-4 py-2 text-sm truncate ${
                  currentNote?.path === note.path
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--code-bg)]'
                }`}
              >
                {note.title || 'Untitled'}
              </button>
            </li>
          ))}
        </ul>

        {vaultPath && (
          <div className="px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--text)] truncate" title={vaultPath}>
            {vaultPath}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}
