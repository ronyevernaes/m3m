import type { Editor } from '@tiptap/core';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

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
  const buttons: ToolbarButton[] = [
    {
      label: 'B',
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      label: 'I',
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      label: 'S',
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      label: '`',
      onClick: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      label: 'H1',
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      label: '—',
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
    },
    {
      label: '• List',
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      label: '1. List',
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      label: '```',
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      label: '☐ List',
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
    },
    {
      label: 'Link',
      onClick: () => {
        const href = window.prompt('URL');
        if (href) editor.chain().focus().setLink({ href }).run();
      },
      isActive: () => editor.isActive('link'),
    },
  ];

  return (
    <div className={cn('flex flex-wrap gap-1 border-b border-border px-3 py-1', className)}>
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
    </div>
  );
}
