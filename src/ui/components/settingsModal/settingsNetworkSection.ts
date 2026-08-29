import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { getCurrentClientPayload } from './types';

export function renderSettingsNetworkSection(state: AppState): string {
  const networks = state.serverSetupInfo?.networks || [];
  const payload = getCurrentClientPayload(state);
  const copyFeedback = state.settingsCopyFeedback || '';
  const selectedLan = state.selectedLanIp;

  const renderedList = networks.length > 0
    ? networks.map((net) => {
        const fullSetupUrl = `${net.url}/#setup=${payload}`;
        const isSelected = selectedLan === net.url || (!selectedLan && net.url === state.serverSetupInfo?.lanUrl?.split('/#')[0]);
        const isCopied = copyFeedback === `ip-${net.address}`;

        return `
          <div class="network-ip-item ${isSelected ? 'selected' : ''}" data-ip-url="${escapeHtml(net.url)}">
            <div class="network-ip-header">
              <div class="network-ip-title-group">
                <span class="network-ip-name">${escapeHtml(net.name)}</span>
                <span class="network-ip-badge ${net.isTailscale ? 'badge-tailscale' : 'badge-lan'}">
                  ${net.isTailscale ? '🔒 Tailscale' : '🏠 Local LAN'}
                </span>
                ${isSelected ? '<span class="network-ip-active-tag">Active QR</span>' : ''}
              </div>
              <div class="network-ip-actions">
                <button
                  type="button"
                  class="btn btn-secondary network-btn-use-qr ${isSelected ? 'active' : ''}"
                  data-use-ip="${escapeHtml(net.url)}"
                  title="Generate QR code for this network IP"
                >
                  ${isSelected ? '✓ In QR' : '📲 Use in QR'}
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
          <p class="network-ip-hint">Local connection URL: <code>${escapeHtml(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200')}</code></p>
        </div>
      `;

  return `
    <div class="settings-section settings-section--network" id="settings-section-network">
      <div class="settings-section-header">
        <h4 class="settings-section-title">🌐 Local Network & IP Addresses</h4>
        <p class="settings-section-subtitle">
          Connect directly via local Wi-Fi, LAN, or Tailscale for zero-latency <strong>Live SSE streaming</strong> without cloud sync.
        </p>
      </div>

      <div class="network-ip-list">
        ${renderedList}
      </div>
    </div>
  `;
}
