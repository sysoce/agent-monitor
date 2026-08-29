import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { loadCachedGistConfig } from '../../sessionPlanSync';
import { isAutoFallbackEnabled } from '../../fallbackSettings';

export function renderSettingsSyncSection(state: AppState): string {
  const isP2P = state.syncMode === 'p2p';
  const isGit = state.syncMode === 'git-backup';
  const isSSE = state.syncMode === 'live-sse';
  const isConnected = state.syncStatus === 'connected';
  const isSyncing = state.syncStatus === 'syncing' || state.syncStatus === 'connecting';
  const isAutoFallback = state.autoFallbackEnabled ?? isAutoFallbackEnabled();
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
          Select between WebRTC Peer-to-Peer, Live SSE (Direct LAN), and GitHub Gist Sync.
        </p>
      </div>

      <div class="settings-sync-card">
        <div class="settings-sync-modes-grid">
          <button type="button" class="btn settings-mode-btn ${isP2P ? 'active' : ''}" data-set-sync-mode="p2p" title="Ultra-fast direct WebRTC peer connection (Default)">
            <span class="settings-mode-icon">🔗</span>
            <span class="settings-mode-title">WebRTC P2P</span>
            <span class="settings-mode-desc">Default Direct</span>
          </button>
          <button type="button" class="btn settings-mode-btn ${isSSE ? 'active' : ''}" data-set-sync-mode="live-sse" title="Direct LAN HTTP & Server-Sent Events stream">
            <span class="settings-mode-icon">⚡</span>
            <span class="settings-mode-title">Live SSE</span>
            <span class="settings-mode-desc">LAN Stream</span>
          </button>
          <button type="button" class="btn settings-mode-btn ${isGit ? 'active' : ''}" data-set-sync-mode="git-backup" title="Asynchronous encrypted GitHub Gist mailbox relay">
            <span class="settings-mode-icon">📦</span>
            <span class="settings-mode-title">GitHub Gist</span>
            <span class="settings-mode-desc">Cloud Relay</span>
          </button>
        </div>

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

        <div class="settings-fallback-row">
          <div class="settings-fallback-label">
            <span class="settings-row-title">Automatic Fallback</span>
            <span class="settings-row-desc">Auto-failover to backup transports (Turn off to isolate a single transport for testing)</span>
          </div>
          <label class="switch" for="toggle-auto-fallback" aria-label="Toggle Auto-fallback">
            <input
              type="checkbox"
              id="toggle-auto-fallback"
              class="btn-toggle-auto-fallback"
              ${isAutoFallback ? 'checked' : ''}
            />
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
  `;
}
