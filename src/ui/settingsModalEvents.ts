import type { AppState } from './types';
import type { QrTarget } from './components/settingsModal/types';
import { buildSettingsQrUrl, getCurrentClientPayload } from './components/settingsModal/types';
import type { EventHandlerCallbacks } from './eventHandlers';

export async function fetchServerSetupInfo(state: AppState, onRender: () => void): Promise<void> {
  if (state.serverSetupInfo?.networks && state.serverSetupInfo.networks.length > 0) return;
  try {
    const res = await fetch('/api/setup-info');
    if (res.ok) {
      state.serverSetupInfo = await res.json();
      onRender();
    }
  } catch {}
}

export function openSettingsModal(state: AppState, onRender: () => void): void {
  state.isSettingsModalOpen = true;
  state.isQrModalOpen = true;
  state.qrModalTarget = state.qrModalTarget || 'gh_pages';
  state.settingsCopyFeedback = undefined;
  state.qrCopyFeedback = undefined;
  onRender();
  void fetchServerSetupInfo(state, onRender);
}

export function closeSettingsModal(state: AppState, onRender: () => void): void {
  state.isSettingsModalOpen = false;
  state.isQrModalOpen = false;
  state.settingsCopyFeedback = undefined;
  state.qrCopyFeedback = undefined;
  onRender();
}

export function selectQrTab(state: AppState, target: QrTarget, onRender: () => void): void {
  state.qrModalTarget = target;
  state.settingsCopyFeedback = undefined;
  state.qrCopyFeedback = undefined;
  onRender();
}

export function selectLanIp(state: AppState, ipUrl: string, onRender: () => void): void {
  state.selectedLanIp = ipUrl;
  state.qrModalTarget = 'lan';
  onRender();
}

export async function copyQrLink(state: AppState, onRender: () => void): Promise<void> {
  const url = buildSettingsQrUrl({
    target: state.qrModalTarget || 'gh_pages',
    payload: getCurrentClientPayload(state),
    origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
    customGhPagesUrl: state.serverSetupInfo?.githubPagesUrl,
    customLanUrl: state.serverSetupInfo?.lanUrl,
    selectedLanIp: state.selectedLanIp,
  });
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    state.settingsCopyFeedback = 'link';
    state.qrCopyFeedback = 'link';
    onRender();
    setTimeout(() => {
      if (state.settingsCopyFeedback === 'link') {
        state.settingsCopyFeedback = undefined;
        state.qrCopyFeedback = undefined;
        onRender();
      }
    }, 2500);
  } catch {}
}

export async function copySetupHash(state: AppState, onRender: () => void): Promise<void> {
  const hash = `#setup=${getCurrentClientPayload(state)}`;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(hash);
    }
    state.settingsCopyFeedback = 'hash';
    state.qrCopyFeedback = 'hash';
    onRender();
    setTimeout(() => {
      if (state.settingsCopyFeedback === 'hash') {
        state.settingsCopyFeedback = undefined;
        state.qrCopyFeedback = undefined;
        onRender();
      }
    }, 2500);
  } catch {}
}

export async function copyIpUrl(state: AppState, ipUrl: string, ipAddress: string, onRender: () => void): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(ipUrl);
    }
    state.settingsCopyFeedback = `ip-${ipAddress}`;
    onRender();
    setTimeout(() => {
      if (state.settingsCopyFeedback === `ip-${ipAddress}`) {
        state.settingsCopyFeedback = undefined;
        onRender();
      }
    }, 2500);
  } catch {}
}

export function handleSettingsModalClick(state: AppState, target: HTMLElement, callbacks: EventHandlerCallbacks): boolean {
  if (target.closest('#btn-open-settings, #btn-show-qr, #btn-sidebar-qr')) {
    openSettingsModal(state, callbacks.onRender);
    return true;
  }
  if (target.closest('#btn-close-settings, #btn-close-qr') || target.id === 'settings-modal' || target.id === 'qr-modal') {
    closeSettingsModal(state, callbacks.onRender);
    return true;
  }
  if (target.closest('#qr-tab-gh')) { selectQrTab(state, 'gh_pages', callbacks.onRender); return true; }
  if (target.closest('#qr-tab-lan')) { selectQrTab(state, 'lan', callbacks.onRender); return true; }
  if (target.closest('#qr-tab-dl')) { selectQrTab(state, 'download', callbacks.onRender); return true; }

  const useIpBtn = target.closest<HTMLElement>('[data-use-ip]');
  if (useIpBtn) {
    const ipUrl = useIpBtn.getAttribute('data-use-ip') || '';
    if (ipUrl) selectLanIp(state, ipUrl, callbacks.onRender);
    return true;
  }
  const copyIpBtn = target.closest<HTMLElement>('[data-copy-ip-url]');
  if (copyIpBtn) {
    const ipUrl = copyIpBtn.getAttribute('data-copy-ip-url') || '';
    const ipAddr = copyIpBtn.getAttribute('data-ip-address') || '';
    if (ipUrl) void copyIpUrl(state, ipUrl, ipAddr, callbacks.onRender);
    return true;
  }
  if (target.closest('#btn-copy-qr-link')) { void copyQrLink(state, callbacks.onRender); return true; }
  if (target.closest('#btn-copy-setup-hash')) { void copySetupHash(state, callbacks.onRender); return true; }
  if (target.closest('#btn-settings-toggle-sync')) { callbacks.onToggleSyncMode?.(); return true; }
  if (target.closest('#btn-settings-logout')) { callbacks.onLogout?.(); closeSettingsModal(state, callbacks.onRender); return true; }
  return false;
}
