import type { AppState } from '../types';
import { getServerBaseUrl, isStaticDeployment } from '../authStore';

export interface ConnectionEndpointInfo {
  ip: string;
  connectionType: 'LAN' | 'Tailscale' | '';
  isTailscale: boolean;
  fullUrl?: string;
  displayText: string;
}

export function detectIsTailscale(hostOrIp: string): boolean {
  if (!hostOrIp) return false;
  const clean = hostOrIp.toLowerCase().trim();
  if (clean.startsWith('100.')) return true;
  if (clean.includes('tailscale') || clean.endsWith('.ts.net')) return true;
  return false;
}

export function extractHostFromUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    return parsed.hostname;
  } catch {
    const match = rawUrl.match(/^(?:https?:\/\/)?([^:/#?]+)/i);
    return match ? match[1] : rawUrl;
  }
}

export function getConnectionEndpointInfo(state: AppState): ConnectionEndpointInfo {
  let host = '';
  let fullUrl = '';

  if (state.selectedLanIp) {
    fullUrl = state.selectedLanIp;
    host = extractHostFromUrl(state.selectedLanIp);
  } else {
    const serverBase = getServerBaseUrl();
    if (serverBase) {
      fullUrl = serverBase;
      host = extractHostFromUrl(serverBase);
    } else if (state.serverSetupInfo?.lanUrl) {
      fullUrl = state.serverSetupInfo.lanUrl;
      host = extractHostFromUrl(state.serverSetupInfo.lanUrl);
    } else if (typeof window !== 'undefined' && !isStaticDeployment() && window.location.hostname) {
      host = window.location.hostname;
      fullUrl = window.location.origin;
    }
  }

  if (!host && state.serverSetupInfo?.networks && state.serverSetupInfo.networks.length > 0) {
    const firstNet = state.serverSetupInfo.networks[0];
    host = firstNet.address;
    fullUrl = firstNet.url;
  }

  if (!host) {
    return { ip: '', connectionType: '', isTailscale: false, displayText: '' };
  }

  const matchingNet = state.serverSetupInfo?.networks?.find(
    (n) => n.address === host || extractHostFromUrl(n.url) === host
  );

  const isTailscale = matchingNet?.isTailscale ?? detectIsTailscale(host);
  const connectionType = isTailscale ? 'Tailscale' : 'LAN';
  const displayText = `${host} (${connectionType})`;

  return {
    ip: host,
    connectionType,
    isTailscale,
    fullUrl,
    displayText,
  };
}
