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

export function getServerBaseUrl(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('server');
    if (fromUrl) {
      const clean = fromUrl.replace(/\/+$/, '');
      setServerBaseUrl(clean);
      return clean;
    }
    const stored = localStorage.getItem(SERVER_KEY);
    if (stored) return stored.replace(/\/+$/, '');
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

export function hasLiveServer(): boolean {
  return Boolean(getServerBaseUrl()) || !isStaticDeployment();
}

export function setServerBaseUrl(url: string): void {
  try {
    localStorage.setItem(SERVER_KEY, url.replace(/\/+$/, ''));
  } catch {}
}

export function clearServerBaseUrl(): void {
  try {
    localStorage.removeItem(SERVER_KEY);
  } catch {}
}

export function buildApiUrl(pathname: string): string {
  const base = getServerBaseUrl();
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return base ? `${base}${normalized}` : normalized;
}
