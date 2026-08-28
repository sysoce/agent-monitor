import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { generateQrMatrix } from '../../qr/qrEncoder';
import { renderQrToSvg } from '../../qr/qrRenderer';
import { encodeSetupPayload } from '../../sync/payloadCodec';
import { loadCachedGistConfig } from '../sessionPlanSync';
import { getStoredToken } from '../authStore';

export type QrTarget = 'gh_pages' | 'lan' | 'download';

export interface BuildQrUrlOptions {
  target: QrTarget;
  payload?: string;
  origin?: string;
  customGhPagesUrl?: string;
  customLanUrl?: string;
}

export function buildQrSetupUrl(opts: BuildQrUrlOptions): string {
  const payload = opts.payload || '';
  if (opts.target === 'lan') {
    if (opts.customLanUrl) return opts.customLanUrl;
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200');
    return `${origin}/#setup=${payload}`;
  }
  if (opts.target === 'download') {
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200');
    return `${origin}/download#setup=${payload}`;
  }
  if (opts.customGhPagesUrl) return opts.customGhPagesUrl;
  return `https://sysoce.github.io/agent-monitor/#setup=${payload}`;
}

export function getCurrentClientPayload(state: AppState): string {
  if (state.serverSetupInfo?.setupPayload) return state.serverSetupInfo.setupPayload;
  const cfg = loadCachedGistConfig();
  const token = getStoredToken();
  return encodeSetupPayload({
    gistId: cfg?.gistId || '',
    token: cfg?.token || '',
    password: token || '',
  });
}

export function renderQrModal(state: AppState): string {
  if (!state.isQrModalOpen) return '';

  const target: QrTarget = state.qrModalTarget || 'gh_pages';
  const payload = getCurrentClientPayload(state);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
  const activeUrl = buildQrSetupUrl({
    target,
    payload,
    origin,
    customGhPagesUrl: state.serverSetupInfo?.githubPagesUrl,
    customLanUrl: state.serverSetupInfo?.lanUrl,
  });

  let qrSvg = '';
  try {
    const matrix = generateQrMatrix(activeUrl);
    qrSvg = renderQrToSvg(matrix, 4, 10);
  } catch {}

  const copyStatus = state.qrCopyFeedback || '';

  return `
    <div class="update-modal-backdrop qr-modal-backdrop" id="qr-modal" role="dialog" aria-modal="true">
      <div class="update-modal qr-modal-card">
        <div class="update-modal-header">
          <div class="update-modal-badge update-modal-badge--info">
            <span>📱</span>
            <span>Connect Phone</span>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-qr" title="Close QR Modal">✕</button>
        </div>
        <div class="update-modal-body" style="text-align:center;">
          <h3 class="update-modal-title">Pair Mobile / Web Device</h3>
          <p class="update-modal-subtitle">
            Scan with your phone camera to open and communicate via Git Sync over any network.
          </p>

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

          <div class="qr-download-row">
            <a class="btn btn-secondary qr-btn-download" id="btn-download-app-bundle" href="/download" download="agent-monitor.html">
              📥 Download Standalone agent-monitor.html
            </a>
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
      </div>
    </div>
  `;
}
