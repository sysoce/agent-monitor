import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { loadCachedGistConfig } from '../../sessionPlanSync';

export function renderSettingsSyncSection(state: AppState): string {
  const isP2P = state.syncMode === 'p2p';
  const isGit = state.syncMode === 'git-backup';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing' || state.syncStatus === 'connecting';
  const gistConfig = loadCachedGistConfig();
  const hasGist = Boolean(gistConfig?.gistId || state.serverSetupInfo?.gistId);
  const host = state.hostPresence;
  const isHostOnline = isGit && host ? Date.now() - host.lastActiveAt < 90_000 : false;

  const modeBadge = isP2P
    ? '🔗 WebRTC Peer-to-Peer'
    : isGit
      ? '📦 GitHub Gist Sync'
      : '⚡ Live SSE (Direct LAN)';

  const statusLabel = isP2P
    ? (isConnected ? 'Peer Connected' : isSyncing ? 'Connecting...' : 'Peer Offline')
    : isGit
      ? (isHostOnline ? 'Host Online' : isConnected ? 'Connected (Standby)' : isSyncing ? 'Syncing...' : 'Disconnected')
      : (isConnected ? 'Connected (Live)' : isSyncing ? 'Connecting...' : 'Disconnected');

  const quotaText = state.rateLimitRemaining !== undefined
    ? `${state.rateLimitRemaining.toLocaleString()} / 5,000 remaining`
    : '5,000 / 5,000 (Safe)';

  return `
    <div class="settings-section settings-section--sync" id="settings-section-sync">
      <div class="settings-section-header">
        <h4 class="settings-section-title">🔄 Connection & Sync Mode</h4>
        <p class="settings-section-subtitle">
          Select between Live SSE (Direct LAN), WebRTC Peer-to-Peer, and GitHub Gist Sync.
        </p>
      </div>

      <div class="settings-sync-card">
        <div class="settings-sync-info">
          <div class="settings-sync-row">
            <span class="settings-sync-label">Active Mode:</span>
            <span class="settings-sync-val font-semibold">${escapeHtml(modeBadge)}</span>
          </div>
          <div class="settings-sync-row">
            <span class="settings-sync-label">Connection Status:</span>
            <span class="settings-sync-status status-${isP2P ? 'p2p' : isGit ? 'git' : isConnected ? 'online' : 'offline'}">
              <span class="status-dot"></span>
              ${escapeHtml(statusLabel)}
            </span>
          </div>
          ${
            hasGist
              ? `
          <div class="settings-sync-row">
            <span class="settings-sync-label">GitHub Gist ID:</span>
            <span class="settings-sync-val font-mono">${escapeHtml(gistConfig?.gistId || state.serverSetupInfo?.gistId || 'Configured')}</span>
          </div>
          <div class="settings-sync-row">
            <span class="settings-sync-label">GitHub API Quota:</span>
            <span class="settings-sync-val ${state.rateLimitRemaining !== undefined && state.rateLimitRemaining < 100 ? 'text-warning' : 'text-success'}">${escapeHtml(quotaText)}</span>
          </div>`
              : `
          <div class="settings-sync-row">
            <span class="settings-sync-label">GitHub Gist ID:</span>
            <span class="settings-sync-val font-mono"><span class="text-muted">None (Direct mode)</span></span>
          </div>`
          }
        </div>

        <div class="settings-sync-actions">
          <button type="button" class="btn btn-secondary settings-btn-toggle-sync" id="btn-settings-toggle-sync" data-current-mode="${escapeHtml(state.syncMode || 'live-sse')}">
            ${isP2P ? '⚡ Switch to Live SSE Mode' : isGit ? '🔗 Switch to Peer-to-Peer Mode' : '📦 Switch to GitHub Gist Mode'}
          </button>
        </div>
      </div>
    </div>
  `;
}
