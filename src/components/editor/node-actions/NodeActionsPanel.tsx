import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface ActionProps {
  editor: Editor;
  pos: number;
  node: PmNode;
}

export type ActionComponent = React.ComponentType<ActionProps>;

interface HoveredBlock {
  pos: number;
  node: PmNode;
  rect: DOMRect;
}

interface NodeActionsPanelProps {
  editor: Editor | null;
  leftActions?: Partial<Record<string, ActionComponent[]>>;
  rightActions?: Partial<Record<string, ActionComponent[]>>;
}

const PANEL_WIDTH = 24; // w-6 in px
const PANEL_HALF_HEIGHT = 12; // generous hit area around the vertically-centred button

export function NodeActionsPanel({ editor, leftActions = {}, rightActions = {} }: NodeActionsPanelProps) {
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);
  const hoveredBlockRef = useRef<HoveredBlock | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      hoveredBlockRef.current = null;
      setHoveredBlock(null);
    }, 150);
  };

  const updateBlock = (block: HoveredBlock | null) => {
    hoveredBlockRef.current = block;
    setHoveredBlock(block);
  };

  useEffect(() => {
    if (!editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      const view = editor.view;
      const editorRect = view.dom.getBoundingClientRect();

      // Check if cursor is over the left action panel.
      const block = hoveredBlockRef.current;
      if (block) {
        const midY = block.rect.top + block.rect.height / 2;
        const inPanel =
          e.clientX >= editorRect.left &&
          e.clientX <= editorRect.left + PANEL_WIDTH &&
          e.clientY >= midY - PANEL_HALF_HEIGHT &&
          e.clientY <= midY + PANEL_HALF_HEIGHT;
        if (inPanel) {
          cancelHide();
          return;
        }
      }

      // Check if cursor is within the editor bounding box.
      const inEditor =
        e.clientX >= editorRect.left &&
        e.clientX <= editorRect.right &&
        e.clientY >= editorRect.top &&
        e.clientY <= editorRect.bottom;

      if (!inEditor) {
        scheduleHide();
        return;
      }

      // Cursor is inside the editor — resolve which block it's over.
      cancelHide();
      const result = view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!result) return; // padding area — keep the last block visible
      const $pos = view.state.doc.resolve(result.pos);
      if ($pos.depth < 1) return;
      const blockPos = $pos.before(1);
      const blockNode = $pos.node(1);
      const { node: domNode } = view.domAtPos(blockPos + 1);
      let el: Node | null = domNode;
      while (el && el.parentNode !== view.dom) {
        el = el.parentNode;
      }
      if (!el) return;
      updateBlock({ pos: blockPos, node: blockNode, rect: (el as HTMLElement).getBoundingClientRect() });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelHide();
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor || !hoveredBlock) return null;

  const nodeTypeName = hoveredBlock.node.type.name;
  const currentLeftActions = leftActions[nodeTypeName] ?? [];
  const currentRightActions = rightActions[nodeTypeName] ?? [];

  if (currentLeftActions.length === 0 && currentRightActions.length === 0) return null;

  const editorRect = editor.view.dom.getBoundingClientRect();

  return (
    <>
      {currentLeftActions.length > 0 && (
        <div
          className="fixed z-10 flex flex-col items-end w-6 -translate-y-1/2 print:hidden"
          style={{ top: hoveredBlock.rect.top + hoveredBlock.rect.height / 2, left: editorRect.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {currentLeftActions.map((ActionComp, i) => (
            <ActionComp
              key={i}
              editor={editor}
              pos={hoveredBlock.pos}
              node={hoveredBlock.node}
            />
          ))}
        </div>
      )}
      {currentRightActions.length > 0 && (
        <div
          className="fixed z-10 flex flex-col items-start w-6 -translate-y-1/2 print:hidden"
          style={{ top: hoveredBlock.rect.top + hoveredBlock.rect.height / 2, left: editorRect.right }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {currentRightActions.map((ActionComp, i) => (
            <ActionComp
              key={i}
              editor={editor}
              pos={hoveredBlock.pos}
              node={hoveredBlock.node}
            />
          ))}
        </div>
      )}
    </>
  );
}
