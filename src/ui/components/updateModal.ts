import type { AppState } from '../types';
import { CLIENT_VERSION } from '../version';
import { isAutoUpdateEnabled } from '../updateManager';
import { escapeHtml } from './markdown';

export const FIREFOX_PRIMARY_PATH = 'file:///storage/emulated/0/Download/agent-monitor.html';
export const FIREFOX_SDCARD_PATH = 'file:///sdcard/Download/agent-monitor.html';

export function renderUpdateModal(state: AppState): string {
  if (!state.isUpdateModalOpen) return '';

  const autoUpdate = state.autoUpdateEnabled ?? isAutoUpdateEnabled();
  const updateVer = state.availableUpdateVersion || 'Latest';
  const isDownloaded = Boolean(state.updateDownloaded);

  return `
    <div class="modal-backdrop update-modal-backdrop" id="update-modal-backdrop">
      <div class="modal-dialog update-modal" role="dialog" aria-modal="true" aria-labelledby="update-modal-title">
        <div class="update-modal-header">
          <div class="update-modal-badge ${isDownloaded ? 'update-modal-badge--success' : 'update-modal-badge--info'}">
            <span>${isDownloaded ? '🚀 Update Ready' : '⚡ Update Available'}</span>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-update-modal" aria-label="Close">✕</button>
        </div>

        <div class="update-modal-body">
          <h2 id="update-modal-title" class="update-modal-title">
            ${isDownloaded ? `Version v${escapeHtml(updateVer)} Ready` : `Version v${escapeHtml(updateVer)} Available`}
          </h2>
          <div class="update-modal-subtitle">
            <span>Current:</span>
            <span class="version-tag">v${escapeHtml(CLIENT_VERSION)}</span>
            <span class="version-arrow">&rarr;</span>
            <span>New:</span>
            <span class="version-tag version-tag--new">v${escapeHtml(updateVer)}</span>
          </div>

          ${
            isDownloaded
              ? `
            <div class="update-card update-card--downloaded">
              <div class="update-card-icon">📥</div>
              <div class="update-card-info">
                <strong>Offline Bundle Downloaded</strong>
                <p>The updated <code>agent-monitor.html</code> file has been saved to your Downloads.</p>
              </div>
            </div>

            <div class="update-action-group">
              <a
                href="${FIREFOX_PRIMARY_PATH}"
                class="btn btn-primary btn-open-local"
                target="_blank"
                rel="noopener"
              >
                <span>📂 Open in Browser / Firefox</span>
              </a>
              <div class="update-secondary-row">
                <a
                  href="${FIREFOX_SDCARD_PATH}"
                  class="btn btn-secondary btn-open-sdcard"
                  target="_blank"
                  rel="noopener"
                >
                  <span>📁 Alt SD Card</span>
                </a>
                <button
                  type="button"
                  id="btn-copy-firefox-link"
                  class="btn btn-secondary copy-btn"
                  data-copy-text="${FIREFOX_PRIMARY_PATH}"
                >
                  <span>📋 Copy Path</span>
                </button>
              </div>
              <button type="button" id="btn-manual-download-update" class="btn btn-secondary">
                <span>🔄 Download Again</span>
              </button>
            </div>

            <div class="update-hint">
              <strong>💡 Tip:</strong> Open the downloaded file in your browser to start using v${escapeHtml(updateVer)}. Your vault password, settings, and session history remain securely intact.
            </div>
          `
              : `
            <div class="update-card update-card--available">
              <div class="update-card-icon">✨</div>
              <div class="update-card-info">
                <strong>New Version Available</strong>
                <p>Includes the latest performance improvements, UI enhancements, and fixes.</p>
              </div>
            </div>

            <div class="update-action-group">
              <button type="button" id="btn-manual-download-update" class="btn btn-primary">
                <span>📥 Download Update (v${escapeHtml(updateVer)})</span>
              </button>
            </div>

            <div class="update-hint">
              <strong>💡 Offline Ready:</strong> Downloading saves a single-file <code>agent-monitor.html</code> that runs anywhere with zero dependencies.
            </div>
          `
          }

          <div class="update-settings-card">
            <div class="update-toggle-label">
              <strong>Auto-Download Updates</strong>
              <span class="update-toggle-desc">Automatically download new releases to your device</span>
            </div>
            <label class="switch" for="toggle-auto-update">
              <input
                type="checkbox"
                id="toggle-auto-update"
                class="btn-toggle-auto-update"
                ${autoUpdate ? 'checked' : ''}
              />
              <span class="slider round"></span>
            </label>
          </div>
        </div>

        <div class="update-modal-footer">
          <button type="button" class="btn btn-ghost" id="btn-dismiss-update">Close</button>
        </div>
      </div>
    </div>
  `;
}
