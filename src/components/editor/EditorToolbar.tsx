import type { Editor } from '@tiptap/core';

interface ToolbarProps {
  editor: Editor;
}

interface ToolbarButton {
  label: string;
  onClick: () => void;
  isActive: () => boolean;
}

export function EditorToolbar({ editor }: ToolbarProps) {
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
      label: 'Link',
      onClick: () => {
        const href = window.prompt('URL');
        if (href) editor.chain().focus().setLink({ href }).run();
      },
      isActive: () => editor.isActive('link'),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-3 py-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          className={`px-2 py-1 text-sm rounded font-mono ${
            btn.isActive()
              ? 'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]'
              : 'text-[var(--text)] hover:bg-[var(--code-bg)]'
          }`}
          type="button"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
