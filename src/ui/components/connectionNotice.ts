import type { AppState } from '../types';
import { escapeHtml } from './markdown';

export function renderConnectionNotice(state: AppState): string {
  if (state.errorMessage) {
    return `
      <div class="connection-notice connection-notice--error" role="alert">
        <span class="connection-notice-icon">⚠️</span>
        <div class="connection-notice-content">
          <span class="connection-notice-title">Error</span>
          <span class="connection-notice-text">${escapeHtml(state.errorMessage)}</span>
        </div>
      </div>
    `;
  }

  if (state.availableUpdateVersion) {
    const isDownloaded = Boolean(state.updateDownloaded);
    const ver = escapeHtml(state.availableUpdateVersion);
    const detail = isDownloaded
      ? `A new version (v${ver}) has been downloaded. Reload or reopen the file to start using it.`
      : `A new version (v${ver}) is available.`;
    const buttons = isDownloaded
      ? `<button type="button" class="btn btn-secondary btn-reload-update" id="btn-reload-page" style="margin-left: auto; padding: 4px 10px; font-size: 11px; flex-shrink: 0; cursor: pointer;">Reload</button>`
      : `<button type="button" class="btn btn-secondary btn-download-update" id="btn-download-bundle" style="margin-left: auto; padding: 4px 10px; font-size: 11px; flex-shrink: 0; cursor: pointer;">Download v${ver}</button>`;
    return `
      <div class="connection-notice connection-notice--update" role="status">
        <span class="connection-notice-icon">🚀</span>
        <div class="connection-notice-content">
          <span class="connection-notice-title">New Version Available (v${ver})</span>
          <span class="connection-notice-text">${escapeHtml(detail)}</span>
        </div>
        ${buttons}
      </div>
    `;
  }

  if (state.syncStatus === 'disconnected') {
    const isGit = state.syncMode === 'git-backup';
    const detail = isGit
      ? 'Cannot reach GitHub Gist sync or local server. Check your network connection.'
      : 'Cannot reach host agent. Your computer may be asleep or on a different network. Wake up your computer to resume live interaction.';
    return `
      <div class="connection-notice connection-notice--disconnected" role="status">
        <span class="connection-notice-icon">📡</span>
        <div class="connection-notice-content">
          <span class="connection-notice-title">Host Disconnected</span>
          <span class="connection-notice-text">${escapeHtml(detail)}</span>
        </div>
      </div>
    `;
  }

  return '';
}
