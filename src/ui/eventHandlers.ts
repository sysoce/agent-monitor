import type { AppState } from './types';
import type { TransportMode } from '../sync/types';
import { handleDelegatedClick } from './eventDelegation';
import { filterSessionCardsInPlace } from './sessionFilter';
import { setupMentionInput, bindMentionActions } from './mentionEvents';
import { bindModelPickerEvents } from './modelPickerEvents';
import { updateComposerButton } from './composerButton';
import { bindComposerKeyboardScroll } from './viewportManager';
import { handleComposerKeydown, autoResizeTextarea } from './composerInputEvents';
export { bindLoginEvents } from './loginEvents';

export interface EventHandlerCallbacks {
  onSelectSession: (id: string) => void | Promise<void>;
  onNewSession: () => void | Promise<void>;
  onSendMessage: () => Promise<void> | void;
  onSendNowQueued?: (id: string) => Promise<void> | void;
  onEditQueued?: (id: string) => void;
  onDeleteQueued?: (id: string) => void;
  onToggleQueuedCollapse?: () => void;
  onBuildPlan?: (planPath: string, planTitle?: string) => Promise<void> | void;
  onStopSession?: () => Promise<void> | void;
  onResolveApproval?: (commandId: string, allowed: boolean) => Promise<void> | void;
  onSelectModel?: (modelId: string) => void;
  onSelectPlan: (planName: string) => Promise<void> | void;
  onLoginSuccess: () => Promise<void> | void;
  onLogout?: () => void;
  onToggleSyncMode?: () => void;
  onSetSyncMode?: (mode: TransportMode) => void;
  onToggleAutoFallback?: (enabled: boolean) => void;
  onSwitchConnection?: (url: string) => void | Promise<void>;
  onRender: () => void;
}

let rootClickBound = false;

export function initRootDelegation(state: AppState, callbacks: EventHandlerCallbacks): void {
  if (rootClickBound || typeof document === 'undefined') return;
  rootClickBound = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target) {
      handleDelegatedClick(target, state, callbacks);
    }
  });
}

function bindInputControls(state: AppState, callbacks: EventHandlerCallbacks): void {
  if (typeof document === 'undefined') return;

  const search = document.getElementById('session-search') as HTMLInputElement | null;
  if (search && !search.dataset.bound) {
    search.dataset.bound = 'true';
    search.addEventListener('input', () => {
      state.searchQuery = search.value;
      filterSessionCardsInPlace(search.value);
    });
  }

  const composer = document.getElementById('composer-input') as HTMLTextAreaElement | null;
  if (composer && !composer.dataset.bound) {
    composer.dataset.bound = 'true';
    bindComposerKeyboardScroll(composer);
    composer.addEventListener('input', () => {
      state.composerDraft = composer.value;
      autoResizeTextarea(composer);
      updateComposerButton(state);
    });
    composer.addEventListener('keydown', (e) => {
      handleComposerKeydown(e, state, callbacks);
    });
  }
}

import { handleFileDropOrPaste, extractFilesFromEvent } from './dropPasteHandler';

function bindGlobalDragAndDrop(state: AppState, onRender: () => void): void {
  if (typeof document === 'undefined' || (document as any)._dragDropBound) return;
  (document as any)._dragDropBound = true;

  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = extractFilesFromEvent(e);
    if (files.length > 0) await handleFileDropOrPaste(state, files, onRender);
  });
  document.addEventListener('paste', async (e: ClipboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl?.id === 'composer-input' || activeEl?.tagName === 'INPUT') return;
    const files = extractFilesFromEvent(e);
    if (files.length > 0) await handleFileDropOrPaste(state, files, onRender);
  });
}

export function bindAppEvents(state: AppState, callbacks: EventHandlerCallbacks): void {
  initRootDelegation(state, callbacks);
  bindInputControls(state, callbacks);
  bindModelPickerEvents(state, callbacks);
  setupMentionInput(state, callbacks.onRender);
  bindMentionActions(state, callbacks.onRender);
  bindGlobalDragAndDrop(state, callbacks.onRender);
}
