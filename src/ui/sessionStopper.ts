import type { AppState } from './types';
import type { SyncStateMachine } from './syncStateMachine';
import { stopSession } from './apiClient';

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
        return;
      }
      if (syncMachine) {
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
          return;
        } catch {}
      }
      state.errorMessage = 'Failed to stop agent: stop signal was not received by the server.';
    } catch {
      if (syncMachine) {
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
          return;
        } catch {}
      }
      state.errorMessage = 'Failed to stop agent: could not reach server.';
    }
  }
}
