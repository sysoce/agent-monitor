import type { AppState } from './types';
import type { SyncStateMachine } from './syncStateMachine';
import { submitMessageFlow } from './messageSender';
import {
  enqueueQueuedMessage,
  dequeueNextQueuedMessage,
  removeQueuedMessageById,
  toggleQueuedCollapse,
} from './queuedMessagesStore';

export function isAgentBusy(state: AppState): boolean {
  return Boolean(
    state.activeSession?.isGenerating ||
    state.isSending ||
    state.isAwaitingResponse ||
    state.sessions.some((s) => s.id === state.activeSessionId && s.isGenerating)
  );
}

export async function handleQueueOrSendMessage(
  state: AppState,
  syncMachine: SyncStateMachine,
  reloadData: (init?: boolean) => Promise<void>,
  render: () => void
): Promise<void> {
  const input = typeof document !== 'undefined'
    ? (document.getElementById('composer-input') as HTMLTextAreaElement | null)
    : null;
  const text = (input?.value || state.composerDraft || '').trim();
  const hasContent = Boolean(text || (state.attachments && state.attachments.length > 0));
  if (!hasContent) return;

  if (isAgentBusy(state)) {
    enqueueQueuedMessage(
      state,
      text,
      state.attachments,
      state.composerMode,
      state.activeSessionId
    );
    state.composerDraft = '';
    state.attachments = [];
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    render();
    return;
  }

  await submitMessageFlow(state, syncMachine, text, () => reloadData(false), render);
}

export async function handleSendNowQueuedMessage(
  state: AppState,
  syncMachine: SyncStateMachine,
  id: string,
  stopSession: () => void,
  reloadData: (init?: boolean) => Promise<void>,
  render: () => void
): Promise<void> {
  const msg = removeQueuedMessageById(state, id);
  if (!msg) return;

  if (isAgentBusy(state)) {
    stopSession();
  }
  render();
  await submitMessageFlow(state, syncMachine, msg.text, () => reloadData(false), render);
}

export function handleEditQueuedMessage(
  state: AppState,
  id: string,
  render: () => void
): void {
  const msg = removeQueuedMessageById(state, id);
  if (!msg) return;

  state.composerDraft = msg.text;
  state.attachments = msg.attachments ? [...msg.attachments] : [];
  if (typeof document !== 'undefined') {
    const input = document.getElementById('composer-input') as HTMLTextAreaElement | null;
    if (input) {
      input.value = msg.text;
      input.focus();
    }
  }
  render();
}

export function handleDeleteQueuedMessage(
  state: AppState,
  id: string,
  render: () => void
): void {
  removeQueuedMessageById(state, id);
  render();
}

export function handleToggleQueuedCollapseAction(
  state: AppState,
  render: () => void
): void {
  toggleQueuedCollapse(state);
  render();
}

export async function processNextQueuedMessageIfReady(
  state: AppState,
  syncMachine: SyncStateMachine,
  reloadData: (init?: boolean) => Promise<void>,
  render: () => void
): Promise<void> {
  if (isAgentBusy(state)) return;
  const next = dequeueNextQueuedMessage(state, state.activeSessionId);
  if (!next) return;

  render();
  await submitMessageFlow(state, syncMachine, next.text, () => reloadData(false), render);
}
