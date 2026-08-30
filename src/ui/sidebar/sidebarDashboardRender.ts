import { escapeHtml } from './sidebarDom';
import type { AppState } from '../types';
import type { SidebarArtifact, SidebarSessionSummary } from './types';
import { isSessionRunningInState } from '../sessionSorting';
import { groupSessionsByRecency, partitionSessionsByFilter } from './sidebarSessionGroups';
import { renderSessionRow } from './sidebarSessionRow';
import { renderDashboardArtifactsSection } from './sidebarArtifactsRender';

export function toSidebarSummaries(state: AppState): SidebarSessionSummary[] {
  const pinnedSet = new Set(state.pinnedSessionIds || []);
  const list = [...state.sessions];
  const seenIds = new Set(list.map((s) => s.id));

  if (state.activeSession && !seenIds.has(state.activeSession.id)) {
    list.unshift({
      id: state.activeSession.id,
      title: state.activeSession.title || state.activeSession.id,
      createdAt: state.activeSession.createdAt || 0,
      updatedAt: state.activeSession.updatedAt || state.activeSession.createdAt || 0,
      messageCount: state.activeSession.messages?.length || 0,
      preview: state.activeSession.messages?.[0]?.content?.slice(0, 80) || '(empty session)',
      isGenerating: state.activeSession.isGenerating,
      plans: state.activeSession.plans,
      artifacts: state.activeSession.artifacts,
    });
  }

  return list.map((s) => {
    const isRunning = isSessionRunningInState(s, state);
    const isPinned = Boolean(s.isPinned || pinnedSet.has(s.id));
    const isCurrent = s.id === state.activeSessionId;
    return {
      id: s.id,
      title: s.title || s.id,
      mode: (s.mode as any) || 'agent',
      model: s.model || '',
      messageCount: s.id === state.activeSessionId && state.activeSession?.messages ? state.activeSession.messages.length : (s.messageCount || 0),
      updatedAt: s.id === state.activeSessionId && state.activeSession?.updatedAt ? Math.max(s.updatedAt || 0, state.activeSession.updatedAt) : (s.updatedAt || s.createdAt || 0),
      isCurrent,
      isRunning,
      isPinned,
      hasError: false,
      preview: s.preview || '',
      plans: s.plans?.map((p: any) => ({ name: p.name, title: p.title, path: p.path })),
      artifacts: s.artifacts?.map((a: any) => ({ name: a.name, path: a.path, type: a.type })),
      searchText: `${s.title || ''} ${s.preview || ''} ${s.plans?.map((p: any) => p.title || p.name).join(' ') || ''} ${s.artifacts?.map((a: any) => a.name || a.path).join(' ') || ''}`.toLowerCase(),
    };
  });
}

function renderGroup(label: string, rows: string[]): string {
  if (rows.length === 0) return '';
  return `<div class="session-group"><div class="session-group-label">${escapeHtml(label)}</div>${rows.join('')}</div>`;
}

function collectArtifacts(state: AppState): SidebarArtifact[] {
  const artifacts: SidebarArtifact[] = [];
  const seen = new Set<string>();
  const add = (name: string, path: string, type?: any) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    artifacts.push({ name: name || path, path, type });
  };
  if (state.activeSession?.artifacts) {
    for (const a of state.activeSession.artifacts) add(a.name, a.path, a.type);
  }
  for (const s of state.sessions) {
    if (s.artifacts) {
      for (const a of s.artifacts) add(a.name, a.path, a.type);
    }
  }
  return artifacts;
}

export function renderDashboardResults(state: AppState): string {
  const tab = state.activeFilterTab || 'all';
  const q = state.searchQuery.toLowerCase().trim();

  if (tab === 'artifacts') {
    return renderDashboardArtifactsSection(collectArtifacts(state), state.searchQuery);
  }

  const summaries = toSidebarSummaries(state);
  const filtered = summaries.filter((s) => !q || s.searchText?.includes(q));

  if (filtered.length === 0) {
    return state.isLoadingSessions
      ? `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading sessions...</div></div>`
      : `<div class="empty-state">No matching sessions, plans, or artifacts</div>`;
  }

  if (q) {
    const groups = groupSessionsByRecency(filtered);
    return groups.map((g) => renderGroup(g.label, g.sessions.map(renderSessionRow))).join('');
  }

  const { running, pinned, recent } = partitionSessionsByFilter(filtered, tab);
  const out: string[] = [];

  if (tab === 'all') {
    if (running.length > 0) out.push(renderGroup('Running', running.map(renderSessionRow)));
    if (pinned.length > 0) out.push(renderGroup('Pinned', pinned.map(renderSessionRow)));
    const recencyGroups = groupSessionsByRecency(recent);
    for (const g of recencyGroups) out.push(renderGroup(g.label, g.sessions.map(renderSessionRow)));
  } else if (tab === 'running') {
    out.push(renderGroup('Running Sessions', running.map(renderSessionRow)));
  } else if (tab === 'pinned') {
    out.push(renderGroup('Pinned Sessions', pinned.map(renderSessionRow)));
  }

  return out.filter(Boolean).join('') || `<div class="empty-state">No sessions in this view</div>`;
}
