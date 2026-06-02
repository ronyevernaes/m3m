import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView, ViewMutationRecord } from '@tiptap/pm/view';
import { Slice } from '@tiptap/pm/model';
import type { Node as PmNode } from '@tiptap/pm/model';
import { findSections, makeSectionKey } from './CollapsibleHeadingExtension';
import type { CollapsibleStorage } from './CollapsibleHeadingExtension';
import { useUiStore } from '../../../store/ui';

// ── SVG constants ────────────────────────────────────────────────────────────

const CHEVRON_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3l4 4 4-4"/></svg>`;

const GRIP_SVG = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.5"/><circle cx="7" cy="3" r="1.5"/><circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/></svg>`;

// ── Module-level drag state ──────────────────────────────────────────────────

interface DragState {
  from: number;
  to: number;
  slice: Slice;
}

let dragState: DragState | null = null;

// ── Drop indicator helpers ───────────────────────────────────────────────────

const INDICATOR_SELECTOR = '.pm-block-wrapper, .pm-list-item-wrapper';

function clearDropIndicator(): void {
  document.querySelectorAll('.pm-drop-before, .pm-drop-after').forEach((el) => {
    el.classList.remove('pm-drop-before', 'pm-drop-after');
  });
}

function updateDropIndicator(event: DragEvent): void {
  if (!dragState) return;
  clearDropIndicator();
  const target = (event.target as Element)?.closest(INDICATOR_SELECTOR);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  target.classList.add(event.clientY < midY ? 'pm-drop-before' : 'pm-drop-after');
}

// ── Drop position resolution ─────────────────────────────────────────────────

type GetPosFn = (() => number | undefined) | boolean;

interface DropInfo {
  pos: number;
  before: boolean;
}

function getDropPosition(view: EditorView): DropInfo | null {
  const dropBefore = document.querySelector('.pm-drop-before') as (HTMLElement & {
    __pmGetPos?: () => number | undefined;
  }) | null;
  const dropAfter = document.querySelector('.pm-drop-after') as (HTMLElement & {
    __pmGetPos?: () => number | undefined;
  }) | null;
  const targetEl = dropBefore ?? dropAfter;
  if (!targetEl) return null;

  const isBefore = !!dropBefore;
  const getPos = targetEl.__pmGetPos;
  const pmPos = getPos?.();
  if (pmPos === undefined) return null;

  const node = view.state.doc.nodeAt(pmPos);
  if (!node) return null;

  const insertPos = isBefore ? pmPos : pmPos + node.nodeSize;
  return { pos: insertPos, before: isBefore };
}

// ── Drop transaction ─────────────────────────────────────────────────────────

function performDrop(view: EditorView): boolean {
  if (!dragState) return false;
  const { from, to, slice } = dragState;
  dragState = null;

  const dropInfo = getDropPosition(view);
  if (!dropInfo) return false;

  const { pos: targetPos } = dropInfo;

  // Drop within source range → no-op
  if (targetPos > from && targetPos < to) return true;
  if (targetPos === from) return true;

  const tr = view.state.tr;

  if (targetPos >= to) {
    tr.delete(from, to);
    tr.insert(tr.mapping.map(targetPos), slice.content);
  } else {
    tr.insert(targetPos, slice.content);
    tr.delete(tr.mapping.map(from), tr.mapping.map(to));
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

// ── Drag start/end handlers ──────────────────────────────────────────────────

function startDrag(
  e: DragEvent,
  view: EditorView,
  getPos: GetPosFn,
  wrapper: HTMLElement,
  isHeading = false,
): void {
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

  const slice = doc.slice(from, to);
  dragState = { from, to, slice };

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', slice.content.textBetween(0, slice.content.size, '\n'));
  (view as unknown as { dragging: { slice: Slice; move: boolean } }).dragging = {
    slice,
    move: true,
  };

  wrapper.classList.add('opacity-40');
}

function endDrag(wrapper: HTMLElement): void {
  dragState = null;
  wrapper.classList.remove('opacity-40');
  clearDropIndicator();
}

// ── Grip button factory ──────────────────────────────────────────────────────

function createGrip(
  view: EditorView,
  getPos: GetPosFn,
  wrapper: HTMLElement,
  isHeading = false,
): HTMLButtonElement {
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'pm-drag-grip';
  grip.setAttribute('draggable', 'true');
  grip.setAttribute('contenteditable', 'false');
  grip.setAttribute('aria-label', 'Drag to reorder');
  grip.innerHTML = GRIP_SVG;

  grip.addEventListener('dragstart', (e: DragEvent) => startDrag(e, view, getPos, wrapper, isHeading));
  grip.addEventListener('dragend', () => endDrag(wrapper));

  return grip;
}

// ── Actions container factory ────────────────────────────────────────────────

function createActionsDiv(
  view: EditorView,
  getPos: GetPosFn,
  wrapper: HTMLElement,
  isHeading = false,
): { actionsDiv: HTMLDivElement; grip: HTMLButtonElement } {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'pm-block-actions';
  actionsDiv.setAttribute('contenteditable', 'false');

  const grip = createGrip(view, getPos, wrapper, isHeading);
  actionsDiv.appendChild(grip);

  return { actionsDiv, grip };
}

// ── NodeView factories ───────────────────────────────────────────────────────

function createBlockView(tagName: string, expectedType: string) {
  return (_pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') {
      (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    const { actionsDiv } = createActionsDiv(view, getPos, wrapper);
    const content = document.createElement(tagName);

    wrapper.appendChild(actionsDiv);
    wrapper.appendChild(content);

    return {
      dom: wrapper,
      contentDOM: content,
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== expectedType) return false;
        if (typeof getPos === 'function') {
          (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return actionsDiv.contains(mutation.target as Node) || mutation.target === actionsDiv;
      },
    };
  };
}

function createHorizontalRuleView() {
  return (_pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') {
      (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    const { actionsDiv } = createActionsDiv(view, getPos, wrapper);
    const hr = document.createElement('hr');

    wrapper.appendChild(actionsDiv);
    wrapper.appendChild(hr);

    return {
      dom: wrapper,
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== 'horizontalRule') return false;
        if (typeof getPos === 'function') {
          (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return actionsDiv.contains(mutation.target as Node) || mutation.target === actionsDiv;
      },
    };
  };
}

function createCodeBlockView() {
  return (pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') {
      (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    const { actionsDiv } = createActionsDiv(view, getPos, wrapper);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const lang = (pmNode.attrs.language as string) || '';
    if (lang) code.className = `language-${lang}`;
    pre.appendChild(code);

    wrapper.appendChild(actionsDiv);
    wrapper.appendChild(pre);

    return {
      dom: wrapper,
      contentDOM: code,
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== 'codeBlock') return false;
        const newLang = (updatedNode.attrs.language as string) || '';
        code.className = newLang ? `language-${newLang}` : '';
        if (typeof getPos === 'function') {
          (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return actionsDiv.contains(mutation.target as Node) || mutation.target === actionsDiv;
      },
    };
  };
}

function createHeadingView(editor: Editor) {
  return (pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const level = pmNode.attrs.level as number;
    let currentNode = pmNode;

    const storage = editor.extensionManager.extensions.find((e) => e.name === 'heading')
      ?.storage as CollapsibleStorage | undefined;

    const wrapper = document.createElement('div');
    wrapper.className = 'pm-block-wrapper';
    if (typeof getPos === 'function') {
      (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    // Actions: grip + collapse button
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pm-block-actions';
    actionsDiv.setAttribute('contenteditable', 'false');

    const grip = createGrip(view, getPos, wrapper, true);

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className =
      'pm-collapse-btn flex-shrink-0 p-0.5 rounded text-foreground/40 hover:text-foreground transition-colors duration-150';
    collapseBtn.setAttribute('contenteditable', 'false');
    collapseBtn.innerHTML = CHEVRON_SVG;
    const chevron = collapseBtn.querySelector('svg') as SVGElement;
    chevron.style.transition = 'transform 150ms';

    actionsDiv.appendChild(grip);
    actionsDiv.appendChild(collapseBtn);

    const heading = document.createElement(`h${level}`);

    wrapper.appendChild(actionsDiv);
    wrapper.appendChild(heading);

    // ── Collapse logic ───────────────────────────────────────────────────────
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
      const isCollapsed =
        Boolean(currentKey) && Boolean(storage?.collapsedSections.has(currentKey));
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
      contentDOM: heading,
      update(updatedNode: PmNode) {
        if (
          updatedNode.type.name !== 'heading' ||
          (updatedNode.attrs.level as number) !== level
        ) {
          return false;
        }
        currentNode = updatedNode;
        currentKey = computeKey();
        syncVisual();
        if (typeof getPos === 'function') {
          (wrapper as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return actionsDiv.contains(mutation.target as Node) || mutation.target === actionsDiv;
      },
      destroy() {
        unsubscribe();
      },
    };
  };
}

function createListItemView(editor: Editor) {
  return (_pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const li = document.createElement('li');
    li.className = 'pm-list-item-wrapper';
    if (typeof getPos === 'function') {
      (li as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pm-list-actions';
    actionsDiv.setAttribute('contenteditable', 'false');

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'pm-drag-grip';
    grip.setAttribute('draggable', 'true');
    grip.setAttribute('contenteditable', 'false');
    grip.setAttribute('aria-label', 'Drag to reorder');
    grip.innerHTML = GRIP_SVG;

    grip.addEventListener('dragstart', (e: DragEvent) => startDrag(e, view, getPos, li));
    grip.addEventListener('dragend', () => endDrag(li));

    actionsDiv.appendChild(grip);

    const marker = document.createElement('span');
    marker.className = 'pm-list-marker';
    marker.setAttribute('contenteditable', 'false');

    const content = document.createElement('div');
    content.className = 'min-w-0 flex-1';

    li.appendChild(actionsDiv);
    li.appendChild(marker);
    li.appendChild(content);

    const updateMarker = () => {
      if (typeof getPos !== 'function') {
        marker.textContent = '•';
        return;
      }
      const pos = getPos();
      if (pos === undefined) {
        marker.textContent = '•';
        return;
      }
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
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== 'listItem') return false;
        updateMarker();
        if (typeof getPos === 'function') {
          (li as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return (
          actionsDiv.contains(mutation.target as Node) ||
          mutation.target === actionsDiv ||
          marker.contains(mutation.target as Node) ||
          mutation.target === marker
        );
      },
    };
  };
}

function createTaskItemView() {
  return (pmNode: PmNode, view: EditorView, getPos: GetPosFn) => {
    const li = document.createElement('li');
    li.className = 'pm-list-item-wrapper';
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', String(pmNode.attrs.checked));
    if (typeof getPos === 'function') {
      (li as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pm-list-actions';
    actionsDiv.setAttribute('contenteditable', 'false');

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'pm-drag-grip';
    grip.setAttribute('draggable', 'true');
    grip.setAttribute('contenteditable', 'false');
    grip.setAttribute('aria-label', 'Drag to reorder');
    grip.innerHTML = GRIP_SVG;

    grip.addEventListener('dragstart', (e: DragEvent) => startDrag(e, view, getPos, li));
    grip.addEventListener('dragend', () => endDrag(li));

    actionsDiv.appendChild(grip);

    const label = document.createElement('label');
    label.setAttribute('contenteditable', 'false');
    label.style.flexShrink = '0';
    label.style.marginTop = '0.25em';
    label.style.lineHeight = '1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = pmNode.attrs.checked as boolean;
    checkbox.style.cursor = 'pointer';
    checkbox.style.margin = '0';
    checkbox.style.width = '1.1rem';
    checkbox.style.height = '1.1rem';

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
    content.style.flex = '1';
    content.style.minWidth = '0';

    li.appendChild(actionsDiv);
    li.appendChild(label);
    li.appendChild(content);

    return {
      dom: li,
      contentDOM: content,
      update(updatedNode: PmNode) {
        if (updatedNode.type.name !== 'taskItem') return false;
        checkbox.checked = updatedNode.attrs.checked as boolean;
        li.setAttribute('data-checked', String(updatedNode.attrs.checked));
        if (typeof getPos === 'function') {
          (li as HTMLElement & { __pmGetPos?: () => number | undefined }).__pmGetPos = getPos;
        }
        return true;
      },
      ignoreMutation(mutation: ViewMutationRecord) {
        return (
          actionsDiv.contains(mutation.target as Node) ||
          mutation.target === actionsDiv ||
          label.contains(mutation.target as Node) ||
          mutation.target === label
        );
      },
    };
  };
}

// ── Plugin factory ───────────────────────────────────────────────────────────

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
        dragover(_view, event) {
          updateDropIndicator(event as DragEvent);
          return false;
        },
        dragleave(_view, event) {
          const de = event as DragEvent;
          if (!(de.relatedTarget as Element)?.closest?.('.ProseMirror')) {
            clearDropIndicator();
          }
          return false;
        },
      },
      handleDrop(view, _event, _slice, moved) {
        clearDropIndicator();
        if (!moved || !dragState) return false;
        return performDrop(view);
      },
    },
  });
}

// ── Extension ────────────────────────────────────────────────────────────────

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',
  addProseMirrorPlugins() {
    return [createDragHandlePlugin(this.editor)];
  },
});
