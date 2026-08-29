import type { AppState, QueuedMessage } from '../types';
import { getQueuedMessagesForSession } from '../queuedMessagesStore';
import { escapeHtml } from './markdown';

const SEND_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const EDIT_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>';
const DELETE_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h10M5 4V2h6v2M6 7v5M10 7v5M4 4l1 10h6l1-10"/></svg>';

function renderQueuedItem(msg: QueuedMessage): string {
  return `
    <div class="queued-message-item" data-id="${escapeHtml(msg.id)}">
      <span class="queued-message-text" title="${escapeHtml(msg.text)}">${escapeHtml(msg.text)}</span>
      <div class="queued-message-actions">
        <button type="button" class="queued-action-btn queued-action-send" data-action="queued-send-now" data-id="${escapeHtml(msg.id)}" title="Send Now" aria-label="Send now">
          ${SEND_ICON}
        </button>
        <button type="button" class="queued-action-btn queued-action-edit" data-action="queued-edit" data-id="${escapeHtml(msg.id)}" title="Edit" aria-label="Edit queued message">
          ${EDIT_ICON}
        </button>
        <button type="button" class="queued-action-btn queued-action-delete" data-action="queued-delete" data-id="${escapeHtml(msg.id)}" title="Delete" aria-label="Delete queued message">
          ${DELETE_ICON}
        </button>
      </div>
    </div>
  `.trim();
}

export function renderQueuedMessagesCard(state: AppState): string {
  const queued = getQueuedMessagesForSession(state, state.activeSessionId);
  if (queued.length === 0) return '';

  const isCollapsed = Boolean(state.isQueuedMessagesCollapsed);

  return `
    <div class="queued-messages" id="queued-messages-container">
      <div class="queued-messages-header" id="queued-messages-header">
        <div class="queued-messages-header-left">
          <span class="queued-messages-title">Queued Messages</span>
          <span class="queued-messages-badge" id="queued-messages-badge">${queued.length}</span>
          <span class="queued-messages-subtitle">Sends after agent finishes working</span>
        </div>
        <button type="button" class="queued-messages-toggle ${isCollapsed ? 'collapsed' : ''}" id="btn-queued-toggle" title="Toggle queued messages" aria-label="Toggle queued messages" aria-expanded="${isCollapsed ? 'false' : 'true'}">
          <svg class="queued-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </button>
      </div>
      <div class="queued-messages-list ${isCollapsed ? 'hidden' : ''}" id="queued-messages-list">
        ${queued.map((m) => renderQueuedItem(m)).join('')}
      </div>
    </div>
  `.trim();
}
