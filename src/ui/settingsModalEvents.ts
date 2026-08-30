import type { AppState } from './types';
import type { TransportMode } from '../sync/types';
import type { QrTarget } from './components/settingsModal/types';
import type { EventHandlerCallbacks } from './eventHandlers';
import {
  fetchServerSetupInfo,
  selectLanIp,
  selectActiveConnection,
  switchToTailscale,
  switchToSetIp,
  addNewCustomConnection,
  deleteCustomConnection,
  saveCustomServerUrl,
} from './settingsConnectionSwitcher';
import { getCustomServerIp, getTailscaleUrl, getDefaultLanUrl, getCustomConnections } from './authStore';
import { copyQrLink, copySetupHash, copyIpUrl } from './settingsClipboardActions';

export {
  fetchServerSetupInfo,
  selectLanIp,
  selectActiveConnection,
  switchToTailscale,
  switchToSetIp,
  addNewCustomConnection,
  deleteCustomConnection,
  saveCustomServerUrl,
} from './settingsConnectionSwitcher';
export { copyQrLink, copySetupHash, copyIpUrl } from './settingsClipboardActions';

export function openSettingsModal(state: AppState, onRender: () => void): void {
  state.isSettingsModalOpen = true;
  state.isQrModalOpen = true;
  state.qrModalTarget = state.qrModalTarget || 'gh_pages';
  state.settingsCopyFeedback = undefined;
  state.qrCopyFeedback = undefined;
  if (!state.defaultLanUrl) state.defaultLanUrl = getDefaultLanUrl() || undefined;
  if (!state.tailscaleUrl) state.tailscaleUrl = getTailscaleUrl() || undefined;
  if (!state.customConnections) state.customConnections = getCustomConnections();
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
  const copyIpBtn = target.closest<HTMLElement>('[data-copy-ip-url]');
  if (copyIpBtn) {
    const ipUrl = copyIpBtn.getAttribute('data-copy-ip-url') || '';
    const ipAddr = copyIpBtn.getAttribute('data-ip-address') || '';
    if (ipUrl) void copyIpUrl(state, ipUrl, ipAddr, callbacks.onRender);
    return true;
  }

  const deleteBtn = target.closest<HTMLElement>('[data-delete-custom-ip]');
  if (deleteBtn) {
    const deleteUrl = deleteBtn.getAttribute('data-delete-custom-ip') || '';
    if (deleteUrl) deleteCustomConnection(state, deleteUrl, callbacks.onRender);
    return true;
  }

  if (target.closest('#btn-switch-tailscale')) { switchToTailscale(state, callbacks.onRender); return true; }
  if (target.closest('#btn-switch-set-ip')) { switchToSetIp(state, callbacks.onRender); return true; }

  const switchBtn = target.closest<HTMLElement>('[data-switch-connection]');
  if (switchBtn) {
    const targetUrl = switchBtn.getAttribute('data-switch-connection') || '';
    if (targetUrl) selectActiveConnection(state, targetUrl, callbacks.onRender);
    return true;
  }

  const useIpBtn = target.closest<HTMLElement>('[data-use-ip]');
  if (useIpBtn) {
    const ipUrl = useIpBtn.getAttribute('data-use-ip') || '';
    if (ipUrl) selectLanIp(state, ipUrl, callbacks.onRender);
    return true;
  }
  if (target.closest('#btn-save-custom-ip')) {
    const ipInput = document.getElementById('input-custom-server-ip') as HTMLInputElement | null;
    const nameInput = document.getElementById('input-custom-server-name') as HTMLInputElement | null;
    const val = ipInput?.value || '';
    const name = nameInput?.value || '';
    if (val.trim()) {
      addNewCustomConnection(state, val, name, name, callbacks.onRender);
      if (ipInput) ipInput.value = '';
      if (nameInput) nameInput.value = '';
    }
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
