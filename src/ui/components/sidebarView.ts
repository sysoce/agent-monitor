import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { renderSessionDetailView } from './sessionDetailView';
import { renderConnectionNotice } from './connectionNotice';
import { renderMonitorSidebarStats } from './sidebarStatsCard';
import { getSortedSessions, renderSessionCard } from '../sidebarSessionUtils';

export { getSortedSessions, renderSessionCard };

export function renderSidebarView(state: AppState): string {
  const q = state.searchQuery.toLowerCase().trim();
  const sorted = getSortedSessions(state);
  const filtered = sorted.filter((s) => {
    if (!q) return true;
    if (s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)) return true;
    if (s.plans?.some((p: { name?: string; title?: string }) => p.name?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))) return true;
    if (s.artifacts?.some((a: { name?: string; path?: string }) => a.name?.toLowerCase().includes(q) || a.path?.toLowerCase().includes(q))) return true;
    return false;
  });
  const displaySessions = q ? filtered : filtered.slice(0, 8);
  const active = state.activeSession;

  return `
    <div class="sidebar-view">
      ${renderConnectionNotice(state)}
      <div class="sidebar-actions">
        <div class="sidebar-actions-row">
          <button type="button" class="btn btn-primary new-session-btn" id="btn-new-session">
            <span class="btn-icon">+</span>
            <span>New Session</span>
          </button>
        </div>
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="session-search"
            class="search-input"
            placeholder="Search sessions, plans & artifacts..."
            value="${escapeHtml(state.searchQuery)}"
          />
          ${state.searchQuery ? '<button type="button" id="btn-clear-search" class="clear-btn">✕</button>' : ''}
        </div>
      </div>

      ${renderMonitorSidebarStats(state)}

      <div class="section-divider">
        <span>${q ? `FOUND (${filtered.length})` : `RECENT SESSIONS (${displaySessions.length})`}</span>
      </div>

      <div class="session-list">
        ${
          displaySessions.length === 0
            ? (state.isLoadingSessions
                ? `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading sessions...</div></div>`
                : `<div class="empty-state">No matching sessions, plans, or artifacts</div>`)
            : displaySessions.map((s) => renderSessionCard(s, state)).join('')
        }
      </div>

      ${
        active
          ? `
        <div class="section-divider">
          <span>ACTIVE SESSION DETAILS</span>
        </div>
        ${renderSessionDetailView(active, state.expandedSections, state.showAllItems)}
      `
          : ''
      }
    </div>
  `;
}
