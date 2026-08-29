import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { CLIENT_VERSION } from '../version';
import { getConnectionEndpointInfo } from './connectionEndpointInfo';

export { getConnectionEndpointInfo };

export function getNavHeaderStatus(state: AppState): { statusColor: string; statusLabel: string; statusClass: string } {
  const isP2P = state.syncMode === 'p2p';
  const isGit = state.syncMode === 'git-backup';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing' || state.syncStatus === 'connecting';
  const host = state.hostPresence;
  const isHostOnline = host ? Date.now() - host.lastActiveAt < 90_000 : false;

  if (isP2P) {
    const statusClass = 'status-p2p';
    const statusColor = isConnected ? '#4ec9b0' : isSyncing ? '#cca700' : '#f14c4c';
    const statusLabel = isConnected ? 'P2P (Online)' : isSyncing ? 'P2P (Connecting)' : 'P2P (Offline)';
    return { statusColor, statusLabel, statusClass };
  }

  if (isGit) {
    const statusClass = 'status-git-backup';
    const statusColor = isConnected ? (isHostOnline ? '#4ec9b0' : '#c586c0') : isSyncing ? '#cca700' : '#f14c4c';
    const statusLabel = isConnected ? (isHostOnline ? 'Gist Sync (Online)' : 'Gist Sync') : isSyncing ? 'Gist Syncing' : 'Gist Offline';
    return { statusColor, statusLabel, statusClass };
  }

  const statusClass = isConnected ? 'status-live' : isSyncing ? 'status-syncing' : 'status-offline';
  const statusColor = isConnected ? '#4ec9b0' : isSyncing ? '#cca700' : '#f14c4c';
  const statusLabel = isConnected ? 'Live SSE' : isSyncing ? 'Syncing' : 'Offline';
  return { statusColor, statusLabel, statusClass };
}

export function renderNavHeader(state: AppState): string {
  const { statusColor, statusLabel, statusClass } = getNavHeaderStatus(state);
  const endpoint = getConnectionEndpointInfo(state);

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
          ${
            endpoint.displayText
              ? `
            <span class="connection-indicator-pill ${endpoint.isTailscale ? 'pill-tailscale' : 'pill-lan'}" id="indicator-connection-endpoint" title="Connection: ${escapeHtml(endpoint.fullUrl || endpoint.ip)}">
              <span class="connection-type-icon">${endpoint.isTailscale ? '🔒' : '🏠'}</span>
              <span class="connection-ip-text">${escapeHtml(endpoint.ip)}</span>
              <span class="connection-type-tag">(${escapeHtml(endpoint.connectionType)})</span>
            </span>
          `
              : ''
          }
          <button type="button" id="btn-open-settings" class="btn-settings-pill" title="Settings & Device Connect">
            <span class="btn-settings-icon">⚙️</span>
            <span class="btn-settings-text">Settings</span>
          </button>
          <button type="button" id="btn-toggle-sync" class="status-pill ${statusClass}" title="Click to toggle Connection Mode (Live SSE / P2P / Gist Sync)">
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
          class="tab-btn ${state.activeTab === 'chat' ? 'active' : ''}"
          role="tab"
          aria-selected="${state.activeTab === 'chat'}"
        >
          <span>${escapeHtml(chatTabLabel)}</span>
          ${chatMsgCount > 0 ? `<span class="tab-badge">${chatMsgCount}</span>` : ''}
        </button>
      </nav>
    </header>
  `;
}
