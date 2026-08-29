import type { AppState } from './types';
import type { TransportMode } from '../sync/types';
import type { QrTarget } from './components/settingsModal/types';
import type { EventHandlerCallbacks } from './eventHandlers';
import { buildApiUrl, setServerBaseUrl, clearServerBaseUrl, hasLiveServer } from './authStore';
import { copyQrLink, copySetupHash, copyIpUrl } from './settingsClipboardActions';

export { copyQrLink, copySetupHash, copyIpUrl } from './settingsClipboardActions';

export async function fetchServerSetupInfo(state: AppState, onRender: () => void, force = false): Promise<void> {
  if (!force && state.serverSetupInfo?.networks && state.serverSetupInfo.networks.length > 0) return;
  if (!hasLiveServer()) return;
  try {
    const res = await fetch(buildApiUrl('/api/setup-info'));
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
  setServerBaseUrl(ipUrl);
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
}

export function saveCustomServerUrl(state: AppState, url: string, onRender: () => void): void {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) {
    setServerBaseUrl(clean);
    state.selectedLanIp = clean;
  } else {
    clearServerBaseUrl();
    state.selectedLanIp = undefined;
  }
  state.settingsCopyFeedback = 'server-saved';
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
  setTimeout(() => {
    if (state.settingsCopyFeedback === 'server-saved') {
      state.settingsCopyFeedback = undefined;
      onRender();
    }
  }, 2500);
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
  if (target.closest('#btn-save-custom-ip')) {
    const input = document.getElementById('input-custom-server-ip') as HTMLInputElement | null;
    saveCustomServerUrl(state, input?.value || '', callbacks.onRender);
    return true;
  }
  if (target.closest('#btn-clear-custom-ip')) {
    saveCustomServerUrl(state, '', callbacks.onRender);
    return true;
  }
  if (target.closest('#btn-copy-qr-link')) { void copyQrLink(state, callbacks.onRender); return true; }
  if (target.closest('#btn-copy-setup-hash')) { void copySetupHash(state, callbacks.onRender); return true; }
  const setSyncModeBtn = target.closest<HTMLElement>('[data-set-sync-mode]');
  if (setSyncModeBtn) {
    const targetMode = setSyncModeBtn.getAttribute('data-set-sync-mode') as TransportMode;
    if (targetMode) callbacks.onSetSyncMode?.(targetMode);
    return true;
  }
  if (target.closest('#btn-settings-toggle-sync')) { callbacks.onToggleSyncMode?.(); return true; }
  if (target.closest('#btn-settings-logout')) { callbacks.onLogout?.(); closeSettingsModal(state, callbacks.onRender); return true; }
  return false;
}
