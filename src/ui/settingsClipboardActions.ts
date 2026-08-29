import type { AppState } from './types';
import { buildSettingsQrUrl, getCurrentClientPayload } from './components/settingsModal/settingsQrBuilder';

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
