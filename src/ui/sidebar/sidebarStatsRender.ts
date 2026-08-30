import { escapeHtml, ICONS } from './sidebarDom';
import type { AppState } from '../types';
import type { SidebarArtifact, SidebarDashboardStats, SidebarFilterTab } from './types';
import { isSessionRunningInState } from '../sessionSorting';

export function calculateDashboardStats(
  stateOrSessions: AppState | { sessions?: any[]; activeSession?: any; pinnedSessionIds?: string[] },
  extraArtifacts: SidebarArtifact[] = []
): SidebarDashboardStats {
  const isState = 'sessions' in stateOrSessions && Array.isArray(stateOrSessions.sessions);
  const state = isState ? (stateOrSessions as AppState) : undefined;
  const sessions = isState ? (stateOrSessions as AppState).sessions : (Array.isArray(stateOrSessions) ? stateOrSessions : []);
  const pinnedSet = new Set(state?.pinnedSessionIds || []);
  const seenIds = new Set<string>();

  let runningCount = 0;
  let pinnedCount = 0;
  let totalMessages = 0;
  let artifactsCount = extraArtifacts.length;

  for (const s of sessions) {
    seenIds.add(s.id);
    const isRun = isSessionRunningInState(s, state);
    const isPin = s.isPinned || pinnedSet.has(s.id);
    if (isRun) runningCount++;
    if (isPin) pinnedCount++;
    const isAct = s.id === state?.activeSessionId;
    const msgCount = isAct && state?.activeSession?.messages ? state.activeSession.messages.length : (s.messageCount || 0);
    totalMessages += msgCount;
    const artCount = isAct && state?.activeSession?.artifacts ? state.activeSession.artifacts.length : (s.artifacts?.length || 0);
    artifactsCount += artCount;
  }

  if (state?.activeSession && !seenIds.has(state.activeSession.id)) {
    if (state.activeSession.isGenerating || state.isAwaitingResponse) runningCount++;
    if (pinnedSet.has(state.activeSession.id)) pinnedCount++;
    totalMessages += state.activeSession.messages?.length || 0;
    artifactsCount += state.activeSession.artifacts?.length || 0;
  }

  const totalSessions = state?.activeSession && !seenIds.has(state.activeSession.id)
    ? sessions.length + 1
    : sessions.length;

  return { runningCount, pinnedCount, totalSessions, totalMessages, artifactsCount };
}

export function renderSidebarStats(
  stats: SidebarDashboardStats,
  activeFilter: SidebarFilterTab = 'all'
): string {
  const cards: Array<{
    id: SidebarFilterTab;
    label: string;
    count: number;
    iconSvg: string;
    typeClass: string;
  }> = [
    { id: 'all', label: 'All', count: stats.totalSessions, iconSvg: ICONS.chat, typeClass: 'type-all' },
    { id: 'running', label: 'Running', count: stats.runningCount, iconSvg: ICONS.taskSpinner, typeClass: 'type-running' },
    { id: 'pinned', label: 'Pinned', count: stats.pinnedCount, iconSvg: ICONS.pin, typeClass: 'type-pinned' },
    { id: 'artifacts', label: 'Artifacts', count: stats.artifactsCount, iconSvg: ICONS.artifactFile, typeClass: 'type-artifacts' },
  ];

  return `
    <div class="sidebar-stats-widget" role="tablist" aria-label="Session Filter">
      <div class="stats-grid">
        ${cards
          .map((c) => {
            const isActive = activeFilter === c.id;
            const hasCount = c.count > 0;
            const cardTypeClass = hasCount ? ` ${c.typeClass} has-items` : ' zero-count';
            return `
          <button type="button" role="tab" class="stat-card${isActive ? ' active' : ''}${cardTypeClass}" data-filter-tab="${c.id}" aria-selected="${isActive}" title="${escapeHtml(c.label)} (${c.count})">
            <span class="stat-icon-inset"><span class="stat-icon">${c.iconSvg}</span></span>
            <span class="stat-label">${escapeHtml(c.label)}</span>
            <span class="stat-value">${c.count}</span>
          </button>`;
          })
          .join('')}
      </div>
    </div>
  `;
}
