import type { AppState } from './types';
import type { QrTarget } from './components/qrModal';
import { buildQrSetupUrl, getCurrentClientPayload } from './components/qrModal';

export async function fetchServerSetupInfo(state: AppState, onRender: () => void): Promise<void> {
  if (state.serverSetupInfo) return;
  try {
    const res = await fetch('/api/setup-info');
    if (res.ok) {
      const data = await res.json();
      state.serverSetupInfo = data;
      onRender();
    }
  } catch {}
}

export function openQrModal(state: AppState, onRender: () => void): void {
  state.isQrModalOpen = true;
  state.qrModalTarget = state.qrModalTarget || 'gh_pages';
  state.qrCopyFeedback = undefined;
  onRender();
  void fetchServerSetupInfo(state, onRender);
}

export function closeQrModal(state: AppState, onRender: () => void): void {
  state.isQrModalOpen = false;
  state.qrCopyFeedback = undefined;
  onRender();
}

export function selectQrTab(state: AppState, target: QrTarget, onRender: () => void): void {
  state.qrModalTarget = target;
  state.qrCopyFeedback = undefined;
  onRender();
}

export async function copyQrLink(state: AppState, onRender: () => void): Promise<void> {
  const target = state.qrModalTarget || 'gh_pages';
  const payload = getCurrentClientPayload(state);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
  const url = buildQrSetupUrl({
    target,
    payload,
    origin,
    customGhPagesUrl: state.serverSetupInfo?.githubPagesUrl,
    customLanUrl: state.serverSetupInfo?.lanUrl,
  });

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    state.qrCopyFeedback = 'link';
    onRender();
    setTimeout(() => {
      if (state.qrCopyFeedback === 'link') {
        state.qrCopyFeedback = undefined;
        onRender();
      }
    }, 2500);
  } catch {}
}

export async function copySetupHash(state: AppState, onRender: () => void): Promise<void> {
  const payload = getCurrentClientPayload(state);
  const hash = `#setup=${payload}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(hash);
    }
    state.qrCopyFeedback = 'hash';
    onRender();
    setTimeout(() => {
      if (state.qrCopyFeedback === 'hash') {
        state.qrCopyFeedback = undefined;
        onRender();
      }
    }, 2500);
  } catch {}
}

export function handleQrModalClick(state: AppState, target: HTMLElement, onRender: () => void): boolean {
  if (target.closest('#btn-show-qr') || target.closest('#btn-sidebar-qr')) {
    openQrModal(state, onRender);
    return true;
  }
  if (target.closest('#btn-close-qr') || target.id === 'qr-modal') {
    closeQrModal(state, onRender);
    return true;
  }
  if (target.closest('#qr-tab-gh')) {
    selectQrTab(state, 'gh_pages', onRender);
    return true;
  }
  if (target.closest('#qr-tab-lan')) {
    selectQrTab(state, 'lan', onRender);
    return true;
  }
  if (target.closest('#qr-tab-dl')) {
    selectQrTab(state, 'download', onRender);
    return true;
  }
  if (target.closest('#btn-copy-qr-link')) {
    void copyQrLink(state, onRender);
    return true;
  }
  if (target.closest('#btn-copy-setup-hash')) {
    void copySetupHash(state, onRender);
    return true;
  }
  return false;
}
