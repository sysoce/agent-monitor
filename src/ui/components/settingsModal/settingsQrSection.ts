import type { AppState } from '../../types';
import { escapeHtml } from '../markdown';
import { generateQrMatrix } from '../../../qr/qrEncoder';
import { renderQrToSvg } from '../../../qr/qrRenderer';
import { isStaticDeployment } from '../../authStore';
import type { QrTarget } from './types';
import { buildSettingsQrUrl, getCurrentClientPayload } from './settingsQrBuilder';

export function renderSettingsQrSection(state: AppState): string {
  const target: QrTarget = state.qrModalTarget || (isStaticDeployment() ? 'gh_pages' : 'lan');
  const payload = getCurrentClientPayload(state);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
  const activeUrl = buildSettingsQrUrl({
    target,
    payload,
    origin,
    customGhPagesUrl: state.serverSetupInfo?.githubPagesUrl,
    customLanUrl: state.serverSetupInfo?.lanUrl,
    selectedLanIp: state.selectedLanIp,
  });

  let qrSvg = '';
  try {
    const matrix = generateQrMatrix(activeUrl);
    qrSvg = renderQrToSvg(matrix, 4, 10);
  } catch {}

  const copyStatus = state.settingsCopyFeedback || state.qrCopyFeedback || '';

  return `
    <div class="settings-section settings-section--qr" id="settings-section-qr">
      <div class="settings-section-header">
        <h4 class="settings-section-title">📱 Connect Device & QR Share</h4>
        <p class="settings-section-subtitle">Scan with your phone camera to pair and monitor agents live.</p>
      </div>

      <div class="qr-tabs-container">
        <button type="button" id="qr-tab-gh" class="qr-tab-btn ${target === 'gh_pages' ? 'active' : ''}">
          🌐 GitHub Pages
        </button>
        <button type="button" id="qr-tab-lan" class="qr-tab-btn ${target === 'lan' ? 'active' : ''}">
          🏠 Local LAN
        </button>
        <button type="button" id="qr-tab-dl" class="qr-tab-btn ${target === 'download' ? 'active' : ''}">
          📥 Offline App
        </button>
      </div>

      <div class="qr-svg-container" id="qr-svg-box">
        ${qrSvg}
      </div>

      <div class="qr-url-row">
        <input class="search-input qr-link-input" id="mobile-link-url" readonly value="${escapeHtml(activeUrl)}" />
      </div>

      <div class="qr-action-buttons">
        <button type="button" class="btn btn-primary qr-btn-action" id="btn-copy-qr-link">
          ${copyStatus === 'link' ? '✅ Copied Link!' : '📋 Copy Link'}
        </button>
        <button type="button" class="btn btn-secondary qr-btn-action" id="btn-copy-setup-hash">
          ${copyStatus === 'hash' ? '✅ Copied Hash!' : '🔑 Copy Setup Hash'}
        </button>
      </div>

      <div class="qr-install-tips">
        <strong>💡 Install as a Phone App:</strong>
        <ol>
          <li>Scan the QR code with Safari (iOS) or Chrome (Android).</li>
          <li>Tap <strong>Share &rarr; Add to Home Screen</strong> (iOS) or <strong>&vellip; &rarr; Install app</strong> (Android).</li>
          <li>Launch from your home screen for instant fullscreen monitoring!</li>
        </ol>
      </div>
    </div>
  `;
}
