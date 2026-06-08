import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { LinkExtension } from './extensions/LinkExtension'
import { CollapsibleHeadingExtension } from './extensions/CollapsibleHeadingExtension'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { createLowlight, all } from 'lowlight'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useVault } from '../../hooks/useVault'
import { useVaultSettingsStore } from '../../store/vaultSettings'
import { useUiStore } from '../../store/ui'
import { markdownToTipTap, tipTapToMarkdown } from '../../lib/markdown'
import { WikilinkExtension } from './extensions/WikilinkExtension'
import { MarkdownPasteExtension } from './extensions/MarkdownPasteExtension'
import { EditorToolbar } from './EditorToolbar'
import { LinkTooltip } from './LinkTooltip'
import { NodeActionsPanel } from './node-actions/NodeActionsPanel'
import { openUrl } from '../../lib/ipc'
import { Button } from '../ui/Button'
import { GearIcon } from '../icons/GearIcon'
import { cn } from '../../lib/cn'

const lowlight = createLowlight(all)

interface EditorProps {
  className?: string
  onSettingsClick?: () => void
}

export function Editor({ className, onSettingsClick }: EditorProps) {
  const {
    currentNote,
    updateCurrentNoteBody,
    updateCurrentNoteTitle,
    saveCurrentNote,
    openNote,
    isDirty,
    error,
  } = useVault()
  const suppressUpdate = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editorMounted, setEditorMounted] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevIsDirty = useRef(isDirty)

  const handleExportPdf = useCallback(() => {
    const prevTitle = document.title
    document.title = currentNote?.frontmatter.title || prevTitle
    window.addEventListener(
      'afterprint',
      () => {
        document.title = prevTitle
      },
      { once: true },
    )
    window.print()
  }, [currentNote?.frontmatter.title])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: false }),
      CollapsibleHeadingExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      WikilinkExtension.configure({ onNavigate: openNote }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      MarkdownPasteExtension,
    ],
    content: '',
    onCreate() { setEditorMounted(true) },
    onDestroy() { setEditorMounted(false) },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-full p-6',
      },
      handleClick(view, pos, event) {
        if (!(event.ctrlKey || event.metaKey)) return false
        const linkMark = view.state.doc
          .resolve(pos)
          .marks()
          .find((m) => m.type.name === 'link')
        if (!linkMark) return false
        openUrl(linkMark.attrs.href as string).catch(console.error)
        return true
      },
    },
  })

  // Read directly from the editor at save time — don't rely on store body being current.
  const handleSave = useCallback(async () => {
    if (!editor || editor.isDestroyed) return
    const markdown = tipTapToMarkdown(editor.getJSON())
    await saveCurrentNote(markdown)
  }, [editor, saveCurrentNote])

  const handleSaveRef = useRef(handleSave)
  useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

  // Listen for content changes via editor.on so the callback is always current.
  useEffect(() => {
    if (!editor) return
    const handleUpdate = () => {
      if (suppressUpdate.current) return
      const markdown = tipTapToMarkdown(editor.getJSON())
      updateCurrentNoteBody(markdown)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      const delay = useVaultSettingsStore.getState().vaultSettings.autosaveDelayMs
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveRef.current()
      }, delay)
    }
    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [editor, updateCurrentNoteBody])

  // Cancel any pending auto-save when switching to a different note.
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [currentNote?.path])

  // Reset prevIsDirty when the active note changes to prevent a spurious "Saved" flash on tab switch.
  useEffect(() => {
    prevIsDirty.current = isDirty
  }, [currentNote?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flash "Saved" when isDirty transitions from true → false (autosave or manual save).
  useEffect(() => {
    if (prevIsDirty.current && !isDirty) {
      setShowSaved(true)
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
      savedFlashTimer.current = setTimeout(() => setShowSaved(false), 2000)
    }
    prevIsDirty.current = isDirty
  }, [isDirty])

  // Sync collapsed-section state into the extension storage before content loads.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const noteId = currentNote?.frontmatter.id ?? ''
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'heading')
    if (!ext) return
    const storage = ext.storage as { collapsedSections: Set<string>; noteId: string }
    storage.noteId = noteId
    const persisted = useUiStore.getState().collapsedSections[noteId] ?? []
    storage.collapsedSections = new Set(persisted)
  }, [editor, currentNote?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load note content into editor when the open note changes.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    suppressUpdate.current = true
    try {
      editor.commands.setContent(currentNote ? markdownToTipTap(currentNote.body) : '')
    } catch (err) {
      console.error('[Editor] setContent failed:', err)
    } finally {
      suppressUpdate.current = false
    }
  }, [editor, currentNote?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2 print:border-none print:py-0 print:px-0 print:mb-4">
        {currentNote && (
          <h1 className="hidden print:block text-3xl font-bold font-heading text-heading">
            {currentNote.frontmatter.title}
          </h1>
        )}
        {currentNote ? (
          <input
            type="text"
            value={currentNote.frontmatter.title}
            onChange={(e) => updateCurrentNoteTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="text-lg font-medium text-heading bg-transparent border-none outline-none w-full min-w-0 focus:outline-none placeholder:text-foreground/40 print:hidden"
            placeholder="Untitled"
          />
        ) : (
          <span className="flex-1" />
        )}
        <div className="flex items-center gap-2 print:hidden">
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
              <Button intent="ghost" size="sm" onClick={handleExportPdf} className="whitespace-nowrap">
                Export PDF
              </Button>
              <Button intent="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          )}
          {onSettingsClick && (
            <button
              data-tour="settings-button"
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

      {editor && currentNote && (
        <div className="print:hidden">
          <EditorToolbar editor={editor} />
        </div>
      )}
      {editor && <LinkTooltip editor={editor} />}
      {editor && editorMounted && <NodeActionsPanel editor={editor} />}

      {currentNote && (
        <div data-tour="editor-area" className="flex-1 overflow-y-auto" data-editor-print-content>
          <EditorContent editor={editor} className="h-full" />
        </div>
      )}
    </div>
  )
}
