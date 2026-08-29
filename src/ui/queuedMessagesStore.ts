import type { AppState, QueuedMessage } from './types';
import type { AttachmentItem } from '../types';

export function enqueueQueuedMessage(
  state: AppState,
  text: string,
  attachments?: AttachmentItem[],
  mode?: 'agent' | 'plan' | 'ask',
  sessionId?: string
): QueuedMessage {
  const msg: QueuedMessage = {
    id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: sessionId || state.activeSessionId,
    text,
    attachments: attachments && attachments.length > 0 ? [...attachments] : undefined,
    mode: mode || state.composerMode || 'agent',
    createdAt: Date.now(),
  };
  state.queuedMessages = state.queuedMessages || [];
  state.queuedMessages.push(msg);
  return msg;
}

export function dequeueNextQueuedMessage(
  state: AppState,
  sessionId?: string
): QueuedMessage | undefined {
  if (!state.queuedMessages || state.queuedMessages.length === 0) return undefined;
  const targetSession = sessionId || state.activeSessionId;
  if (!targetSession) {
    return state.queuedMessages.shift();
  }
  const idx = state.queuedMessages.findIndex(
    (m) => !m.sessionId || m.sessionId === targetSession
  );
  if (idx !== -1) {
    return state.queuedMessages.splice(idx, 1)[0];
  }
  return undefined;
}

export function removeQueuedMessageById(
  state: AppState,
  id: string
): QueuedMessage | undefined {
  if (!state.queuedMessages || state.queuedMessages.length === 0) return undefined;
  const idx = state.queuedMessages.findIndex((m) => m.id === id);
  if (idx !== -1) {
    return state.queuedMessages.splice(idx, 1)[0];
  }
  return undefined;
}

export function getQueuedMessagesForSession(
  state: AppState,
  sessionId?: string
): QueuedMessage[] {
  if (!state.queuedMessages || state.queuedMessages.length === 0) return [];
  const targetSession = sessionId || state.activeSessionId;
  if (!targetSession) return [...state.queuedMessages];
  return state.queuedMessages.filter(
    (m) => !m.sessionId || m.sessionId === targetSession
  );
}

export function clearQueuedMessagesForSession(
  state: AppState,
  sessionId?: string
): void {
  if (!state.queuedMessages) return;
  const targetSession = sessionId || state.activeSessionId;
  if (!targetSession) {
    state.queuedMessages = [];
    return;
  }
  state.queuedMessages = state.queuedMessages.filter(
    (m) => m.sessionId && m.sessionId !== targetSession
  );
}

export function toggleQueuedCollapse(state: AppState): boolean {
  state.isQueuedMessagesCollapsed = !state.isQueuedMessagesCollapsed;
  return Boolean(state.isQueuedMessagesCollapsed);
}
