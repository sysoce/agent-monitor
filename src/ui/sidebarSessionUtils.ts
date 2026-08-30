import type { AppState, SessionSummary } from './types';
import { escapeHtml } from './components/markdown';
import { sortSessions, isSessionRunningInState } from './sessionSorting';

export function formatRelativeTime(ts: number): string {
  if (!ts || ts <= 0) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function renderCardPlans(plans: Array<{ path: string; title?: string; name?: string }>): string {
  if (!plans || plans.length === 0) return '';
  return `
    <div class="session-card-plans">
      ${plans
        .map(
          (p) => `
        <button type="button" class="session-plan-chip md-plan-link" data-plan-path="${escapeHtml(p.path)}">
          <span class="plan-chip-icon">📋</span>
          <span class="plan-chip-title">${escapeHtml(p.title || p.name || 'Plan')}</span>
        </button>
      `
        )
        .join('')}
    </div>
  `;
}

export function getSortedSessions(state: AppState): SessionSummary[] {
  const list = [...state.sessions];
  if (state.activeSession && !list.some((s) => s.id === state.activeSession!.id)) {
    list.unshift({
      id: state.activeSession.id,
      title: state.activeSession.title || state.activeSession.id,
      createdAt: state.activeSession.createdAt || 0,
      updatedAt: state.activeSession.updatedAt || state.activeSession.createdAt || 0,
      messageCount: state.activeSession.messages?.length || 0,
      preview: state.activeSession.messages?.[0]?.content?.slice(0, 80) || '(empty session)',
      isGenerating: state.activeSession.isGenerating,
      plans: state.activeSession.plans?.map((p) => ({ name: p.name, title: p.title, path: p.path })),
      artifacts: state.activeSession.artifacts?.map((a) => ({ name: a.name, path: a.path, type: a.type })),
    });
  }
  return sortSessions(list, state);
}

export function renderSessionCard(s: SessionSummary, state: AppState): string {
  const isGenerating = isSessionRunningInState(s, state);
  const msgCount = s.id === state.activeSessionId && state.activeSession?.messages ? state.activeSession.messages.length : (s.messageCount || 0);
  const updatedTs = s.id === state.activeSessionId && state.activeSession?.updatedAt ? Math.max(s.updatedAt || 0, state.activeSession.updatedAt) : (s.updatedAt || s.createdAt || 0);
  const timeStr = isGenerating ? 'running' : formatRelativeTime(updatedTs);

  return `
    <div
      class="session-card ${s.id === state.activeSessionId ? 'active' : ''} ${isGenerating ? 'running' : ''}"
      data-session-id="${s.id}"
    >
      <div class="session-card-header">
        <span class="session-card-title">${isGenerating ? '<span class="pulse-indicator live" style="display:inline-block;margin-right:6px;vertical-align:middle;"></span>' : ''}${escapeHtml(s.title)}</span>
        <span class="session-card-time ${isGenerating ? 'running-time' : ''}">${timeStr}</span>
      </div>
      <div class="session-card-preview">${escapeHtml(s.preview || 'No messages yet')}</div>
      ${renderCardPlans(s.plans || [])}
      <div class="session-card-footer">
        <span class="session-badge ${isGenerating ? 'session-badge--running' : ''}">${msgCount} msgs</span>
        <span class="session-card-id">${s.id}</span>
      </div>
    </div>
  `;
}

import { renderDashboardResults } from './sidebar/sidebarDashboardRender';

export function renderSessionListHtml(state: AppState): string {
  return renderDashboardResults(state);
}
