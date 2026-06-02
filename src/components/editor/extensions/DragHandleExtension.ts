import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView, ViewMutationRecord } from '@tiptap/pm/view';
import { Slice } from '@tiptap/pm/model';
import type { Node as PmNode } from '@tiptap/pm/model';
import { findSections, makeSectionKey } from './CollapsibleHeadingExtension';
import type { CollapsibleStorage } from './CollapsibleHeadingExtension';
import { useUiStore } from '../../../store/ui';

// ── SVG constants ─────────────────────────────────────────────────────────────

// Chevron — down when expanded, rotated -90° when collapsed
const CHEVRON_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3l4 4 4-4"/></svg>`;

// 6-dot drag grip
const GRIP_SVG = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.5"/><circle cx="7" cy="3" r="1.5"/><circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/></svg>`;

// ── Module-level drag state ───────────────────────────────────────────────────

interface DragState {
  from: number;
  to: number;
  slice: Slice;
}

let dragState: DragState | null = null;

// ── Drop indicator ────────────────────────────────────────────────────────────

const INDICATOR_SELECTOR = '.pm-block-wrapper, .pm-list-item-wrapper';

type WithGetPos = { __pmGetPos?: () => number | undefined };

function clearDropIndicator(): void {
  document.querySelectorAll('.pm-drop-before, .pm-drop-after').forEach((el) => {
    el.classList.remove('pm-drop-before', 'pm-drop-after');
  });
}

function updateDropIndicator(event: DragEvent): void {
  if (!dragState) return;
  clearDropIndicator();
  const target = (event.target as Element | null)?.closest(INDICATOR_SELECTOR);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  target.classList.add(event.clientY < rect.top + rect.height / 2 ? 'pm-drop-before' : 'pm-drop-after');
}

// ── Drop transaction ──────────────────────────────────────────────────────────

function performDrop(view: EditorView): boolean {
  if (!dragState) return false;
  const { from, to, slice } = dragState;
  dragState = null;

  // Find the target from the indicator that was set by the last dragover
  const dropBefore = document.querySelector('.pm-drop-before') as (HTMLElement & WithGetPos) | null;
  const dropAfter = document.querySelector('.pm-drop-after') as (HTMLElement & WithGetPos) | null;
  const targetEl = dropBefore ?? dropAfter;
  if (!targetEl) return false;

  const getPos = targetEl.__pmGetPos;
  const pmPos = getPos?.();
  if (pmPos === undefined) return false;

  const targetNode = view.state.doc.nodeAt(pmPos);
  if (!targetNode) return false;

  const isBefore = !!dropBefore;
  const targetPos = isBefore ? pmPos : pmPos + targetNode.nodeSize;

  // Drop within source range → no-op
  if (targetPos > from && targetPos < to) return true;
  if (targetPos === from) return true;

  const tr = view.state.tr;

  if (targetPos >= to) {
    // Drop after source: delete first so positions stay valid
    tr.delete(from, to);
    tr.insert(tr.mapping.map(targetPos), slice.content);
  } else {
    // Drop before source: insert at target, then delete (now shifted)
    tr.insert(targetPos, slice.content);
    tr.delete(tr.mapping.map(from), tr.mapping.map(to));
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

// ── Drag helpers ──────────────────────────────────────────────────────────────

type GetPosFn = (() => number | undefined) | boolean;

function attachDragEvents(
  grip: HTMLButtonElement,
  view: EditorView,
  getPos: GetPosFn,
  dragEl: HTMLElement & WithGetPos,
  isHeading = false,
): void {
  grip.addEventListener('dragstart', (e: DragEvent) => {
    // Stop propagation so ProseMirror's own dragstart doesn't override our slice
    e.stopPropagation();
    if (!e.dataTransfer) return;

    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos === undefined) return;

    const doc = view.state.doc;
    const pmNode = doc.nodeAt(pos);
    if (!pmNode) return;

    let from = pos;
    let to = pos + pmNode.nodeSize;

    if (isHeading) {
      const sections = findSections(doc);
      const section = sections.find((s) => s.contentFrom === pos + pmNode.nodeSize);
      if (section && section.contentTo > section.contentFrom) {
        to = section.contentTo;
      }
    }

    dragState = { from, to, slice: doc.slice(from, to) };

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'text/plain',
      dragState.slice.content.textBetween(0, dragState.slice.content.size, '\n'),
    );

    dragEl.classList.add('opacity-40');
  });

  grip.addEventListener('dragend', () => {
    dragState = null;
    dragEl.classList.remove('opacity-40');
    clearDropIndicator();
  });
}

function makeGrip(
  view: EditorView,
  getPos: GetPosFn,
  dragEl: HTMLElement & WithGetPos,
  isHeading = false,
): HTMLButtonElement {
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'pm-drag-grip';
  grip.setAttribute('draggable', 'true');
  grip.setAttribute('contenteditable', 'false');
  grip.setAttribute('aria-label', 'Drag to reorder');
  grip.innerHTML = GRIP_SVG;
  attachDragEvents(grip, view, getPos, dragEl, isHeading);
  return grip;
}

function makeActionsDiv(
  view: EditorView,
  getPos: GetPosFn,
  dragEl: HTMLElement & WithGetPos,
  isHeading = false,
): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'pm-block-actions';
  div.setAttribute('contenteditable', 'false');
  div.appendChild(makeGrip(view, getPos, dragEl, isHeading));
  return div;
}

// ── NodeView factories ────────────────────────────────────────────────────────

// Generic block (paragraph, blockquote, …)
function createBlockView(tagName: string, expectedType: string) {
  return (_node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div') as HTMLDivElement & WithGetPos;
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;

    const actions = makeActionsDiv(view, getPos, wrapper);
    const content = document.createElement(tagName);

    wrapper.appendChild(actions);
    wrapper.appendChild(content);

    return {
      dom: wrapper,
      contentDOM: content,
      update(n: PmNode) {
        if (n.type.name !== expectedType) return false;
        if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        return actions.contains(m.target as Node) || m.target === actions;
      },
    };
  };
}

// Horizontal rule (leaf — no contentDOM)
function createHorizontalRuleView() {
  return (_node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div') as HTMLDivElement & WithGetPos;
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;

    const actions = makeActionsDiv(view, getPos, wrapper);
    const hr = document.createElement('hr');

    wrapper.appendChild(actions);
    wrapper.appendChild(hr);

    return {
      dom: wrapper,
      update(n: PmNode) {
        if (n.type.name !== 'horizontalRule') return false;
        if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        return actions.contains(m.target as Node) || m.target === actions;
      },
    };
  };
}

// Code block — contentDOM must be <code> so lowlight inline decorations land correctly
function createCodeBlockView() {
  return (node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div') as HTMLDivElement & WithGetPos;
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;

    const actions = makeActionsDiv(view, getPos, wrapper);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const lang = (node.attrs.language as string) || '';
    if (lang) code.className = `language-${lang}`;
    pre.appendChild(code);

    wrapper.appendChild(actions);
    wrapper.appendChild(pre);

    return {
      dom: wrapper,
      contentDOM: code,
      update(n: PmNode) {
        if (n.type.name !== 'codeBlock') return false;
        code.className = (n.attrs.language as string) ? `language-${n.attrs.language as string}` : '';
        if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        return actions.contains(m.target as Node) || m.target === actions;
      },
    };
  };
}

// Heading — preserves the original NodeView structure exactly; only adds a wrapper + grip
function createHeadingView(editor: Editor) {
  return (node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const level = node.attrs.level as number;
    let currentNode = node;

    const storage = editor.extensionManager.extensions.find((e) => e.name === 'heading')
      ?.storage as CollapsibleStorage | undefined;

    // Outer wrapper (for drag)
    const wrapper = document.createElement('div') as HTMLDivElement & WithGetPos;
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;

    // Drag grip — absolutely positioned in the gutter (see CSS)
    const grip = makeGrip(view, getPos, wrapper, true);
    wrapper.appendChild(grip);

    // ── Heading element — identical to the original NodeView ────────────────
    const hEl = document.createElement(`h${level}`);
    hEl.className = 'flex items-center gap-1.5 group/heading';

    // Collapse button
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.setAttribute('contenteditable', 'false');
    collapseBtn.className =
      'flex-shrink-0 opacity-0 group-hover/heading:opacity-100 transition-opacity duration-150 p-0.5 rounded text-foreground/40 hover:text-foreground hover:bg-muted';
    collapseBtn.innerHTML = CHEVRON_SVG;
    const chevron = collapseBtn.querySelector('svg') as SVGElement;
    chevron.style.transition = 'transform 150ms';

    // Content span (contentDOM)
    const contentDOM = document.createElement('span');

    hEl.appendChild(collapseBtn);
    hEl.appendChild(contentDOM);
    wrapper.appendChild(hEl);

    // ── Collapse logic (identical to original createNodeView) ────────────────
    const computeKey = (): string => {
      if (typeof getPos !== 'function') return '';
      const pos = getPos();
      if (pos === undefined) return '';
      const doc = editor.state.doc;
      const text = currentNode.textContent;
      let idx = 0;
      doc.forEach((n, offset) => {
        if (
          offset < pos &&
          n.type.name === 'heading' &&
          n.attrs.level === level &&
          n.textContent === text
        ) {
          idx++;
        }
      });
      return makeSectionKey(level, text, idx);
    };

    let currentKey = computeKey();

    const syncVisual = () => {
      const isCollapsed = Boolean(currentKey) && Boolean(storage?.collapsedSections.has(currentKey));
      chevron.style.transform = isCollapsed ? 'rotate(-90deg)' : '';
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand section' : 'Collapse section');
    };
    syncVisual();

    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentKey || !storage) return;
      if (storage.collapsedSections.has(currentKey)) {
        storage.collapsedSections.delete(currentKey);
      } else {
        storage.collapsedSections.add(currentKey);
      }
      syncVisual();
      editor.view.dispatch(editor.view.state.tr.setMeta('rebuildDecorations', true));
      useUiStore.getState().toggleSectionCollapsed(storage.noteId, currentKey);
    });

    const unsubscribe = useUiStore.subscribe(() => syncVisual());

    return {
      dom: wrapper,
      contentDOM,
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== 'heading' || (updatedNode.attrs.level as number) !== level) {
          return false;
        }
        currentNode = updatedNode;
        currentKey = computeKey();
        syncVisual();
        if (typeof getPos === 'function') wrapper.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        const t = m.target as Node;
        // Ignore mutations inside the collapse button or the grip — they are UI-only
        return (
          collapseBtn.contains(t) || t === collapseBtn ||
          grip.contains(t) || t === grip
        );
      },
      destroy() {
        unsubscribe();
      },
    };
  };
}

// List item — li with an absolute grip, a bullet/number marker, and content div
function createListItemView(editor: Editor) {
  return (_node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const li = document.createElement('li') as HTMLLIElement & WithGetPos;
    li.className = 'pm-list-item-wrapper';
    if (typeof getPos === 'function') li.__pmGetPos = getPos;

    const listActions = document.createElement('div');
    listActions.className = 'pm-list-actions';
    listActions.setAttribute('contenteditable', 'false');

    const grip = document.createElement('button') as HTMLButtonElement;
    grip.type = 'button';
    grip.className = 'pm-drag-grip';
    grip.setAttribute('draggable', 'true');
    grip.setAttribute('contenteditable', 'false');
    grip.setAttribute('aria-label', 'Drag to reorder');
    grip.innerHTML = GRIP_SVG;
    attachDragEvents(grip, view, getPos, li);
    listActions.appendChild(grip);

    const marker = document.createElement('span');
    marker.className = 'pm-list-marker';
    marker.setAttribute('contenteditable', 'false');

    const content = document.createElement('div');
    content.className = 'min-w-0 flex-1';

    li.appendChild(listActions);
    li.appendChild(marker);
    li.appendChild(content);

    const updateMarker = () => {
      if (typeof getPos !== 'function') { marker.textContent = '•'; return; }
      const pos = getPos();
      if (pos === undefined) { marker.textContent = '•'; return; }
      const $pos = editor.state.doc.resolve(pos);
      if ($pos.parent.type.name === 'orderedList') {
        marker.textContent = `${$pos.index($pos.depth) + 1}.`;
      } else {
        marker.textContent = '•';
      }
    };
    updateMarker();

    return {
      dom: li,
      contentDOM: content,
      update(n: PmNode) {
        if (n.type.name !== 'listItem') return false;
        updateMarker();
        if (typeof getPos === 'function') li.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        const t = m.target as Node;
        return (
          listActions.contains(t) || t === listActions ||
          marker.contains(t) || t === marker
        );
      },
    };
  };
}

// Task item — replaces TaskItem's React NodeView; reimplements checkbox manually
function createTaskItemView() {
  return (node: PmNode, view: EditorView, getPos: GetPosFn) => {
    const li = document.createElement('li') as HTMLLIElement & WithGetPos;
    li.className = 'pm-list-item-wrapper';
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', String(node.attrs.checked));
    if (typeof getPos === 'function') li.__pmGetPos = getPos;

    const listActions = document.createElement('div');
    listActions.className = 'pm-list-actions';
    listActions.setAttribute('contenteditable', 'false');

    const grip = document.createElement('button') as HTMLButtonElement;
    grip.type = 'button';
    grip.className = 'pm-drag-grip';
    grip.setAttribute('draggable', 'true');
    grip.setAttribute('contenteditable', 'false');
    grip.setAttribute('aria-label', 'Drag to reorder');
    grip.innerHTML = GRIP_SVG;
    attachDragEvents(grip, view, getPos, li);
    listActions.appendChild(grip);

    const label = document.createElement('label');
    label.setAttribute('contenteditable', 'false');
    label.style.flexShrink = '0';
    label.style.marginTop = '0.25em';
    label.style.lineHeight = '1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = node.attrs.checked as boolean;
    checkbox.style.cssText = 'cursor:pointer;margin:0;width:1.1rem;height:1.1rem';
    checkbox.addEventListener('change', () => {
      if (typeof getPos !== 'function') return;
      const pos = getPos();
      if (pos === undefined) return;
      const currentAttrs = view.state.doc.nodeAt(pos)?.attrs ?? {};
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, undefined, { ...currentAttrs, checked: checkbox.checked }),
      );
    });
    label.appendChild(checkbox);

    const content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0';

    li.appendChild(listActions);
    li.appendChild(label);
    li.appendChild(content);

    return {
      dom: li,
      contentDOM: content,
      update(n: PmNode) {
        if (n.type.name !== 'taskItem') return false;
        checkbox.checked = n.attrs.checked as boolean;
        li.setAttribute('data-checked', String(n.attrs.checked));
        if (typeof getPos === 'function') li.__pmGetPos = getPos;
        return true;
      },
      ignoreMutation(m: ViewMutationRecord) {
        const t = m.target as Node;
        return (
          listActions.contains(t) || t === listActions ||
          label.contains(t) || t === label
        );
      },
    };
  };
}

// ── Plugin ────────────────────────────────────────────────────────────────────

function createDragHandlePlugin(editor: Editor): Plugin {
  return new Plugin({
    key: new PluginKey('dragHandle'),
    props: {
      nodeViews: {
        paragraph: createBlockView('p', 'paragraph'),
        blockquote: createBlockView('blockquote', 'blockquote'),
        horizontalRule: createHorizontalRuleView(),
        codeBlock: createCodeBlockView(),
        heading: createHeadingView(editor),
        listItem: createListItemView(editor),
        taskItem: createTaskItemView(),
      },

      handleDOMEvents: {
        // Show drop indicator while dragging over blocks
        dragover(_view, event) {
          updateDropIndicator(event as DragEvent);
          return false;
        },

        // Clear indicator only when cursor leaves the editor entirely
        dragleave(_view, event) {
          const de = event as DragEvent;
          if (!(de.relatedTarget as Element | null)?.closest?.('.ProseMirror')) {
            clearDropIndicator();
          }
          return false;
        },

        // Handle drop BEFORE ProseMirror's internal handler.
        // runCustomHandler (which calls handleDOMEvents) fires before editHandlers.drop,
        // so returning true here prevents ProseMirror from running its own drop logic.
        drop(view, event) {
          if (!dragState) return false;
          event.preventDefault();
          const dropped = performDrop(view);
          clearDropIndicator();
          return dropped;
        },
      },
    },
  });
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',
  addProseMirrorPlugins() {
    return [createDragHandlePlugin(this.editor)];
  },
});
