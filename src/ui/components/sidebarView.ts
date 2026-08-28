import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { renderSessionDetailView } from './sessionDetailView';
import { isPlanFilePath } from '../../utils/planExtractor';
import { renderConnectionNotice } from './connectionNotice';
import { renderMonitorSidebarStats } from './sidebarStatsCard';
import { renderSidebarAutoUpdate } from './sidebarAutoUpdate';

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

export function renderSidebarView(state: AppState): string {
  const q = state.searchQuery.toLowerCase().trim();
  const filtered = state.sessions.filter((s) => {
    if (!q) return true;
    if (s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)) return true;
    if (s.plans?.some((p) => p.name.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))) return true;
    if (s.artifacts?.some((a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q))) return true;
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
          <button type="button" class="btn btn-secondary sidebar-qr-btn" id="btn-sidebar-qr" title="Pair Phone via QR Code">
            <span class="btn-icon">📱</span>
            <span>Pair Phone</span>
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
      ${renderSidebarAutoUpdate(state)}

      <div class="section-divider">
        <span>${q ? `FOUND (${filtered.length})` : `RECENT SESSIONS (${displaySessions.length})`}</span>
      </div>

      <div class="session-list">
        ${
          displaySessions.length === 0
            ? (state.isLoadingSessions
                ? `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading sessions...</div></div>`
                : `<div class="empty-state">No matching sessions, plans, or artifacts</div>`)
            : displaySessions
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
                .join('')
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
