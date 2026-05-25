import { useState, useRef } from 'react';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { getMarkRange } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { openUrl } from '../../lib/ipc';

interface LinkTooltipProps {
  editor: Editor;
}

interface LinkState {
  href: string;
  text: string;
  from: number;
  to: number;
}

export function LinkTooltip({ editor }: LinkTooltipProps) {
  const [editingLinkKey, setEditingLinkKey] = useState<string | null>(null);
  const [editHref, setEditHref] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const savedRange = useRef<{ from: number; to: number } | null>(null);

  const linkState = useEditorState({
    editor,
    selector: ({ editor: e }): LinkState | null => {
      if (!e.isActive('link')) return null;
      const { state } = e;
      const { from } = state.selection;
      const $from = state.doc.resolve(from);
      const markType = state.schema.marks.link;
      if (!markType) return null;
      const range = getMarkRange($from, markType);
      if (!range) return null;
      return {
        href: (e.getAttributes('link').href as string) ?? '',
        text: state.doc.textBetween(range.from, range.to),
        from: range.from,
        to: range.to,
      };
    },
  });

  const linkKey = linkState ? String(linkState.from) : null;
  const editing = !!editingLinkKey && editingLinkKey === linkKey;

  const handleEdit = () => {
    if (!linkState || !linkKey) return;
    setEditHref(linkState.href);
    setEditLabel(linkState.text);
    savedRange.current = { from: linkState.from, to: linkState.to };
    setEditingLinkKey(linkKey);
  };

  const handleConfirm = () => {
    const range = savedRange.current;
    if (!range) return;
    editor.chain().focus().command(({ tr, state }) => {
      const label = editLabel || state.doc.textBetween(range.from, range.to);
      if (!editHref) {
        tr.removeMark(range.from, range.to, state.schema.marks.link);
      } else {
        const linkMark = state.schema.marks.link.create({ href: editHref, target: null });
        tr.replaceWith(range.from, range.to, state.schema.text(label, [linkMark]));
        tr.removeStoredMark(state.schema.marks.link);
      }
      return true;
    }).run();
    setEditingLinkKey(null);
  };

  const handleUnlink = () => editor.chain().focus().extendMarkRange('link').unsetLink().run();
  const handleOpen = () => linkState && openUrl(linkState.href).catch(console.error);

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }) => e.isActive('link')}
      options={{ placement: 'bottom' }}
    >
      {editing ? (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-2 py-2 shadow-md w-64">
          <input
            autoFocus
            type="text"
            placeholder="Label"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setEditingLinkKey(null); }}
            className="text-sm bg-transparent outline-none text-foreground border-b border-border pb-1"
          />
          <input
            type="url"
            placeholder="URL"
            value={editHref}
            onChange={(e) => setEditHref(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setEditingLinkKey(null); }}
            className="text-sm bg-transparent outline-none text-foreground"
          />
          <div className="flex gap-1 justify-end pt-1">
            <button type="button" onClick={handleConfirm} className="text-xs text-accent hover:text-heading px-1">Save</button>
            <button type="button" onClick={() => setEditingLinkKey(null)} className="text-xs text-foreground/50 hover:text-foreground px-1">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 shadow-md max-w-xs">
          <span className="text-xs text-foreground/70 truncate flex-1 min-w-0">{linkState?.href}</span>
          <button type="button" onClick={handleOpen} className="text-xs text-accent hover:text-heading px-1 shrink-0">Open</button>
          <button type="button" onClick={handleEdit} className="text-xs text-foreground hover:text-heading px-1 shrink-0">Edit</button>
          <button type="button" onClick={handleUnlink} className="text-xs text-foreground/50 hover:text-destructive px-1 shrink-0">Unlink</button>
        </div>
      )}
    </BubbleMenu>
  );
}
