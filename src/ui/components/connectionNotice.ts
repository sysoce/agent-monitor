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

  if (state.syncMode === 'git-backup' && state.isAwaitingResponse) {
    return `
      <div class="connection-notice connection-notice--queued" role="status">
        <span class="connection-notice-icon">⏳</span>
        <div class="connection-notice-content">
          <span class="connection-notice-title">Prompt Queued in Git Sync</span>
          <span class="connection-notice-text">Waiting for host agent to process. Ensure your host computer is awake.</span>
        </div>
      </div>
    `;
  }

  return '';
}
