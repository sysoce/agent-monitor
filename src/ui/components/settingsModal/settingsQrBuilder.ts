import type { AppState } from '../../types';
import { encodeSetupPayload } from '../../../sync/payloadCodec';
import { loadCachedGistConfig } from '../../sessionPlanSync';
import { getStoredToken, getServerBaseUrl } from '../../authStore';
import type { BuildQrUrlOptions } from './types';

export function buildSettingsQrUrl(opts: BuildQrUrlOptions): string {
  const payload = opts.payload || '';
  if (opts.target === 'lan') {
    if (opts.selectedLanIp) {
      return `${opts.selectedLanIp}/#setup=${payload}`;
    }
    if (opts.customLanUrl) return opts.customLanUrl;
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200');
    return `${origin}/#setup=${payload}`;
  }
  if (opts.target === 'download') {
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200');
    return `${origin}/download#setup=${payload}`;
  }
  if (opts.customGhPagesUrl) return opts.customGhPagesUrl;
  return `https://sysoce.github.io/agent-monitor/#setup=${payload}`;
}

export function getCurrentClientPayload(state: AppState): string {
  if (state.serverSetupInfo?.setupPayload && !state.selectedLanIp) return state.serverSetupInfo.setupPayload;
  const cfg = loadCachedGistConfig();
  const token = getStoredToken();
  const serverUrl = state.selectedLanIp || getServerBaseUrl() || (typeof window !== 'undefined' && window.location.port === '4200' ? window.location.origin : undefined);
  return encodeSetupPayload({
    gistId: cfg?.gistId || '',
    token: cfg?.token || '',
    password: token || '',
    serverUrl: serverUrl || undefined,
  });
}
