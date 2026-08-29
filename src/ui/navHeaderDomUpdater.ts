import type { AppState } from './types';
import { renderNavHeader } from './components/navHeader';

export function updateNavHeaderDOM(state: AppState, container: HTMLElement): void {
  const headerEl = container.querySelector<HTMLElement>('.app-header');
  if (!headerEl) {
    const nextHtml = renderNavHeader(state);
    container.innerHTML = nextHtml;
    if (container.dataset) container.dataset.renderedHtml = nextHtml;
    return;
  }

  const isGit = state.syncMode === 'git-backup';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing';
  const host = state.hostPresence;
  const isHostOnline = isGit && host ? Date.now() - host.lastActiveAt < 90_000 : false;

  const statusColor = isGit ? (isHostOnline ? '#4ec9b0' : '#c586c0') : isConnected ? '#4ec9b0' : isSyncing ? '#cca700' : '#f14c4c';
  const statusLabel = isGit ? (isHostOnline ? 'P2P / Gist (Online)' : 'P2P / Gist') : isConnected ? 'Live SSE' : isSyncing ? 'Syncing' : 'Offline';
  const statusClass = isGit ? 'status-git-backup' : isConnected ? 'status-live' : isSyncing ? 'status-syncing' : 'status-offline';

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
