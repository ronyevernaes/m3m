import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight, all } from 'lowlight';
import { useEffect, useRef, useCallback } from 'react';
import { useVault } from '../../hooks/useVault';
import { markdownToTipTap, tipTapToMarkdown } from '../../lib/markdown';
import { EditorToolbar } from './EditorToolbar';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

const lowlight = createLowlight(all);

interface EditorProps {
  className?: string;
}

export function Editor({ className }: EditorProps) {
  const { currentNote, updateCurrentNoteBody, updateCurrentNoteTitle, saveCurrentNote, isDirty, error } = useVault();
  const suppressUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      }),
      CodeBlockLowlight.configure({ lowlight }),
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
    };
    editor.on('update', handleUpdate);
    return () => { editor.off('update', handleUpdate); };
  }, [editor, updateCurrentNoteBody]);

  // Load note content into editor when the open note changes.
  useEffect(() => {
    console.log('[Editor] currentNote?.path changed:', currentNote?.path);
    if (!editor) return;
    suppressUpdate.current = true;
    try {
      editor.commands.setContent(currentNote ? markdownToTipTap(currentNote.body) : '');
    } catch (err) {
      console.error('[Editor] setContent failed:', err);
      editor.commands.setContent('');
    } finally {
      suppressUpdate.current = false;
    }
  }, [editor, currentNote?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read directly from the editor at save time — don't rely on store body being current.
  const handleSave = useCallback(async () => {
    if (!editor) return;
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

  if (!currentNote) {
    return (
      <div className="flex items-center justify-center h-full text-foreground">
        Select or create a note to start editing.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <input
          type="text"
          value={currentNote.frontmatter.title}
          onChange={(e) => updateCurrentNoteTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="text-lg font-medium text-heading bg-transparent border-none outline-none w-full min-w-0 focus:outline-none placeholder:text-foreground/40"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-error-500 max-w-xs truncate" title={error}>
              Error: {error}
            </span>
          )}
          {isDirty && !error && (
            <span className="text-xs text-foreground">Unsaved changes</span>
          )}
          <Button intent="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {editor && <EditorToolbar editor={editor} />}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
