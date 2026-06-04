import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';
import { MarkdownHelpDialog } from './MarkdownHelpDialog';

interface ToolbarProps {
  editor: Editor;
  className?: string;
}

interface ToolbarButton {
  label: string;
  onClick: () => void;
  isActive: () => boolean;
}

export function EditorToolbar({ editor, className }: ToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus();
  }, [showLinkInput]);

  const buttons: ToolbarButton[] = [
    { label: 'B', onClick: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold') },
    { label: 'I', onClick: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic') },
    { label: 'S', onClick: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive('strike') },
    { label: '`', onClick: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive('code') },
    { label: 'H1', onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
    { label: 'H2', onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
    { label: 'H3', onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
    { label: '—', onClick: () => editor.chain().focus().setHorizontalRule().run(), isActive: () => false },
    { label: '• List', onClick: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
    { label: '1. List', onClick: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    { label: '```', onClick: () => editor.chain().focus().toggleCodeBlock().run(), isActive: () => editor.isActive('codeBlock') },
    { label: '☐ List', onClick: () => editor.chain().focus().toggleTaskList().run(), isActive: () => editor.isActive('taskList') },
    { label: '>', onClick: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
    { label: 'Table', onClick: () => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(), isActive: () => editor.isActive('table') },
  ];

  const handleLinkButtonClick = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      setLinkValue('');
      setShowLinkInput(true);
    }
  };

  const handleLinkConfirm = () => {
    if (linkValue) editor.chain().focus().setLink({ href: linkValue }).run();
    setShowLinkInput(false);
    setLinkValue('');
  };

  const handleLinkCancel = () => {
    setShowLinkInput(false);
    setLinkValue('');
    editor.chain().focus().run();
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1 border-b border-border px-3 py-1', className)}>
      {buttons.map((btn) => (
        <Button
          key={btn.label}
          intent="ghost"
          size="sm"
          onClick={btn.onClick}
          className={cn(
            'font-mono',
            btn.isActive() && 'bg-accent-subtle text-accent border border-accent-border hover:bg-accent-subtle hover:text-accent',
          )}
        >
          {btn.label}
        </Button>
      ))}

      {showLinkInput ? (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={linkInputRef}
            type="url"
            value={linkValue}
            placeholder="https://..."
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleLinkConfirm(); }
              if (e.key === 'Escape') handleLinkCancel();
            }}
            className="text-sm bg-background border border-border rounded px-2 py-0.5 outline-none text-foreground w-48 focus:border-accent"
          />
          <Button intent="ghost" size="sm" onClick={handleLinkConfirm}>OK</Button>
          <Button intent="ghost" size="sm" onClick={handleLinkCancel}>✕</Button>
        </div>
      ) : (
        <Button
          intent="ghost"
          size="sm"
          onClick={handleLinkButtonClick}
          className={cn(
            'font-mono',
            editor.isActive('link') && 'bg-accent-subtle text-accent border border-accent-border hover:bg-accent-subtle hover:text-accent',
          )}
        >
          Link
        </Button>
      )}

      <Button
        intent="ghost"
        size="sm"
        onClick={() => setShowHelp(true)}
        aria-label="Markdown help"
        title="Markdown reference"
        className="font-mono ml-auto"
      >
        ?
      </Button>

      {showHelp && <MarkdownHelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}
