import type { AppState } from './types';
import {
  setServerBaseUrl,
  clearServerBaseUrl,
  getTailscaleUrl,
  getDefaultLanUrl,
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
} from './authStore';
import { extractHostFromUrl } from './components/connectionEndpointInfo';
import { fetchServerSetupInfo } from './settingsSetupFetcher';

export { fetchServerSetupInfo };

export function selectActiveConnection(
  state: AppState,
  url: string,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  const clean = url.trim().replace(/\/+$/, '');
  state.selectedLanIp = clean;
  state.qrModalTarget = 'lan';
  setServerBaseUrl(clean);
  state.settingsCopyFeedback = `switched-${extractHostFromUrl(clean)}`;
  onRender();
  if (onSwitchConnection) {
    void onSwitchConnection(clean);
  }
  void fetchServerSetupInfo(state, onRender, true);
}

export function selectLanIp(
  state: AppState,
  ipUrl: string,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  selectActiveConnection(state, ipUrl, onRender, onSwitchConnection);
}

export function switchToTailscale(
  state: AppState,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  const tsUrl = state.tailscaleUrl || getTailscaleUrl() || state.serverSetupInfo?.networks?.find((n) => n.isTailscale)?.url;
  if (tsUrl) selectActiveConnection(state, tsUrl, onRender, onSwitchConnection);
}

export function switchToSetIp(
  state: AppState,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  const customIp = state.customServerIp || getCustomServerIp();
  const rawList = state.customConnections || getCustomConnections();
  const firstUrl = rawList[0] ? (typeof rawList[0] === 'string' ? rawList[0] : rawList[0].url) : '';
  const target = customIp || firstUrl || state.defaultLanUrl || getDefaultLanUrl();
  if (target) selectActiveConnection(state, target, onRender, onSwitchConnection);
}

export function addNewCustomConnection(
  state: AppState,
  rawUrl: string,
  name?: string | (() => void),
  tag?: string | (() => void) | ((url: string) => void | Promise<void>),
  onRender?: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  const renderFn = typeof name === 'function' ? name : (typeof tag === 'function' ? (tag as () => void) : onRender);
  const switchFn = typeof tag === 'function' && tag !== renderFn ? (tag as (url: string) => void | Promise<void>) : onSwitchConnection;
  const nameStr = typeof name === 'string' ? name : undefined;
  const tagStr = typeof tag === 'string' ? tag : undefined;

  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (!clean) return;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  const updated = addCustomConnection(clean, nameStr, tagStr);
  state.customConnections = updated;
  state.customServerIp = clean;
  setCustomServerIp(clean);
  selectActiveConnection(state, clean, renderFn || (() => {}), switchFn);
  state.settingsCopyFeedback = 'server-saved';
  renderFn?.();
}

export function deleteCustomConnection(
  state: AppState,
  url: string,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  const clean = url.trim().replace(/\/+$/, '');
  const updated = removeCustomConnection(clean);
  state.customConnections = updated;
  if (state.customServerIp === clean) {
    state.customServerIp = undefined;
    clearCustomServerIp();
  }
  if (state.selectedLanIp === clean) {
    const firstCustUrl = updated[0]?.url || '';
    const fallback = state.defaultLanUrl || getDefaultLanUrl() || state.tailscaleUrl || getTailscaleUrl() || firstCustUrl;
    if (fallback) {
      selectActiveConnection(state, fallback, onRender, onSwitchConnection);
    } else {
      clearServerBaseUrl();
      state.selectedLanIp = undefined;
    }
  }
  state.settingsCopyFeedback = 'connection-deleted';
  onRender();
}

export function saveCustomServerUrl(
  state: AppState,
  url: string,
  onRender: () => void,
  onSwitchConnection?: (url: string) => void | Promise<void>
): void {
  if (url.trim()) {
    addNewCustomConnection(state, url, onRender, onSwitchConnection);
  } else {
    clearServerBaseUrl();
    clearCustomServerIp();
    state.customServerIp = undefined;
    state.selectedLanIp = undefined;
    onRender();
  }
}
