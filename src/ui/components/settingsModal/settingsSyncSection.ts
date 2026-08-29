import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { loadCachedGistConfig } from '../../sessionPlanSync';

export function renderSettingsSyncSection(state: AppState): string {
  const isGit = state.syncMode === 'git-backup';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing';
  const gistConfig = loadCachedGistConfig();
  const hasGist = Boolean(gistConfig?.gistId || state.serverSetupInfo?.gistId);
  const host = state.hostPresence;
  const isHostOnline = isGit && host ? Date.now() - host.lastActiveAt < 90_000 : false;

  const modeBadge = isGit ? '🔗 Peer-to-Peer / Gist Sync' : '⚡ Live SSE (Direct LAN)';
  const statusLabel = isGit
    ? (isHostOnline ? 'Host Online' : 'Standby / Syncing')
    : (isConnected ? 'Connected (Live)' : isSyncing ? 'Connecting...' : 'Disconnected');

  return `
    <div class="settings-section settings-section--sync" id="settings-section-sync">
      <div class="settings-section-header">
        <h4 class="settings-section-title">🔄 Connection & Sync Mode</h4>
        <p class="settings-section-subtitle">
          Toggle between direct local LAN SSE streaming and remote Peer-to-Peer / Gist synchronization.
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
            <span class="settings-sync-status status-${isGit ? 'git' : isConnected ? 'online' : 'offline'}">
              <span class="status-dot"></span>
              ${escapeHtml(statusLabel)}
            </span>
          </div>
          <div class="settings-sync-row">
            <span class="settings-sync-label">GitHub Gist ID:</span>
            <span class="settings-sync-val font-mono">${hasGist ? escapeHtml(gistConfig?.gistId || state.serverSetupInfo?.gistId || 'Configured') : '<span class="text-muted">None (Local LAN only)</span>'}</span>
          </div>
        </div>

        <div class="settings-sync-actions">
          <button type="button" class="btn btn-secondary settings-btn-toggle-sync" id="btn-settings-toggle-sync">
            ${isGit ? '⚡ Switch to Live SSE Mode' : '🔗 Switch to Peer-to-Peer Mode'}
          </button>
        </div>
      </div>
    </div>
  `;
}
