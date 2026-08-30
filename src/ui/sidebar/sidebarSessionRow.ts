import { escapeHtml, ICONS } from './sidebarDom';
import type { SidebarSessionSummary } from './types';

export function formatRelativeTime(updatedAt: number, now = Date.now()): string {
  if (!updatedAt || updatedAt <= 0) return '';
  const elapsed = Math.max(0, now - updatedAt);
  const minMs = 60_000;
  const hourMs = 60 * minMs;
  const dayMs = 24 * hourMs;
  if (elapsed < hourMs) {
    return `${Math.max(1, Math.round(elapsed / minMs))}m`;
  }
  if (elapsed < dayMs) {
    return `${Math.max(1, Math.round(elapsed / hourMs))}h`;
  }
  return `${Math.max(1, Math.round(elapsed / dayMs))}d`;
}

function renderStatusIcon(session: SidebarSessionSummary): string {
  if (session.isRunning) {
    return '<span class="session-status session-spinner" aria-label="Running"></span>';
  }
  if (session.hasError) {
    return `<span class="session-status session-status--error" aria-label="Error">${ICONS.errorCircle}</span>`;
  }
  if (session.mode === 'plan') {
    return `<span class="session-status session-status--plan" aria-label="Plan">${ICONS.branch}</span>`;
  }
  return `<span class="session-status session-status--agent" aria-label="Completed">${ICONS.checkCircle}</span>`;
}

function renderPlanChips(plans: Array<{ path: string; title?: string; name?: string }>): string {
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

export function renderSessionRow(session: SidebarSessionSummary): string {
  const time = session.isRunning ? 'running' : formatRelativeTime(session.updatedAt);
  const pinTitle = session.isPinned ? 'Unpin' : 'Pin';
  const pinIcon = session.isPinned ? ICONS.pinFilled : ICONS.pin;
  const subtitleHtml = session.preview
    ? `<div class="session-subtitle">${escapeHtml(session.preview)}</div>`
    : '';
  const plansHtml = session.plans ? renderPlanChips(session.plans) : '';
  const badgeHtml = session.messageCount ? `<span class="session-badge ${session.isRunning ? 'session-badge--running' : ''}">${session.messageCount} msgs</span>` : '';

  const actionButtonHtml = session.isRunning
    ? `<button class="stop-session-btn icon-button session-row-action" data-stop-id="${session.id}" title="Stop" aria-label="Stop Session">${ICONS.stopCircle}</button>`
    : `<button class="delete-session-btn icon-button session-row-action" data-delete-id="${session.id}" title="Archive" aria-label="Archive Session">${ICONS.archive}</button>`;

  return `
    <div class="session-item ${session.isCurrent ? 'active' : ''} ${session.isPinned ? 'is-pinned' : ''}"
         data-session-id="${session.id}"
         data-title="${escapeHtml(session.title)}"
         data-running="${session.isRunning ? 'true' : 'false'}"
         data-error="${session.hasError ? 'true' : 'false'}"
         data-mode="${escapeHtml(session.mode || 'agent')}"
         data-updated-at="${session.updatedAt || ''}">
      ${renderStatusIcon(session)}
      <div class="session-info">
        <div class="session-title">
          <span>${escapeHtml(session.title)}</span>
          ${badgeHtml}
        </div>
        ${subtitleHtml}
        ${plansHtml}
      </div>
      <div class="session-actions">
        <button class="pin-session-btn icon-button session-row-action ${session.isPinned ? 'pinned' : ''}" data-pin-id="${session.id}" title="${pinTitle}" aria-label="${pinTitle}">${pinIcon}</button>
        ${actionButtonHtml}
      </div>
      <span class="session-time ${session.isRunning ? 'running-time' : ''}">${escapeHtml(time)}</span>
    </div>
  `;
}
