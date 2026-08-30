import type { AppState } from './types';
import {
  buildApiUrl,
  hasLiveServer,
  getTailscaleUrl,
  setTailscaleUrl,
  getDefaultLanUrl,
  setDefaultLanUrl,
  getCustomConnections,
  getCustomServerIp,
} from './authStore';

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
