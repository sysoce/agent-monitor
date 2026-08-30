import type { AppState } from './types';
import {
  buildApiUrl,
  setServerBaseUrl,
  clearServerBaseUrl,
  hasLiveServer,
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
  getTailscaleUrl,
  setTailscaleUrl,
} from './authStore';
import { detectIsTailscale, extractHostFromUrl } from './components/connectionEndpointInfo';

export async function fetchServerSetupInfo(state: AppState, onRender: () => void, force = false): Promise<void> {
  if (!state.customServerIp) state.customServerIp = getCustomServerIp() || undefined;
  if (!state.tailscaleUrl) state.tailscaleUrl = getTailscaleUrl() || undefined;
  if (!force && state.serverSetupInfo?.networks && state.serverSetupInfo.networks.length > 0) return;
  if (!hasLiveServer()) return;
  try {
    const res = await fetch(buildApiUrl('/api/setup-info'));
    if (res.ok) {
      const data = await res.json();
      state.serverSetupInfo = data;
      const tsNet = data.networks?.find((n: any) => n.isTailscale);
      if (tsNet) {
        state.tailscaleUrl = tsNet.url;
        setTailscaleUrl(tsNet.url);
      }
      onRender();
    }
  } catch {}
}

export function selectLanIp(state: AppState, ipUrl: string, onRender: () => void): void {
  state.selectedLanIp = ipUrl;
  state.qrModalTarget = 'lan';
  setServerBaseUrl(ipUrl);
  if (detectIsTailscale(extractHostFromUrl(ipUrl))) {
    state.tailscaleUrl = ipUrl;
    setTailscaleUrl(ipUrl);
  } else {
    state.customServerIp = ipUrl;
    setCustomServerIp(ipUrl);
  }
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
}

export function switchToTailscale(state: AppState, onRender: () => void): void {
  const tsUrl = state.tailscaleUrl || getTailscaleUrl() || state.serverSetupInfo?.networks?.find((n) => n.isTailscale)?.url;
  if (!tsUrl) return;
  state.selectedLanIp = tsUrl;
  state.tailscaleUrl = tsUrl;
  state.qrModalTarget = 'lan';
  setServerBaseUrl(tsUrl);
  setTailscaleUrl(tsUrl);
  state.settingsCopyFeedback = 'switched-tailscale';
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
}

export function switchToSetIp(state: AppState, onRender: () => void): void {
  const customIp = state.customServerIp || getCustomServerIp() || state.serverSetupInfo?.lanUrl?.split('/#')[0];
  if (!customIp) return;
  state.selectedLanIp = customIp;
  state.customServerIp = customIp;
  state.qrModalTarget = 'lan';
  setServerBaseUrl(customIp);
  state.settingsCopyFeedback = 'switched-set-ip';
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
}

export function saveCustomServerUrl(state: AppState, url: string, onRender: () => void): void {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) {
    setCustomServerIp(clean);
    setServerBaseUrl(clean);
    state.customServerIp = clean;
    state.selectedLanIp = clean;
  } else {
    clearCustomServerIp();
    clearServerBaseUrl();
    state.customServerIp = undefined;
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
