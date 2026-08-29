import type { AppState } from './types';
import { fetchSessions, fetchSessionDetail, fetchModels } from './apiClient';
import { hasLiveServer } from './authStore';
import { mergeSessionDetail } from './sessionMerge';
import { syncSessionPlans } from './sessionPlanSync';
import { getSavedTab, getSavedSessionId } from './tabStore';

export async function reloadSessionData(state: AppState, isInitial: boolean, onDone: () => void): Promise<void> {
  try {
    if (isInitial) {
      const tab = getSavedTab(), sid = getSavedSessionId();
      if (tab) state.activeTab = tab;
      if (sid) state.activeSessionId = sid;
    }

    if (state.syncMode === 'git-backup' || !hasLiveServer()) {
      if (!state.activeSessionId && state.sessions.length > 0) {
        state.activeSessionId = (state.sessions.find((s) => s.messageCount > 0) || state.sessions[0])?.id;
      }
      if (state.activeSessionId) {
        if (state.cachedSessionDetails?.[state.activeSessionId]) {
          state.activeSession = state.cachedSessionDetails[state.activeSessionId];
        } else if (!state.activeSession || state.activeSession.id !== state.activeSessionId) {
          const s = state.sessions.find((sess) => sess.id === state.activeSessionId);
          state.activeSession = {
            id: state.activeSessionId,
            title: s?.title || state.activeSessionId,
            mode: 'agent',
            createdAt: s?.createdAt || Date.now(),
            updatedAt: s?.updatedAt || Date.now(),
            messages: [],
            filesChanged: [],
            artifacts: [],
            subagents: [],
            plans: s?.plans?.map((p) => ({ name: p.name, title: p.title, path: p.path, updatedAt: Date.now(), sizeBytes: 0 })) || [],
          };
        }
      }
      state.isLoadingSessions = false;
      state.isLoadingSession = false;
      await syncSessionPlans(state);
      onDone();
      return;
    }

    if (!state.sessions || state.sessions.length === 0) state.isLoadingSessions = true;
    const [sessions, catalog] = await Promise.all([
      fetchSessions().catch(() => null),
      fetchModels().catch(() => ({ models: [], groups: [] })),
    ]);
    if (sessions !== null) {
      if (state.lastAbortedAt) {
        for (const s of sessions) {
          if (s.id === state.lastAbortedSessionId || s.id === state.activeSessionId) s.isGenerating = false;
        }
      }
      if (state.activeSessionId && state.activeSession) {
        const matching = sessions.find((s) => s.id === state.activeSessionId);
        if (matching) {
          if (!state.isSending) {
            state.activeSession.isGenerating = matching.isGenerating;
          }
          matching.messageCount = Math.max(matching.messageCount || 0, state.activeSession.messages?.length || 0);
          matching.updatedAt = Math.max(matching.updatedAt || 0, state.activeSession.updatedAt || 0);
        }
      }
      state.sessions = sessions.sort((a, b) => {
        const aRunning = a.isGenerating ? 1 : 0;
        const bRunning = b.isGenerating ? 1 : 0;
        if (aRunning !== bRunning) return bRunning - aRunning;
        return b.updatedAt - a.updatedAt;
      });
    }
    state.isLoadingSessions = false;
    if (catalog.models?.length) state.availableModels = catalog.models;
    if (catalog.groups?.length) state.modelGroups = catalog.groups;
    if (isInitial && !state.activeSessionId && state.sessions.length > 0) {
      state.activeSessionId = (state.sessions.find((s) => s.messageCount > 0) || state.sessions[0])?.id;
      if (!getSavedTab()) Object.assign(state, { activeTab: 'chat', activePlan: undefined, activePlanName: undefined });
    }
    if (state.activeSessionId) {
      if (!state.activeSession || (state.activeSession.messages && state.activeSession.messages.length === 0)) state.isLoadingSession = true;
      const d = await fetchSessionDetail(state.activeSessionId).catch(() => undefined);
      state.isLoadingSession = false;
      if (d) state.activeSession = mergeSessionDetail(state.activeSession, d, undefined, state.lastAbortedAt);
      if (state.activeSession && !state.activeSession.isGenerating && !state.isSending) {
        Object.assign(state, { isAwaitingResponse: false, awaitingSessionId: undefined });
      }
      if (state.lastAbortedAt && state.activeSession?.messages) {
        const hasNewTurn = state.activeSession.messages.some((m) => m.role === 'user' && Number((m as { timestamp?: number }).timestamp || 0) > (state.lastAbortedAt || 0));
        if (!hasNewTurn) {
          state.activeSession.isGenerating = false;
          Object.assign(state, { isAwaitingResponse: false, awaitingSessionId: undefined });
        }
      }
      if (state.activeSession?.messages?.slice(-1)[0]?.role === 'assistant') {
        Object.assign(state, { isAwaitingResponse: false, awaitingSessionId: undefined });
      }
      if (state.activeSession && state.sessions) {
        const matching = state.sessions.find((s) => s.id === state.activeSession!.id);
        if (matching) {
          matching.isGenerating = state.activeSession.isGenerating;
          matching.messageCount = Math.max(matching.messageCount || 0, state.activeSession.messages?.length || 0);
          matching.updatedAt = Math.max(matching.updatedAt || 0, state.activeSession.updatedAt || 0);
          state.sessions.sort((a, b) => {
            const aRunning = a.isGenerating ? 1 : 0;
            const bRunning = b.isGenerating ? 1 : 0;
            if (aRunning !== bRunning) return bRunning - aRunning;
            return b.updatedAt - a.updatedAt;
          });
        }
      }
      await syncSessionPlans(state);
    }

  } catch {
    state.isLoadingSessions = false;
  }
  onDone();
}
