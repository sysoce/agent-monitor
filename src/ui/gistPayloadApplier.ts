import type { AppState } from './types';
import type { SyncGistPayload } from '../sync/types';
import { mergeSessionDetail } from './sessionMerge';
import { processVersionCheck } from './updateManager';

function isMessageFinished(lastMsg: any): boolean {
  if (!lastMsg || lastMsg.role !== 'assistant') return false;
  return Boolean(
    (lastMsg.content && lastMsg.content.trim()) ||
    lastMsg.tool_calls?.length ||
    lastMsg.thought?.trim() ||
    lastMsg.isError
  );
}

function mergeActiveIntoSessions(state: AppState, payloadSessions: any[]): any[] {
  const merged = [...payloadSessions];
  const sid = state.activeSessionId;
  const sess = state.activeSession;
  if (sid && sess && !merged.some((s) => s.id === sid)) {
    merged.unshift({
      id: sid,
      title: sess.title || sid,
      createdAt: sess.createdAt || Date.now(),
      updatedAt: sess.updatedAt || Date.now(),
      messageCount: sess.messages?.length || 1,
      preview: sess.messages?.[0]?.content?.slice(0, 80) || '(empty session)',
    });
  }
  return merged;
}

export function applyGistSyncPayload(state: AppState, payload: SyncGistPayload): boolean {
  if (payload.appVersion) {
    processVersionCheck(state, payload.appVersion);
  }
  if (payload.sessionDetails) {
    state.cachedSessionDetails = { ...state.cachedSessionDetails, ...payload.sessionDetails };
  }

  if (payload.sessions && payload.sessions.length > 0) {
    state.sessions = mergeActiveIntoSessions(state, payload.sessions);
    if (!state.activeSessionId) {
      if (state.activeTab !== 'chat') {
        state.activeSessionId = payload.activeSession?.sessionId || state.sessions[0]?.id;
      } else if (payload.activeSession?.sessionId && isMessageFinished(payload.activeSession.session?.messages?.slice(-1)[0])) {
        state.activeSessionId = payload.activeSession.sessionId;
      }
    }
  } else if (payload.sessions && payload.sessions.length === 0 && !state.activeSessionId) {
    Object.assign(state, { sessions: [], activeSessionId: undefined, activeSession: undefined, activeTab: 'sidebar' });
  }

  const sid = state.activeSessionId;
  const matched = sid ? (payload.sessionDetails?.[sid] || (payload.activeSession?.sessionId === sid ? payload.activeSession.session : undefined)) : undefined;
  let turnDone = false;
  const isAbortedRecently = Boolean(state.lastAbortedAt && Date.now() - state.lastAbortedAt < 10_000 && (payload.updatedAt || 0) <= state.lastAbortedAt);

  if (isAbortedRecently) {
    state.isAwaitingResponse = false;
    state.awaitingSessionId = undefined;
    if (state.activeSession) state.activeSession.isGenerating = false;
    for (const s of state.sessions) {
      if (s.id === sid || s.isGenerating) s.isGenerating = false;
    }
  }

  if (matched && sid) {
    state.activeSession = mergeSessionDetail(state.activeSession, matched, payload.inbox);
    state.plans = matched.plans || [];
    if (isAbortedRecently && state.activeSession) {
      state.activeSession.isGenerating = false;
    }
    const hasPending = !isAbortedRecently && (payload.inbox || []).some((m) => m.sessionId === sid && m.action !== 'abort' && (m.role as string) !== 'abort');
    const lastMsg = state.activeSession?.messages?.slice(-1)[0];
    const isFinished = isMessageFinished(lastMsg) && !(lastMsg as any)?.isLive;
    const isGen = isAbortedRecently ? false : (state.activeSession?.isGenerating ?? matched.isGenerating);

    if (hasPending || (isGen && !isFinished)) {
      state.isAwaitingResponse = true;
      state.awaitingSessionId = sid;
    } else {
      if (!state.awaitingSessionId || state.awaitingSessionId === sid) {
        state.isAwaitingResponse = false;
        state.awaitingSessionId = undefined;
        turnDone = true;
      }
      if (state.activeSession?.messages) {
        state.activeSession.messages = state.activeSession.messages.filter((m: any) =>
          !(m?.role === 'assistant' && !isMessageFinished(m))
        );
      }
    }
  }

  if (state.awaitingSessionId && state.awaitingSessionId !== sid) {
    const bg = payload.sessionDetails?.[state.awaitingSessionId] || (payload.activeSession?.sessionId === state.awaitingSessionId ? payload.activeSession.session : undefined);
    const bgPending = (payload.inbox || []).some((m) => m.sessionId === state.awaitingSessionId && m.action !== 'abort' && (m.role as string) !== 'abort');
    if (!bgPending && !bg?.isGenerating && isMessageFinished(bg?.messages?.slice(-1)[0])) {
      state.isAwaitingResponse = false;
      state.awaitingSessionId = undefined;
      turnDone = true;
    }
  }

  return turnDone;
}
