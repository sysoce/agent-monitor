import type { AppState } from './types';
import type { QrTarget } from './components/qrModal';
import {
  fetchServerSetupInfo,
  openSettingsModal,
  closeSettingsModal,
  selectQrTab,
  copyQrLink,
  copySetupHash,
  handleSettingsModalClick,
} from './settingsModalEvents';

export {
  fetchServerSetupInfo,
  selectQrTab,
  copyQrLink,
  copySetupHash,
};

export function openQrModal(state: AppState, onRender: () => void): void {
  openSettingsModal(state, onRender);
}

export function closeQrModal(state: AppState, onRender: () => void): void {
  closeSettingsModal(state, onRender);
}

export function handleQrModalClick(state: AppState, target: HTMLElement, onRender: () => void): boolean {
  return handleSettingsModalClick(state, target, { onRender } as any);
}
