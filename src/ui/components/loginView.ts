import type { AppState } from '../types';
import { CLIENT_VERSION } from '../version';

export function renderLoginView(state: AppState): string {
  let cachedGistId = '', cachedToken = '';
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('agent_gist_sync');
      if (raw) {
        const parsed = JSON.parse(raw);
        cachedGistId = parsed.gistId || '';
        cachedToken = parsed.token || '';
      }
    } catch {}
  }

  const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const shouldOpenDetails = isFile || !cachedGistId;
  const subtitle = isFile
    ? 'Running locally: Paste your setup link/code or enter your Gist credentials & password below.'
    : 'Enter your vault password or scan QR code to access your sessions.';

  return `
    <div class="login-view-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">🔐</div>
          <div class="login-title">Agent Monitor <span class="login-version">v${CLIENT_VERSION}</span></div>
          <div class="login-subtitle">${subtitle}</div>
        </div>
        <form class="login-form" id="login-form" onsubmit="return false;" autocomplete="on">
          <input
            type="password"
            id="login-password-input"
            class="login-input"
            name="password"
            placeholder="Vault Password / PIN"
            autocomplete="current-password"
            required
            autofocus
          />
          <details class="login-gist-details" ${shouldOpenDetails ? 'open' : ''} style="margin-top: 8px; font-size: 12px; text-align: left;">
            <summary style="cursor: pointer; padding: 4px 0; color: #c586c0; font-weight: 500;">⚙️ Standalone / Git Backup Settings</summary>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
              <input
                type="text"
                id="login-quick-setup"
                class="login-input"
                placeholder="Paste Quick Setup link or #setup= code"
                style="font-size: 12px; padding: 6px 10px;"
              />
              <input
                type="text"
                id="login-gist-id"
                class="login-input"
                placeholder="Gist ID"
                value="${cachedGistId}"
                style="font-size: 12px; padding: 6px 10px;"
              />
              <input
                type="password"
                id="login-gist-token"
                class="login-input"
                placeholder="GitHub Token"
                value="${cachedToken}"
                style="font-size: 12px; padding: 6px 10px;"
              />
            </div>
          </details>
          ${state.authError ? `<div class="login-error">${state.authError}</div>` : ''}
          <button type="submit" id="btn-login-submit" class="login-btn" style="margin-top: 12px;">Unlock Monitor</button>
        </form>
      </div>
    </div>
  `;
}
