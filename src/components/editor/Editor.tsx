import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { createLowlight, all } from 'lowlight';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useVault } from '../../hooks/useVault';
import { useVaultSettingsStore } from '../../store/vaultSettings';
import { markdownToTipTap, tipTapToMarkdown } from '../../lib/markdown';
import { EditorToolbar } from './EditorToolbar';
import { Button } from '../ui/Button';
import { GearIcon } from '../icons/GearIcon';
import { cn } from '../../lib/cn';

const lowlight = createLowlight(all);

interface EditorProps {
  className?: string;
  onSettingsClick?: () => void;
}

export function Editor({ className, onSettingsClick }: EditorProps) {
  const { currentNote, updateCurrentNoteBody, updateCurrentNoteTitle, saveCurrentNote, isDirty, error } = useVault();
  const suppressUpdate = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsDirty = useRef(isDirty);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-full p-6',
      },
    },
  });

  // Listen for content changes via editor.on so the callback is always current.
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      if (suppressUpdate.current) return;
      const markdown = tipTapToMarkdown(editor.getJSON());
      updateCurrentNoteBody(markdown);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      const delay = useVaultSettingsStore.getState().vaultSettings.autosaveDelayMs;
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveRef.current();
      }, delay);
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editor, updateCurrentNoteBody]);

  // Cancel any pending auto-save when switching to a different note.
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [currentNote?.path]);

  // Flash "Saved" when isDirty transitions from true → false (autosave or manual save).
  useEffect(() => {
    if (prevIsDirty.current && !isDirty) {
      setShowSaved(true);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
      savedFlashTimer.current = setTimeout(() => setShowSaved(false), 2000);
    }
    prevIsDirty.current = isDirty;
  }, [isDirty]);

  // Load note content into editor when the open note changes.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    suppressUpdate.current = true;
    try {
      editor.commands.setContent(currentNote ? markdownToTipTap(currentNote.body) : '');
    } catch (err) {
      console.error('[Editor] setContent failed:', err);
    } finally {
      suppressUpdate.current = false;
    }
  }, [editor, currentNote?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read directly from the editor at save time — don't rely on store body being current.
  const handleSave = useCallback(async () => {
    if (!editor || editor.isDestroyed) return;
    const markdown = tipTapToMarkdown(editor.getJSON());
    await saveCurrentNote(markdown);
  }, [editor, saveCurrentNote]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        {currentNote ? (
          <input
            type="text"
            value={currentNote.frontmatter.title}
            onChange={(e) => updateCurrentNoteTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="text-lg font-medium text-heading bg-transparent border-none outline-none w-full min-w-0 focus:outline-none placeholder:text-foreground/40"
            placeholder="Untitled"
          />
        ) : (
          <span className="flex-1" />
        )}
        <div className="flex items-center gap-2">
          {currentNote && (
            <>
              {error && (
                <span className="text-xs text-error-500 max-w-xs truncate" title={error}>
                  Error: {error}
                </span>
              )}
              {isDirty && !error && (
                <span className="text-xs text-foreground">Unsaved changes</span>
              )}
              {showSaved && !isDirty && !error && (
                <span className="text-xs text-foreground">Saved</span>
              )}
              <Button intent="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          )}
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              aria-label="Open settings"
              title="Settings (⌘,)"
              className="p-1.5 rounded-md text-foreground hover:text-heading hover:bg-muted transition-colors"
            >
              <GearIcon />
            </button>
          )}
        </div>
      </div>

      {!currentNote && (
        <div className="flex flex-1 items-center justify-center text-foreground">
          Select or create a note to start editing.
        </div>
      )}

      {editor && currentNote && <EditorToolbar editor={editor} />}

      {currentNote && (
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      )}
    </div>
  );
}
