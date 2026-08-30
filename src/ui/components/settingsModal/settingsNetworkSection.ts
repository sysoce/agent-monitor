import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { getServerBaseUrl, getCustomConnections, getDefaultLanUrl, getTailscaleUrl, getCustomServerIp } from '../../authStore';
import { extractHostFromUrl, detectIsTailscale } from '../connectionEndpointInfo';
import { getCurrentClientPayload } from './settingsQrBuilder';
import { renderNetworkConnectionItem, type NetworkConnectionItem } from './settingsConnectionCards';

export function renderSettingsNetworkSection(state: AppState): string {
  const networks = state.serverSetupInfo?.networks || [];
  const payload = getCurrentClientPayload(state);
  const copyFeedback = state.settingsCopyFeedback || '';
  const currentBaseUrl = getServerBaseUrl() || state.selectedLanIp || '';
  const isConnectionAdded = copyFeedback === 'connection-added' || copyFeedback === 'server-saved';

  const customIp = state.customServerIp || getCustomServerIp() || '';
  const defaultLanUrl = state.defaultLanUrl || getDefaultLanUrl() || networks.find((n) => !n.isTailscale)?.url || customIp;
  const tailscaleUrl = state.tailscaleUrl || getTailscaleUrl() || networks.find((n) => n.isTailscale)?.url || '';
  const rawCustom = state.customConnections || getCustomConnections();
  const customList = rawCustom
    .map((item) => (typeof item === 'string' ? { url: item } : item))
    .filter((c) => Boolean(c && c.url && c.url !== defaultLanUrl && c.url !== tailscaleUrl));

  const itemsMap = new Map<string, NetworkConnectionItem>();

  for (const net of networks) {
    const clean = net.url.trim().replace(/\/+$/, '');
    if (clean && !itemsMap.has(clean)) {
      itemsMap.set(clean, {
        name: net.isTailscale ? 'Tailscale VPN' : (net.name ? `Machine LAN (${net.name})` : 'Machine Local LAN'),
        url: clean,
        address: net.address || extractHostFromUrl(clean),
        tag: 'Default',
        isDefault: !net.isTailscale,
        isTailscale: Boolean(net.isTailscale),
        isCustom: false,
      });
    }
  }

  if (tailscaleUrl) {
    const cleanTs = tailscaleUrl.trim().replace(/\/+$/, '');
    if (cleanTs && !itemsMap.has(cleanTs)) {
      itemsMap.set(cleanTs, {
        name: 'Tailscale VPN',
        url: cleanTs,
        address: extractHostFromUrl(cleanTs),
        tag: 'Default',
        isTailscale: true,
        isCustom: false,
      });
    }
  }

  if (defaultLanUrl) {
    const cleanLan = defaultLanUrl.trim().replace(/\/+$/, '');
    if (cleanLan && !itemsMap.has(cleanLan)) {
      itemsMap.set(cleanLan, {
        name: 'Machine Local LAN',
        url: cleanLan,
        address: extractHostFromUrl(cleanLan),
        tag: 'Default',
        isDefault: true,
        isTailscale: false,
        isCustom: false,
      });
    }
  }

  for (const record of customList) {
    const cleanCust = record.url.trim().replace(/\/+$/, '');
    if (cleanCust && !itemsMap.has(cleanCust)) {
      itemsMap.set(cleanCust, {
        name: record.name || `Custom Server (${extractHostFromUrl(cleanCust)})`,
        url: cleanCust,
        address: extractHostFromUrl(cleanCust),
        tag: record.tag || (record.name ? record.name : (detectIsTailscale(cleanCust) ? 'Tailscale' : 'Custom')),
        isTailscale: detectIsTailscale(cleanCust),
        isCustom: true,
      });
    }
  }

  const items = Array.from(itemsMap.values());
  const renderedList = items.length > 0
    ? items.map((item) => renderNetworkConnectionItem(item, currentBaseUrl, defaultLanUrl, payload, copyFeedback)).join('')
    : `
        <div class="network-ip-empty">
          <p>No active network connections configured or detected from server.</p>
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
        <label for="input-custom-server-ip" style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary, #9ca3af);">
          Add New Server Address (LAN, Remote, or Tunnel IP):
        </label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <input
            id="input-custom-server-name"
            class="search-input"
            type="text"
            placeholder="Name / Tag (e.g. Office PC)"
            style="flex: 1; min-width: 130px;"
          />
          <input
            id="input-custom-server-ip"
            class="search-input"
            type="text"
            placeholder="http://192.168.1.111:4200"
            value="${escapeHtml(customIp)}"
            style="flex: 2; min-width: 180px;"
          />
          <button type="button" class="btn btn-primary" id="btn-save-custom-ip" style="white-space: nowrap;">
            ${isConnectionAdded ? '✅ Added!' : '➕ Add Connection'}
          </button>
        </div>
      </div>

      <div class="network-ip-list">
        ${renderedList}
      </div>
    </div>
  `;
}
