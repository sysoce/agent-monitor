import type { AppState } from '../../types';
import { encodeSetupPayload } from '../../../sync/payloadCodec';
import { loadCachedGistConfig } from '../../sessionPlanSync';
import { getStoredToken } from '../../authStore';

export type QrTarget = 'gh_pages' | 'lan' | 'download';

export interface BuildQrUrlOptions {
  target: QrTarget;
  payload?: string;
  origin?: string;
  customGhPagesUrl?: string;
  customLanUrl?: string;
  selectedLanIp?: string;
}

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
  if (state.serverSetupInfo?.setupPayload) return state.serverSetupInfo.setupPayload;
  const cfg = loadCachedGistConfig();
  const token = getStoredToken();
  return encodeSetupPayload({
    gistId: cfg?.gistId || '',
    token: cfg?.token || '',
    password: token || '',
  });
}
