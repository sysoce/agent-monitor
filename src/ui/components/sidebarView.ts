import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { renderSessionDetailView } from './sessionDetailView';
import { renderConnectionNotice } from './connectionNotice';
import { renderMonitorSidebarStats } from './sidebarStatsCard';
import { renderDashboardResults } from '../sidebar/sidebarDashboardRender';
import { getSortedSessions, renderSessionCard } from '../sidebarSessionUtils';

export { getSortedSessions, renderSessionCard };

export function renderSidebarView(state: AppState): string {
  const active = state.activeSession;

  return `
    <div class="sidebar-view">
      ${renderConnectionNotice(state)}
      <div class="sidebar-actions">
        <div class="sidebar-actions-row">
          <button type="button" class="btn btn-primary new-session-btn" id="btn-new-session" title="Start New Session">
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
            aria-label="Search sessions"
          />
          ${state.searchQuery ? '<button type="button" id="btn-clear-search" class="clear-btn" aria-label="Clear Search">✕</button>' : ''}
        </div>
      </div>

      ${renderMonitorSidebarStats(state)}

      <div class="session-list">
        ${renderDashboardResults(state)}
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
