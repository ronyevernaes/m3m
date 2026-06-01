import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';

interface MarkdownHelpDialogProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Inline Formatting',
    rows: [
      { syntax: '**text**', description: 'Bold' },
      { syntax: '_text_  or  *text*', description: 'Italic' },
      { syntax: '~~text~~', description: 'Strikethrough' },
      { syntax: '`code`', description: 'Inline code' },
      { syntax: '[label](url)', description: 'Link' },
      { syntax: '[[Note Title]]', description: 'Wikilink to another note' },
    ],
  },
  {
    title: 'Headings',
    rows: [
      { syntax: '# Heading', description: 'Heading 1' },
      { syntax: '## Heading', description: 'Heading 2' },
      { syntax: '### Heading', description: 'Heading 3' },
    ],
  },
  {
    title: 'Blocks',
    rows: [
      { syntax: '---', description: 'Horizontal rule' },
      { syntax: '> text', description: 'Blockquote' },
      { syntax: '```lang\ncode\n```', description: 'Fenced code block' },
    ],
  },
  {
    title: 'Lists',
    rows: [
      { syntax: '- item', description: 'Bullet list' },
      { syntax: '1. item', description: 'Ordered list' },
      { syntax: '- [ ] task', description: 'Task (unchecked)' },
      { syntax: '- [x] done', description: 'Task (checked)' },
    ],
  },
];

export function MarkdownHelpDialog({ onClose }: MarkdownHelpDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-neutral-950/50 flex items-center justify-center z-50 print:hidden"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-lg w-[560px] max-h-[80vh] flex flex-col overflow-hidden p-2">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-lg text-heading">Markdown Reference</h2>
          <Button intent="ghost" size="sm" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-foreground border-b border-border w-48">Syntax</th>
                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider text-foreground border-b border-border">Description</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <>
                  <tr key={section.title}>
                    <td colSpan={2} className="pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-foreground">
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.syntax} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 align-top">
                        <code className="font-mono text-heading bg-muted px-1.5 py-0.5 rounded-sm text-xs whitespace-pre">{row.syntax}</code>
                      </td>
                      <td className="py-2 text-foreground align-top">{row.description}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
