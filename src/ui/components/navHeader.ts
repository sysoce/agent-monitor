import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { CLIENT_VERSION } from '../version';

export function renderNavHeader(state: AppState): string {
  const isGit = state.syncMode === 'git-backup';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing';
  const host = state.hostPresence;
  const isHostOnline = isGit && host ? Date.now() - host.lastActiveAt < 90_000 : false;

  const statusColor = isGit ? (isHostOnline ? '#4ec9b0' : '#c586c0') : isConnected ? '#4ec9b0' : isSyncing ? '#cca700' : '#f14c4c';
  const statusLabel = isGit ? (isHostOnline ? 'Git Backup (Host Online)' : 'Git Backup') : isConnected ? 'Live' : isSyncing ? 'Syncing' : 'Offline';
  const statusClass = isGit ? 'status-git-backup' : isConnected ? 'status-live' : isSyncing ? 'status-syncing' : 'status-offline';

  const sessionTitle = state.activeSession?.title?.trim();
  const sessionId = state.activeSession?.id || state.activeSessionId;
  const chatTabLabel = sessionTitle && sessionId
    ? `${sessionTitle} (${sessionId})`
    : (sessionTitle || sessionId || 'Chat');
  const chatMsgCount = state.activeSession ? state.activeSession.messages.length : 0;

  return `
    <header class="app-header">
      <div class="header-top">
        <div class="brand">
          <span class="brand-icon">⚡</span>
          <span class="brand-name">Agent Monitor</span>
          <span class="brand-version">v${escapeHtml(CLIENT_VERSION)}</span>
        </div>
        <div class="header-actions">
          <button type="button" id="btn-show-qr" class="btn-qr-pill" title="Pair mobile phone via QR code">
            <span class="btn-qr-icon">📱</span>
            <span class="btn-qr-text">Connect Phone</span>
          </button>
          <button type="button" id="btn-toggle-sync" class="status-pill ${statusClass}" title="Click to toggle Live SSE / Git Backup mode">
            <span class="status-dot" style="background-color: ${statusColor}"></span>
            <span class="status-text">${statusLabel}</span>
          </button>
          ${
            state.isAuthenticated
              ? `<button type="button" id="btn-logout" class="btn-logout" title="Lock session">🔒</button>`
              : ''
          }
        </div>
      </div>
      <nav class="header-tabs" role="tablist">
        <button
          type="button"
          data-tab="sidebar"
          class="tab-btn ${state.activeTab === 'sidebar' ? 'active' : ''}"
          role="tab"
          aria-selected="${state.activeTab === 'sidebar'}"
        >
          <span>Sessions</span>
          <span class="tab-badge">${state.sessions.length}</span>
        </button>
        <button
          type="button"
          data-tab="chat"
          class="tab-btn tab-btn--chat ${state.activeTab === 'chat' ? 'active' : ''}"
          role="tab"
          aria-selected="${state.activeTab === 'chat'}"
        >
          <span class="tab-title-text" title="${escapeHtml(chatTabLabel)}">${escapeHtml(chatTabLabel)}</span>
          ${chatMsgCount > 0 ? `<span class="tab-badge">${chatMsgCount}</span>` : ''}
        </button>
      </nav>
    </header>
  `;
}
