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

export async function stopCurrentSession(state: AppState, syncMachine?: SyncStateMachine): Promise<void> {
  state.lastAbortedAt = Date.now();
  const sid = state.activeSessionId || state.awaitingSessionId || state.activeSession?.id || state.sessions.find((s) => s.isGenerating)?.id || 'default';
  if (state.activeSession) {
    state.activeSession.isGenerating = false;
    state.activeSession.messages?.forEach((m: any) => { if (m.isLive) m.isLive = false; });
    state.activeSession.messages = state.activeSession.messages?.filter((m: any) =>
      !(m?.role === 'assistant' && !m?.content?.trim() && !m?.tool_calls?.length && !m?.thinking && !m?.thought)
    ) || [];
    state.activeSession.subagents?.forEach((s) => { if (s.status === 'running') s.status = 'failed'; });
    state.activeSession.backgroundTasks?.forEach((t) => { if (t.status === 'running') t.status = 'failed'; });
  }
  state.sessions.forEach((s) => { if (s.id === sid || s.isGenerating) s.isGenerating = false; });
  state.isSending = false;
  state.isAwaitingResponse = false;
  state.awaitingSessionId = undefined;
  syncMachine?.setAwaitingResponse?.(false);

  if (state.syncMode === 'git-backup' && syncMachine) {
    try {
      await syncMachine.pushInboxMessage({
        id: `abort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId: sid,
        content: '',
        role: 'user',
        action: 'abort' as any,
        timestamp: Date.now(),
      });
      state.errorMessage = undefined;
    } catch {
      state.errorMessage = 'Failed to stop agent: could not send abort message to git sync inbox.';
    }
  } else {
    try {
      const ok = await stopSession(sid);
      if (ok) {
        state.errorMessage = undefined;
      } else {
        state.errorMessage = 'Failed to stop agent: stop signal was not received by the server.';
      }
    } catch {
      state.errorMessage = 'Failed to stop agent: could not reach server.';
    }
  }
}

export function buildPlanHandoffPrompt(planPath: string, planTitle?: string): string {
  const title = planTitle || planPath.split('/').pop() || 'Plan';
  const planRef = planPath ? ` [${title}](${planPath})` : '';
  return `I am ready to implement the plan${planRef}. Please follow each step in the plan, work through the checklist items in order, verify the changes, and produce a walkthrough.md artifact summarizing the changes made, verification results, and tested behavior.`;
}

export async function submitMessageFlow(
  state: AppState, syncMachine: SyncStateMachine, text: string,
  onReload: () => Promise<void>, onRender: () => void
): Promise<void> {
  const input = typeof document !== 'undefined' ? (document.getElementById('composer-input') as HTMLTextAreaElement | null) : null;
  const attachments = state.attachments && state.attachments.length > 0 ? [...state.attachments] : undefined;
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

