import type { AppState } from '../../types';
import { CLIENT_VERSION } from '../../version';
import { isAutoUpdateEnabled } from '../../updateManager';
import { escapeHtml } from '../markdown';

export function renderSettingsAppSection(state: AppState): string {
  const autoUpdate = state.autoUpdateEnabled ?? isAutoUpdateEnabled();

  return `
    <div class="settings-section settings-section--app" id="settings-section-app">
      <div class="settings-section-header">
        <h4 class="settings-section-title">🛠️ App Preferences & Tools</h4>
        <p class="settings-section-subtitle">Manage client updates and offline bundles.</p>
      </div>

      <div class="settings-app-card">
        <div class="settings-auto-update-row">
          <div class="settings-auto-update-label">
            <span class="settings-row-title">Automatic Updates</span>
            <span class="settings-row-desc">Automatically download new versions when available</span>
          </div>
          <label class="switch" for="toggle-auto-update" aria-label="Toggle Auto-update">
            <input
              type="checkbox"
              id="toggle-auto-update"
              class="btn-toggle-auto-update"
              ${autoUpdate ? 'checked' : ''}
            />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="settings-download-row">
          <div class="settings-download-info">
            <span class="settings-row-title">Standalone Offline Bundle</span>
            <span class="settings-row-desc">Single-file HTML dashboard with full offline support</span>
          </div>
          <a class="btn btn-secondary settings-btn-download" id="btn-download-app-bundle" href="/download" download="agent-monitor.html">
            📥 Download HTML
          </a>
        </div>

        <div class="settings-version-row">
          <span class="settings-version-label">Agent Monitor Version:</span>
          <span class="settings-version-val">v${escapeHtml(CLIENT_VERSION)}</span>
        </div>

        ${
          state.isAuthenticated
            ? `
          <div class="settings-logout-row">
            <button type="button" class="btn btn-danger settings-btn-logout" id="btn-settings-logout">
              🔒 Lock / Logout Session
            </button>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}
