import type { AppState } from './types';
import {
  buildApiUrl,
  setServerBaseUrl,
  clearServerBaseUrl,
  hasLiveServer,
  getTailscaleUrl,
  setTailscaleUrl,
  getDefaultLanUrl,
  setDefaultLanUrl,
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
} from './authStore';
import { detectIsTailscale, extractHostFromUrl } from './components/connectionEndpointInfo';

export async function fetchServerSetupInfo(state: AppState, onRender: () => void, force = false): Promise<void> {
  if (!state.defaultLanUrl) state.defaultLanUrl = getDefaultLanUrl() || undefined;
  if (!state.tailscaleUrl) state.tailscaleUrl = getTailscaleUrl() || undefined;
  if (!state.customConnections) state.customConnections = getCustomConnections();
  if (!state.customServerIp) state.customServerIp = getCustomServerIp() || undefined;
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
      const lanNet = data.networks?.find((n: any) => !n.isTailscale) || (data.lanUrl ? { url: data.lanUrl.split('/#')[0] } : undefined);
      if (lanNet?.url) {
        state.defaultLanUrl = lanNet.url;
        setDefaultLanUrl(lanNet.url);
      }
      onRender();
    }
  } catch {}
}

export function selectActiveConnection(state: AppState, url: string, onRender: () => void): void {
  const clean = url.trim().replace(/\/+$/, '');
  state.selectedLanIp = clean;
  state.qrModalTarget = 'lan';
  setServerBaseUrl(clean);
  state.settingsCopyFeedback = `switched-${extractHostFromUrl(clean)}`;
  onRender();
  void fetchServerSetupInfo(state, onRender, true);
}

export function selectLanIp(state: AppState, ipUrl: string, onRender: () => void): void {
  selectActiveConnection(state, ipUrl, onRender);
}

export function switchToTailscale(state: AppState, onRender: () => void): void {
  const tsUrl = state.tailscaleUrl || getTailscaleUrl() || state.serverSetupInfo?.networks?.find((n) => n.isTailscale)?.url;
  if (tsUrl) selectActiveConnection(state, tsUrl, onRender);
}

export function switchToSetIp(state: AppState, onRender: () => void): void {
  const customIp = state.customServerIp || getCustomServerIp();
  const customList = state.customConnections || getCustomConnections();
  const target = customIp || customList[0] || state.defaultLanUrl || getDefaultLanUrl();
  if (target) selectActiveConnection(state, target, onRender);
}

export function addNewCustomConnection(state: AppState, rawUrl: string, onRender: () => void): void {
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (!clean) return;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  const updated = addCustomConnection(clean);
  state.customConnections = updated;
  state.customServerIp = clean;
  setCustomServerIp(clean);
  selectActiveConnection(state, clean, onRender);
  state.settingsCopyFeedback = 'server-saved';
  onRender();
}

export function deleteCustomConnection(state: AppState, url: string, onRender: () => void): void {
  const clean = url.trim().replace(/\/+$/, '');
  const updated = removeCustomConnection(clean);
  state.customConnections = updated;
  if (state.customServerIp === clean) {
    state.customServerIp = undefined;
    clearCustomServerIp();
  }
  if (state.selectedLanIp === clean) {
    const fallback = state.defaultLanUrl || getDefaultLanUrl() || state.tailscaleUrl || getTailscaleUrl() || updated[0] || '';
    if (fallback) {
      selectActiveConnection(state, fallback, onRender);
    } else {
      clearServerBaseUrl();
      state.selectedLanIp = undefined;
    }
  }
  state.settingsCopyFeedback = 'connection-deleted';
  onRender();
}

export function saveCustomServerUrl(state: AppState, url: string, onRender: () => void): void {
  if (url.trim()) {
    addNewCustomConnection(state, url, onRender);
  } else {
    clearServerBaseUrl();
    clearCustomServerIp();
    state.customServerIp = undefined;
    state.selectedLanIp = undefined;
    onRender();
  }
}
