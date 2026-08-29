import type { AppState } from '../types';

export function renderMonitorSidebarStats(state: AppState): string {
  let running = 0;
  let totalMessages = 0;
  let totalArtifacts = 0;
  const seenIds = new Set<string>();

  for (const s of state.sessions) {
    seenIds.add(s.id);
    const isActive = s.id === state.activeSessionId;
    const isGen = Boolean(
      s.isGenerating ||
      (isActive && (state.activeSession?.isGenerating || (state.isAwaitingResponse && (!state.awaitingSessionId || state.awaitingSessionId === s.id))))
    );
    if (isGen) running++;
    const msgCount = isActive && state.activeSession?.messages ? state.activeSession.messages.length : (s.messageCount || 0);
    totalMessages += msgCount;
    const artCount = isActive && state.activeSession?.artifacts ? state.activeSession.artifacts.length : (s.artifacts?.length || 0);
    totalArtifacts += artCount;
  }

  if (state.activeSession && !seenIds.has(state.activeSession.id)) {
    const isGen = Boolean(state.activeSession.isGenerating || state.isAwaitingResponse);
    if (isGen) running++;
    totalMessages += state.activeSession.messages?.length || 0;
    totalArtifacts += state.activeSession.artifacts?.length || 0;
  }

  const sessionCount = state.activeSession && !seenIds.has(state.activeSession.id)
    ? state.sessions.length + 1
    : state.sessions.length;

  return `
    <div class="monitor-stats-widget" role="region" aria-label="Dashboard Metrics">
      <div class="monitor-stats-grid">
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">
            <span class="pulse-indicator ${running > 0 ? 'live' : ''}"></span>
            Running
          </div>
          <div class="monitor-stat-val running-num">${running}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Sessions</div>
          <div class="monitor-stat-val">${sessionCount}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Messages</div>
          <div class="monitor-stat-val">${totalMessages}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Artifacts</div>
          <div class="monitor-stat-val">${totalArtifacts}</div>
        </div>
      </div>
    </div>
  `;
}

