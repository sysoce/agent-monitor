const TOKEN_KEY = 'agent_monitor_token';
const SERVER_KEY = 'agent_server_url';

export function getStoredToken(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) {
      setStoredToken(fromUrl);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      return fromUrl;
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

declare const __DEFAULT_SERVER_URL__: string | undefined;

export function getDefaultServerUrl(): string {
  try {
    if (typeof __DEFAULT_SERVER_URL__ !== 'undefined' && __DEFAULT_SERVER_URL__) {
      return __DEFAULT_SERVER_URL__;
    }
  } catch {}
  return '';
}

export function getServerBaseUrl(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('server');
    if (fromUrl) {
      const clean = fromUrl.replace(/\/+$/, '');
      setServerBaseUrl(clean);
      return clean;
    }
    const stored = localStorage.getItem(SERVER_KEY);
    if (stored === 'none') {
      return '';
    }
    if (stored) return stored.replace(/\/+$/, '');
    const def = getDefaultServerUrl();
    if (def) return def.replace(/\/+$/, '');
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
  if (isStaticDeployment()) {
    return Boolean(base);
  }
  return true;
}

export function setServerBaseUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem(SERVER_KEY, clean || 'none');
  } catch {}
}

export function clearServerBaseUrl(): void {
  try {
    localStorage.setItem(SERVER_KEY, 'none');
  } catch {}
}

export function buildApiUrl(pathname: string): string {
  const base = getServerBaseUrl();
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return base ? `${base}${normalized}` : normalized;
}

