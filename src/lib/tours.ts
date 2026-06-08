import { driver } from 'driver.js';
import type { DriveStep } from 'driver.js';

export const ONBOARDING_TOUR_ID = 'general-onboarding-v1';

export const onboardingSteps: DriveStep[] = [
  {
    element: '[data-tour="vault-switcher"]',
    popover: {
      title: 'Your vault',
      description:
        'A vault is a plain folder on disk — all your notes live there as Markdown files. ' +
        'Click here to open the vault menu: switch to another vault, create a new one, ' +
        'rename or remove an existing vault, or reveal its folder in Finder.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="new-note-button"]',
    popover: {
      title: 'New note',
      description: 'Create a blank note in the active vault. You can also press ⌘N.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="search-input"]',
    popover: {
      title: 'Search',
      description: 'Full-text search across all notes in your vault. Press ⌘K at any time to focus here.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="advanced-search-toggle"]',
    popover: {
      title: 'Filter by tag',
      description: 'Expand the filter panel to narrow notes by tag or other criteria.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="notes-list"]',
    popover: {
      title: 'Notes list',
      description: 'All notes in your vault appear here. Click any note to open it.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-button"]',
    popover: {
      title: 'Settings',
      description: 'Theme, font, autosave delay, and vault options. Also accessible with ⌘,',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const EDITOR_TOUR_ID = 'editor-onboarding-v1';

export const editorOnboardingSteps: DriveStep[] = [
  {
    element: '[data-tour="editor-toolbar"]',
    popover: {
      title: 'Formatting toolbar',
      description:
        'Bold, italic, headings, lists, code blocks, tables, links — ' +
        'all reachable from here. Everything also has a Markdown shortcut you can type directly.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="context-panel"]',
    popover: {
      title: 'Context panel',
      description:
        'Details, outgoing links, backlinks, and AI insights for the open note. ' +
        'Drag the divider to resize, or collapse it when you need more writing space.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="markdown-help"]',
    popover: {
      title: 'Markdown reference',
      description:
        'A quick-reference sheet for all supported Markdown syntax — headings, inline formatting, tables, wikilinks, and more.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export function createEditorOnboardingDriver(onComplete: () => void) {
  const availableSteps = editorOnboardingSteps.filter(
    (step) => !step.element || document.querySelector(step.element as string),
  );

  return driver({
    steps: availableSteps,
    popoverClass: 'driver-m3m-popover',
    overlayOpacity: 0.4,
    stagePadding: 8,
    smoothScroll: false,
    allowClose: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    onDestroyStarted: (_el, _step, { driver: d }) => {
      onComplete();
      d.destroy();
    },
  });
}

export function createOnboardingDriver(onComplete: () => void) {
  const availableSteps = onboardingSteps.filter(
    (step) => !step.element || document.querySelector(step.element as string),
  );

  return driver({
    steps: availableSteps,
    popoverClass: 'driver-m3m-popover',
    overlayOpacity: 0.4,
    stagePadding: 8,
    smoothScroll: false,
    allowClose: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    onDestroyStarted: (_el, _step, { driver: d }) => {
      onComplete();
      d.destroy();
    },
  });
}
