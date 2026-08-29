import type { SessionSummary } from '../server/types';
import type { AppState } from './types';

export function isSessionRunningInState(s: SessionSummary, state?: AppState): boolean {
  if (s.isGenerating) return true;
  if (!state) return false;
  if (s.id === state.activeSessionId) {
    if (state.activeSession?.isGenerating) return true;
    if (state.isAwaitingResponse && (!state.awaitingSessionId || state.awaitingSessionId === s.id)) return true;
  }
  return false;
}

export function sortSessions(sessions: SessionSummary[], state?: AppState): SessionSummary[] {
  return [...sessions].sort((a, b) => {
    const aRunning = isSessionRunningInState(a, state) ? 1 : 0;
    const bRunning = isSessionRunningInState(b, state) ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;

    const aTime = (state?.activeSessionId === a.id && state.activeSession?.updatedAt)
      ? Math.max(a.updatedAt || 0, state.activeSession.updatedAt)
      : (a.updatedAt || a.createdAt || 0);
    const bTime = (state?.activeSessionId === b.id && state.activeSession?.updatedAt)
      ? Math.max(b.updatedAt || 0, state.activeSession.updatedAt)
      : (b.updatedAt || b.createdAt || 0);

    if (bTime !== aTime) return bTime - aTime;
    const bCreated = b.createdAt || 0;
    const aCreated = a.createdAt || 0;
    if (bCreated !== aCreated) return bCreated - aCreated;
    return a.id.localeCompare(b.id);
  });
}
