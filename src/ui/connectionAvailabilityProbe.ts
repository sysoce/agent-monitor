import type { AppState } from './types';
import { getDefaultLanUrl, getTailscaleUrl, getCustomConnections } from './networkStore';

export async function probeConnectionAvailability(url: string, timeoutMs = 1500): Promise<boolean> {
  const clean = url?.trim().replace(/\/+$/, '');
  if (!clean || !clean.startsWith('http')) return false;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const probeUrl = `${clean}/api/version`;
    const res = await fetch(probeUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
      cache: 'no-store',
      mode: 'cors',
    });
    return res.ok || res.status === 401 || res.status === 403;
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function collectAllConnectionUrls(state: AppState): string[] {
  const urls = new Set<string>();
  const defaultLan = state.defaultLanUrl || getDefaultLanUrl();
  if (defaultLan) urls.add(defaultLan.trim().replace(/\/+$/, ''));

  const tailscale = state.tailscaleUrl || getTailscaleUrl();
  if (tailscale) urls.add(tailscale.trim().replace(/\/+$/, ''));

  const customList = state.customConnections || getCustomConnections();
  for (const item of customList) {
    const raw = typeof item === 'string' ? item : item?.url;
    if (raw) urls.add(raw.trim().replace(/\/+$/, ''));
  }

  const networks = state.serverSetupInfo?.networks || [];
  for (const net of networks) {
    if (net.url) urls.add(net.url.trim().replace(/\/+$/, ''));
  }

  return Array.from(urls).filter(Boolean);
}

export async function probeAllConnections(
  state: AppState,
  onRender: () => void,
  timeoutMs = 1500
): Promise<void> {
  const urls = collectAllConnectionUrls(state);
  if (urls.length === 0) return;

  if (!state.connectionAvailability) {
    state.connectionAvailability = {};
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const isAvailable = await probeConnectionAvailability(url, timeoutMs);
      return { url, isAvailable };
    })
  );

  let hasChanged = false;
  for (const { url, isAvailable } of results) {
    if (state.connectionAvailability[url] !== isAvailable) {
      state.connectionAvailability[url] = isAvailable;
      hasChanged = true;
    }
  }

  if (hasChanged) {
    onRender();
  }
}
