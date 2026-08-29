import type { AppState } from './types';
import { renderSidebarView } from './components/sidebarView';
import { renderMonitorSidebarStats } from './components/sidebarStatsCard';
import { renderSessionDetailView } from './components/sessionDetailView';
import { escapeHtml } from './components/markdown';

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function renderCardPlans(plans: Array<{ path: string; title?: string; name?: string }>): string {
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

function renderSessionListHtml(state: AppState): string {
  const q = state.searchQuery.toLowerCase().trim();
  const filtered = state.sessions.filter((s) => {
    if (!q) return true;
    if (s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)) return true;
    if (s.plans?.some((p) => p.name.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))) return true;
    if (s.artifacts?.some((a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q))) return true;
    return false;
  });
  const displaySessions = q ? filtered : filtered.slice(0, 8);

  if (displaySessions.length === 0) {
    return state.isLoadingSessions
      ? `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading sessions...</div></div>`
      : `<div class="empty-state">No matching sessions, plans, or artifacts</div>`;
  }

  return displaySessions
    .map(
      (s) => `
      <div
        class="session-card ${s.id === state.activeSessionId ? 'active' : ''}"
        data-session-id="${s.id}"
      >
        <div class="session-card-header">
          <span class="session-card-title">${escapeHtml(s.title)}</span>
          <span class="session-card-time">${formatRelativeTime(s.updatedAt)}</span>
        </div>
        <div class="session-card-preview">${escapeHtml(s.preview || 'No messages yet')}</div>
        ${renderCardPlans(s.plans || [])}
        <div class="session-card-footer">
          <span class="session-badge">${s.messageCount} msgs</span>
          <span class="session-card-id">${s.id}</span>
        </div>
      </div>
    `
    )
    .join('');
}

export function updateSidebarDOM(state: AppState, container: HTMLElement): void {
  const sidebarEl = container.querySelector<HTMLElement>('.sidebar-view');
  if (!sidebarEl) {
    const nextHtml = renderSidebarView(state);
    container.innerHTML = nextHtml;
    if (container.dataset) container.dataset.renderedHtml = nextHtml;
    return;
  }

  const searchInput = sidebarEl.querySelector<HTMLInputElement>('#session-search');
  if (searchInput && typeof document !== 'undefined' && document.activeElement !== searchInput) {
    if (searchInput.value !== state.searchQuery) {
      searchInput.value = state.searchQuery;
    }
  }

  const searchBar = sidebarEl.querySelector<HTMLElement>('.search-bar');
  const clearBtn = sidebarEl.querySelector<HTMLElement>('#btn-clear-search');
  if (searchBar) {
    if (state.searchQuery && !clearBtn) {
      if (typeof searchBar.insertAdjacentHTML === 'function') {
        searchBar.insertAdjacentHTML('beforeend', '<button type="button" id="btn-clear-search" class="clear-btn">✕</button>');
      }
    } else if (!state.searchQuery && clearBtn) {
      clearBtn.remove();
    }
  }

  const statsEl = sidebarEl.querySelector<HTMLElement>('.monitor-stats-container');
  const nextStatsHtml = renderMonitorSidebarStats(state);
  if (statsEl) {
    if (statsEl.dataset.renderedHtml !== nextStatsHtml) {
      statsEl.outerHTML = nextStatsHtml;
    }
  }

  const listEl = sidebarEl.querySelector<HTMLElement>('.session-list');
  if (listEl) {
    const nextListHtml = renderSessionListHtml(state);
    if (listEl.dataset.renderedHtml !== nextListHtml) {
      listEl.innerHTML = nextListHtml;
      listEl.dataset.renderedHtml = nextListHtml;
    }
  }

  const detailEl = sidebarEl.querySelector<HTMLElement>('.session-detail-view');
  if (state.activeSession) {
    const nextDetailHtml = renderSessionDetailView(state.activeSession, state.expandedSections, state.showAllItems);
    if (detailEl) {
      if (detailEl.dataset.renderedHtml !== nextDetailHtml) {
        detailEl.outerHTML = nextDetailHtml;
      }
    }
  } else if (detailEl) {
    detailEl.remove();
  }

  if (container.dataset) container.dataset.renderedHtml = renderSidebarView(state);
}
