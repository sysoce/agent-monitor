import type { AppState } from './types';
import { renderNavHeader, getNavHeaderStatus, getConnectionEndpointInfo } from './components/navHeader';
import { escapeHtml } from './components/markdown';

export function updateNavHeaderDOM(state: AppState, container: HTMLElement): void {
  const headerEl = container.querySelector<HTMLElement>('.app-header');
  if (!headerEl) {
    const nextHtml = renderNavHeader(state);
    container.innerHTML = nextHtml;
    if (container.dataset) container.dataset.renderedHtml = nextHtml;
    return;
  }

  const { statusColor, statusLabel, statusClass } = getNavHeaderStatus(state);
  const endpoint = getConnectionEndpointInfo(state);

  const endpointEl = headerEl.querySelector<HTMLElement>('#indicator-connection-endpoint');
  if (endpointEl) {
    if (!endpoint.displayText) {
      if (typeof endpointEl.remove === 'function') endpointEl.remove();
    } else {
      const expectedClass = `connection-indicator-pill ${endpoint.isTailscale ? 'pill-tailscale' : 'pill-lan'}`;
      if (endpointEl.className !== expectedClass) endpointEl.className = expectedClass;
      const ipText = endpointEl.querySelector<HTMLElement>('.connection-ip-text');
      if (ipText && ipText.textContent !== endpoint.ip) ipText.textContent = endpoint.ip;
      const typeTag = endpointEl.querySelector<HTMLElement>('.connection-type-tag');
      const expectedTag = `(${endpoint.connectionType})`;
      if (typeTag && typeTag.textContent !== expectedTag) typeTag.textContent = expectedTag;
    }
  } else if (endpoint.displayText) {
    const actionsEl = headerEl.querySelector<HTMLElement>('.header-actions');
    if (actionsEl && typeof actionsEl.insertAdjacentHTML === 'function') {
      actionsEl.insertAdjacentHTML('afterbegin', `
        <span class="connection-indicator-pill ${endpoint.isTailscale ? 'pill-tailscale' : 'pill-lan'}" id="indicator-connection-endpoint" title="Connection: ${escapeHtml(endpoint.fullUrl || endpoint.ip)}">
          <span class="connection-type-icon">${endpoint.isTailscale ? '🔒' : '🏠'}</span>
          <span class="connection-ip-text">${escapeHtml(endpoint.ip)}</span>
          <span class="connection-type-tag">(${escapeHtml(endpoint.connectionType)})</span>
        </span>
      `);
    }
  }

  const syncBtn = headerEl.querySelector<HTMLElement>('#btn-toggle-sync');
  if (syncBtn) {
    const expectedClass = `status-pill ${statusClass}`;
    if (syncBtn.className !== expectedClass) syncBtn.className = expectedClass;

    const dot = syncBtn.querySelector<HTMLElement>('.status-dot');
    if (dot && dot.style.backgroundColor !== statusColor) dot.style.backgroundColor = statusColor;

    const text = syncBtn.querySelector<HTMLElement>('.status-text');
    if (text && text.textContent !== statusLabel) text.textContent = statusLabel;
  }

  const sessionTitle = state.activeSession?.title?.trim();
  const sessionId = state.activeSession?.id || state.activeSessionId;
  const chatTabLabel = sessionTitle && sessionId
    ? `${sessionTitle} (${sessionId})`
    : (sessionTitle || sessionId || 'Chat');
  const chatMsgCount = state.activeSession ? state.activeSession.messages.length : 0;

  const sidebarBtn = headerEl.querySelector<HTMLElement>('button[data-tab="sidebar"]');
  if (sidebarBtn) {
    sidebarBtn.classList.toggle('active', state.activeTab === 'sidebar');
    sidebarBtn.setAttribute('aria-selected', state.activeTab === 'sidebar' ? 'true' : 'false');
    const badge = sidebarBtn.querySelector<HTMLElement>('.tab-badge');
    const expectedCount = String(state.sessions.length);
    if (badge && badge.textContent !== expectedCount) badge.textContent = expectedCount;
  }

  const chatBtn = headerEl.querySelector<HTMLElement>('button[data-tab="chat"]');
  if (chatBtn) {
    chatBtn.classList.toggle('active', state.activeTab === 'chat');
    chatBtn.setAttribute('aria-selected', state.activeTab === 'chat' ? 'true' : 'false');

    const labelSpan = chatBtn.firstElementChild as HTMLElement | null;
    if (labelSpan && labelSpan.textContent !== chatTabLabel) labelSpan.textContent = chatTabLabel;

    const chatBadge = chatBtn.querySelector<HTMLElement>('.tab-badge');
    if (chatMsgCount > 0) {
      const expectedMsgCount = String(chatMsgCount);
      if (chatBadge) {
        if (chatBadge.textContent !== expectedMsgCount) chatBadge.textContent = expectedMsgCount;
      } else if (typeof chatBtn.insertAdjacentHTML === 'function') {
        chatBtn.insertAdjacentHTML('beforeend', `<span class="tab-badge">${chatMsgCount}</span>`);
      }
    } else if (chatBadge && typeof chatBadge.remove === 'function') {
      chatBadge.remove();
    }
  }

  if (container.dataset) container.dataset.renderedHtml = renderNavHeader(state);
}
