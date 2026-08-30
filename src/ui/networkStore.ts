const SERVER_KEY = 'agent_server_url';
const CUSTOM_IP_KEY = 'agent_custom_server_ip';
const TAILSCALE_KEY = 'agent_tailscale_url';
const DEFAULT_LAN_KEY = 'agent_default_lan_url';
const CUSTOM_CONNECTIONS_KEY = 'agent_custom_connections';

declare const __DEFAULT_SERVER_URL__: string | undefined;

function getCleanStorage(key: string): string {
  try {
    const val = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (val && val !== 'none') return val.replace(/\/+$/, '');
  } catch {}
  return '';
}

function setCleanStorage(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const clean = val.trim().replace(/\/+$/, '');
      localStorage.setItem(key, clean || 'none');
    }
  } catch {}
}

export function getDefaultServerUrl(): string {
  try {
    if (typeof __DEFAULT_SERVER_URL__ !== 'undefined' && __DEFAULT_SERVER_URL__) {
      return __DEFAULT_SERVER_URL__;
    }
  } catch {}
  return '';
}

export function setServerBaseUrl(url: string): void { setCleanStorage(SERVER_KEY, url); }
export function clearServerBaseUrl(): void { setCleanStorage(SERVER_KEY, 'none'); }
export function getCustomServerIp(): string { return getCleanStorage(CUSTOM_IP_KEY); }
export function setCustomServerIp(url: string): void { setCleanStorage(CUSTOM_IP_KEY, url); }
export function clearCustomServerIp(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(CUSTOM_IP_KEY); } catch {}
}
export function getTailscaleUrl(): string { return getCleanStorage(TAILSCALE_KEY); }
export function setTailscaleUrl(url: string): void { setCleanStorage(TAILSCALE_KEY, url); }
export function clearTailscaleUrl(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(TAILSCALE_KEY); } catch {}
}
export function getDefaultLanUrl(): string {
  const stored = getCleanStorage(DEFAULT_LAN_KEY);
  return stored || getDefaultServerUrl();
}
export function setDefaultLanUrl(url: string): void { setCleanStorage(DEFAULT_LAN_KEY, url); }
export function clearDefaultLanUrl(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(DEFAULT_LAN_KEY); } catch {}
}

export function getCustomConnections(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_CONNECTIONS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const legacy = getCustomServerIp();
    if (legacy && !list.includes(legacy)) list.unshift(legacy);
    return list.filter(Boolean);
  } catch {
    return [];
  }
}

export function addCustomConnection(url: string): string[] {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean || typeof localStorage === 'undefined') return getCustomConnections();
    const current = getCustomConnections().filter((u) => u !== clean);
    current.push(clean);
    localStorage.setItem(CUSTOM_CONNECTIONS_KEY, JSON.stringify(current));
    return current;
  } catch {
    return getCustomConnections();
  }
}

export function removeCustomConnection(url: string): string[] {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (typeof localStorage === 'undefined') return [];
    const current = getCustomConnections().filter((u) => u !== clean);
    localStorage.setItem(CUSTOM_CONNECTIONS_KEY, JSON.stringify(current));
    if (getCustomServerIp() === clean) clearCustomServerIp();
    return current;
  } catch {
    return getCustomConnections();
  }
}
