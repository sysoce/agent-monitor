import { escapeHtml } from '../markdown';

export interface NetworkConnectionItem {
  name: string;
  url: string;
  address: string;
  isTailscale?: boolean;
  isCustom?: boolean;
}

export function renderNetworkConnectionItem(
  item: NetworkConnectionItem,
  currentBaseUrl: string,
  defaultLanUrl: string,
  payload: string,
  copyFeedback: string
): string {
  const isSelected = currentBaseUrl === item.url || (!currentBaseUrl && item.url === defaultLanUrl);
  const isCopied = copyFeedback === `ip-${item.address}`;
  const fullSetupUrl = `${item.url}/#setup=${payload}`;

  let badgeClass = 'badge-lan';
  let badgeLabel = '🏠 Local LAN';
  if (item.isTailscale) {
    badgeClass = 'badge-tailscale';
    badgeLabel = '🔒 Tailscale';
  } else if (item.isCustom) {
    badgeClass = 'badge-custom';
    badgeLabel = '🌐 Custom IP';
  }

  const btnId = item.isTailscale ? 'id="btn-switch-tailscale"' : (item.url === defaultLanUrl ? 'id="btn-switch-set-ip"' : '');

  return `
    <div
      class="network-ip-item ${isSelected ? 'selected' : ''}"
      data-switch-connection="${escapeHtml(item.url)}"
      data-ip-url="${escapeHtml(item.url)}"
      ${btnId}
      role="button"
      tabindex="0"
      title="Click to switch to ${escapeHtml(item.name)} (${escapeHtml(item.url)})"
    >
      <div class="network-ip-header">
        <div class="network-ip-title-group">
          <span class="network-ip-name">${escapeHtml(item.name)}</span>
          <span class="network-ip-badge ${badgeClass}">
            ${badgeLabel}
          </span>
          ${isSelected ? '<span class="network-ip-active-tag">● Active</span>' : ''}
        </div>
        <div class="network-ip-actions">
          <button
            type="button"
            class="btn btn-secondary network-btn-use-qr ${isSelected ? 'active' : ''}"
            data-switch-connection="${escapeHtml(item.url)}"
            data-use-ip="${escapeHtml(item.url)}"
            title="${isSelected ? 'Active connection' : `Switch to ${escapeHtml(item.url)}`}"
          >
            ${isSelected ? '✓ Active' : '📲 Set as Active'}
          </button>
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
