import { escapeHtml } from '../markdown';
import { extractHostFromUrl } from '../connectionEndpointInfo';

export interface ConnectionOption {
  url: string;
  name: string;
  icon: string;
  type: 'lan' | 'tailscale' | 'custom';
  isCustom?: boolean;
}

export function renderConnectionOptionBtn(opt: ConnectionOption, currentBaseUrl: string): string {
  const isActive = currentBaseUrl === opt.url;
  const host = extractHostFromUrl(opt.url);
  const btnId = opt.type === 'tailscale' ? 'btn-switch-tailscale' : (opt.type === 'lan' ? 'btn-switch-set-ip' : '');

  return `
    <div class="switcher-opt-wrapper ${isActive ? 'active' : ''}">
      <button
        type="button"
        class="btn switcher-opt-btn ${isActive ? 'active' : ''}"
        ${btnId ? `id="${btnId}"` : ''}
        data-switch-connection="${escapeHtml(opt.url)}"
        title="Switch to ${escapeHtml(opt.name)} (${escapeHtml(opt.url)})"
      >
        <span class="switcher-icon">${opt.icon}</span>
        <span class="switcher-title">${escapeHtml(opt.name)}</span>
        <span class="switcher-badge font-mono">${escapeHtml(host)}</span>
        ${isActive ? '<span class="switcher-active-dot">● Active</span>' : ''}
      </button>
      ${opt.isCustom ? `
        <button
          type="button"
          class="switcher-delete-btn"
          data-delete-custom-ip="${escapeHtml(opt.url)}"
          title="Remove ${escapeHtml(opt.url)}"
        >✕</button>
      ` : ''}
    </div>
  `;
}
