import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { getServerBaseUrl } from '../../authStore';
import { getCurrentClientPayload } from './settingsQrBuilder';

export function renderSettingsNetworkSection(state: AppState): string {
  const networks = state.serverSetupInfo?.networks || [];
  const payload = getCurrentClientPayload(state);
  const copyFeedback = state.settingsCopyFeedback || '';
  const currentBaseUrl = getServerBaseUrl() || state.selectedLanIp || '';
  const isServerSaved = copyFeedback === 'server-saved';

  const renderedList = networks.length > 0
    ? networks.map((net) => {
        const fullSetupUrl = `${net.url}/#setup=${payload}`;
        const isSelected = currentBaseUrl === net.url || (!currentBaseUrl && net.url === state.serverSetupInfo?.lanUrl?.split('/#')[0]);
        const isCopied = copyFeedback === `ip-${net.address}`;

        return `
          <div class="network-ip-item ${isSelected ? 'selected' : ''}" data-ip-url="${escapeHtml(net.url)}">
            <div class="network-ip-header">
              <div class="network-ip-title-group">
                <span class="network-ip-name">${escapeHtml(net.name)}</span>
                <span class="network-ip-badge ${net.isTailscale ? 'badge-tailscale' : 'badge-lan'}">
                  ${net.isTailscale ? '🔒 Tailscale' : '🏠 Local LAN'}
                </span>
                ${isSelected ? '<span class="network-ip-active-tag">Active</span>' : ''}
              </div>
              <div class="network-ip-actions">
                <button
                  type="button"
                  class="btn btn-secondary network-btn-use-qr ${isSelected ? 'active' : ''}"
                  data-use-ip="${escapeHtml(net.url)}"
                  title="Use this network address for live SSE & QR"
                >
                  ${isSelected ? '✓ Active' : '📲 Set as Active'}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary network-btn-copy"
                  data-copy-ip-url="${escapeHtml(fullSetupUrl)}"
                  data-ip-address="${escapeHtml(net.address)}"
                  title="Copy direct connection URL"
                >
                  ${isCopied ? '✅ Copied!' : '📋 Copy URL'}
                </button>
              </div>
            </div>
            <div class="network-ip-address-text">
              <code>${escapeHtml(net.url)}</code>
            </div>
          </div>
        `;
      }).join('')
    : `
        <div class="network-ip-empty">
          <p>No active local network interfaces detected from server.</p>
          <p class="network-ip-hint">Local connection URL: <code>${escapeHtml(currentBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200'))}</code></p>
        </div>
      `;


  return `
    <div class="settings-section settings-section--network" id="settings-section-network">
      <div class="settings-section-header">
        <h4 class="settings-section-title">🌐 Local Network & Server IP</h4>
        <p class="settings-section-subtitle">
          Connect directly via local Wi-Fi, LAN, or Tailscale for zero-latency <strong>Live SSE streaming</strong> without cloud sync.
        </p>
      </div>

      <div class="server-ip-config-box" style="margin-bottom: 12px;">
        <label for="input-custom-server-ip" style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--text-secondary, #9ca3af);">
          Agent Server Address (LAN / Tailscale IP):
        </label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            id="input-custom-server-ip"
            class="search-input"
            type="text"
            placeholder="http://192.168.1.50:4200"
            value="${escapeHtml(currentBaseUrl)}"
            style="flex: 1;"
          />
          <button type="button" class="btn btn-primary" id="btn-save-custom-ip" style="white-space: nowrap;">
            ${isServerSaved ? '✅ Saved!' : '💾 Set IP'}
          </button>
          ${currentBaseUrl ? '<button type="button" class="btn btn-secondary" id="btn-clear-custom-ip" title="Clear server IP">Clear</button>' : ''}
        </div>
      </div>

      <div class="network-ip-list">
        ${renderedList}
      </div>
    </div>
  `;
}
