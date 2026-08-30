import { escapeHtml } from '../markdown';

export interface NetworkConnectionItem {
  name: string;
  url: string;
  address: string;
  tag?: string;
  isDefault?: boolean;
  isTailscale?: boolean;
  isCustom?: boolean;
  isAvailable?: boolean;
}

export function normalizeConnectionUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  return clean.toLowerCase();
}

export function renderNetworkConnectionItem(
  item: NetworkConnectionItem,
  currentBaseUrl: string,
  defaultLanUrl: string,
  payload: string,
  copyFeedback: string
): string {
  const normCurrent = normalizeConnectionUrl(currentBaseUrl);
  const normItem = normalizeConnectionUrl(item.url);
  const normDefault = normalizeConnectionUrl(defaultLanUrl);
  const isSelected = normCurrent
    ? normCurrent === normItem
    : (normItem === normDefault || Boolean(item.isDefault));
  const isCopied = copyFeedback === `ip-${item.address}`;
  const fullSetupUrl = `${item.url}/#setup=${payload}`;
  const isAvailable = item.isAvailable !== false;
  const unavailableClass = !isAvailable ? 'connection-unavailable is-unavailable' : '';

  let badgeClass = 'badge-lan';
  let badgeLabel = item.tag ? `🏠 ${item.tag}` : (item.isDefault ? '🏠 Default LAN' : '🏠 Local LAN');
  if (item.isTailscale) {
    badgeClass = 'badge-tailscale';
    badgeLabel = item.tag ? `🔒 ${item.tag}` : '🔒 Tailscale (Default)';
  } else if (item.isCustom) {
    badgeClass = 'badge-custom';
    badgeLabel = item.tag ? `🏷️ ${item.tag}` : '🌐 Custom IP';
  }

  const btnId = item.isTailscale ? 'id="btn-switch-tailscale"' : (item.isDefault || item.url === defaultLanUrl ? 'id="btn-switch-set-ip"' : '');
  const statusBadge = !isAvailable
    ? '<span class="network-status-badge network-status--unavailable">○ Unavailable</span>'
    : `<span class="network-status-badge ${isSelected ? 'network-status--active' : 'network-status--disabled'}">
        ${isSelected ? '● Active' : '○ Disabled'}
      </span>`;

  return `
    <div
      class="network-ip-item ${isSelected ? 'selected active-connection' : 'inactive-connection'} ${unavailableClass}"
      data-switch-connection="${escapeHtml(item.url)}"
      data-ip-url="${escapeHtml(item.url)}"
      ${btnId}
      role="button"
      tabindex="0"
      ${!isAvailable ? 'aria-disabled="true"' : ''}
      title="${!isAvailable ? `Unavailable: ${escapeHtml(item.name)} (${escapeHtml(item.url)})` : `Click to activate ${escapeHtml(item.name)} (${escapeHtml(item.url)})`}"
    >
      <div class="network-ip-header">
        <div class="network-ip-title-group">
          <span class="network-ip-name">${escapeHtml(item.name)}</span>
          <span class="network-ip-badge ${badgeClass}">
            ${escapeHtml(badgeLabel)}
          </span>
          ${statusBadge}
        </div>
        <div class="network-ip-actions">
          <button
            type="button"
            class="btn btn-secondary network-btn-copy"
            data-copy-ip-url="${escapeHtml(fullSetupUrl)}"
            data-ip-address="${escapeHtml(item.address)}"
            title="Copy direct connection URL"
          >
            ${isCopied ? '✅ Copied!' : '📋 Copy URL'}
          </button>
          ${item.isCustom ? `
            <button
              type="button"
              class="btn btn-secondary network-btn-delete"
              data-delete-custom-ip="${escapeHtml(item.url)}"
              title="Remove ${escapeHtml(item.url)}"
            >✕ Remove</button>
          ` : ''}
        </div>
      </div>
      <div class="network-ip-address-text">
        <code>${escapeHtml(item.url)}</code>
      </div>
    </div>
  `;
}

