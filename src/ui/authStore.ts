const TOKEN_KEY = 'agent_monitor_token';
const SERVER_KEY = 'agent_server_url';

import {
  getDefaultServerUrl,
  setServerBaseUrl,
  clearServerBaseUrl,
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
  getTailscaleUrl,
  setTailscaleUrl,
  clearTailscaleUrl,
  getDefaultLanUrl,
  setDefaultLanUrl,
  clearDefaultLanUrl,
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
  type CustomConnectionRecord,
} from './networkStore';

export {
  getDefaultServerUrl,
  setServerBaseUrl,
  clearServerBaseUrl,
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
  getTailscaleUrl,
  setTailscaleUrl,
  clearTailscaleUrl,
  getDefaultLanUrl,
  setDefaultLanUrl,
  clearDefaultLanUrl,
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
  type CustomConnectionRecord,
} from './networkStore';

export function getStoredToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const fromUrl = new URLSearchParams(window.location.search).get('token');
      if (fromUrl) {
        setStoredToken(fromUrl);
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
        return fromUrl;
      }
    }
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredToken(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getServerBaseUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const fromUrl = new URLSearchParams(window.location.search).get('server');
      if (fromUrl) {
        const clean = fromUrl.replace(/\/+$/, '');
        setServerBaseUrl(clean);
        return clean;
      }
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SERVER_KEY) : null;
    if (stored === 'none') return '';
    if (stored) return stored.replace(/\/+$/, '');
    if (isStaticDeployment()) {
      const def = getDefaultServerUrl();
      if (def) return def.replace(/\/+$/, '');
    }
  } catch {}
  return '';
}

export function isStaticDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'file:' ||
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('.pages.dev') ||
    window.location.hostname.endsWith('.vercel.app') ||
    window.location.hostname.endsWith('.netlify.app');
}

export function isMixedContentBlocked(url?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('ws://');
}

export function hasLiveServer(): boolean {
  const base = getServerBaseUrl();
  if (isStaticDeployment()) return Boolean(base);
  return true;
}

export function buildApiUrl(pathname: string): string {
  const base = getServerBaseUrl();
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return base ? `${base}${normalized}` : normalized;
}
