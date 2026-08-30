import type { AppState } from './types';
import type { AttachmentItem } from '../types';
import { createSession, sendSessionMessage, stopSession } from './apiClient';
import type { SyncStateMachine } from './syncStateMachine';
import { appendOptimisticUserMessage } from './sessionMerge';

export async function submitUserMessage(
  state: AppState,
  syncMachine: SyncStateMachine,
  text: string,
  attachmentsParam?: AttachmentItem[]
): Promise<void> {
  const attachments = attachmentsParam ?? (state.attachments && state.attachments.length > 0 ? [...state.attachments] : undefined);
  const sid = state.activeSessionId || `sess-${Math.random().toString(36).slice(2, 10)}`;
  state.activeSessionId = sid;
  state.awaitingSessionId = sid;

  if (state.syncMode === 'git-backup') {
    try {
      await syncMachine.pushInboxMessage({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId: sid,
        content: text,
        role: 'user',
        model: state.selectedModel,
        mode: state.composerMode,
        attachments,
        timestamp: Date.now(),
      });
    } catch (err) {
      if (!syncMachine.getAutoFallback()) {
        throw err;
      }
      try {
        const exists = state.sessions.some((s) => s.id === sid);
        if (!exists) {
          const s = await createSession(text || attachments?.[0]?.label || 'New Session');
          state.activeSessionId = s.id;
          state.awaitingSessionId = s.id;
          if (state.activeSession) state.activeSession.id = s.id;
        }
        await sendSessionMessage(state.activeSessionId || sid, text, 'user', state.selectedModel, state.composerMode, attachments);
        syncMachine.restorePrimaryLive();
      } catch {
        throw err;
      }
    }
  } else {
    const exists = state.sessions.some((s) => s.id === state.activeSessionId);
    if (!state.activeSessionId || !exists) {
      const newSess = await createSession(text || attachments?.[0]?.label || 'New Session');
      state.activeSessionId = newSess.id;
      state.awaitingSessionId = newSess.id;
      if (state.activeSession) state.activeSession.id = newSess.id;
    }
    await sendSessionMessage(
      state.activeSessionId,
      text,
      'user',
      state.selectedModel,
      state.composerMode,
      attachments
    );
  }
}

export { stopCurrentSession } from './sessionStopper';
export { buildPlanHandoffPrompt } from './planPrompt';

export async function submitMessageFlow(
  state: AppState,
  syncMachine: SyncStateMachine,
  text: string,
  onReload: () => Promise<void>,
  onRender: () => void,
  options?: { mode?: 'agent' | 'plan' | 'ask'; attachments?: AttachmentItem[] }
): Promise<void> {
  const input = typeof document !== 'undefined' ? (document.getElementById('composer-input') as HTMLTextAreaElement | null) : null;
  const attachments = options?.attachments ?? (state.attachments && state.attachments.length > 0 ? [...state.attachments] : undefined);
  if (options?.mode) state.composerMode = options.mode;
  appendOptimisticUserMessage(state, text);
  Object.assign(state, {
    composerDraft: '', attachments: [], isMentionOpen: false,
    activePlan: undefined, activePlanName: undefined, activeTab: 'chat',
    isSending: true, isAwaitingResponse: true, awaitingSessionId: state.activeSessionId,
  });
  if (input) { input.value = ''; input.style.height = 'auto'; }
  syncMachine.setAwaitingResponse(true);
  onRender();
  try {
    await submitUserMessage(state, syncMachine, text, attachments);
    state.errorMessage = undefined;
    if (state.syncMode !== 'git-backup') await onReload();
  } catch (err) {
    state.isAwaitingResponse = false;
    syncMachine.setAwaitingResponse(false);
    state.errorMessage = `Failed to send message: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    state.isSending = false;
    onRender();
  }
}

export async function sendMonitorMessage(opts: {
  content: string;
  sessionId?: string;
  role?: string;
  mode?: 'agent' | 'plan' | 'ask';
  syncMachine?: SyncStateMachine;
}): Promise<void> {
  const dummyState: any = {
    activeSessionId: opts.sessionId,
    awaitingSessionId: opts.sessionId,
    selectedModel: 'gemini-3.7-flash',
    composerMode: opts.mode || 'agent',
    syncMode: opts.syncMachine?.getMode() || 'live-sse',
    sessions: [],
  };
  if (opts.syncMachine) {
    await submitUserMessage(dummyState, opts.syncMachine, opts.content);
  }
}

