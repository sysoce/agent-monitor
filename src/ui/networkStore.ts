const SERVER_KEY = 'agent_server_url';
const CUSTOM_IP_KEY = 'agent_custom_server_ip';
const TAILSCALE_KEY = 'agent_tailscale_url';
const DEFAULT_LAN_KEY = 'agent_default_lan_url';
const CUSTOM_CONNECTIONS_KEY = 'agent_custom_connections';

declare const __DEFAULT_SERVER_URL__: string | undefined;
declare const __DEFAULT_LAN_URL__: string | undefined;
declare const __DEFAULT_TAILSCALE_URL__: string | undefined;

export const DEFAULT_MACHINE_LAN_URL = 'http://192.168.1.111:4200';
export const DEFAULT_MACHINE_TAILSCALE_URL = 'http://100.74.73.50:4200';

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
export function getTailscaleUrl(): string {
  const stored = getCleanStorage(TAILSCALE_KEY);
  if (stored) return stored;
  try {
    if (typeof __DEFAULT_TAILSCALE_URL__ !== 'undefined' && __DEFAULT_TAILSCALE_URL__) {
      return __DEFAULT_TAILSCALE_URL__;
    }
  } catch {}
  return DEFAULT_MACHINE_TAILSCALE_URL;
}
export function setTailscaleUrl(url: string): void { setCleanStorage(TAILSCALE_KEY, url); }
export function clearTailscaleUrl(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(TAILSCALE_KEY); } catch {}
}
export function getDefaultLanUrl(): string {
  const stored = getCleanStorage(DEFAULT_LAN_KEY);
  if (stored) return stored;
  try {
    if (typeof __DEFAULT_LAN_URL__ !== 'undefined' && __DEFAULT_LAN_URL__) {
      return __DEFAULT_LAN_URL__;
    }
  } catch {}
  const defServer = getDefaultServerUrl();
  return defServer || DEFAULT_MACHINE_LAN_URL;
}
export function setDefaultLanUrl(url: string): void { setCleanStorage(DEFAULT_LAN_KEY, url); }
export function clearDefaultLanUrl(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(DEFAULT_LAN_KEY); } catch {}
}

export interface CustomConnectionRecord {
  url: string;
  name?: string;
  tag?: string;
}

export function getCustomConnections(): CustomConnectionRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_CONNECTIONS_KEY);
    const rawList: Array<string | CustomConnectionRecord> = raw ? JSON.parse(raw) : [];
    const list: CustomConnectionRecord[] = rawList.map((item) =>
      typeof item === 'string' ? { url: item } : item
    ).filter((item) => Boolean(item && item.url));
    const legacy = getCustomServerIp();
    if (legacy && !list.some((c) => c.url === legacy)) {
      list.unshift({ url: legacy });
    }
    return list;
  } catch {
    return [];
  }
}

export function addCustomConnection(url: string, name?: string, tag?: string): CustomConnectionRecord[] {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean || typeof localStorage === 'undefined') return getCustomConnections();
    const current = getCustomConnections().filter((c) => c.url.toLowerCase() !== clean.toLowerCase());
    const rec: CustomConnectionRecord = { url: clean };
    if (name?.trim()) rec.name = name.trim();
    if (tag?.trim()) rec.tag = tag.trim();
    current.push(rec);
    localStorage.setItem(CUSTOM_CONNECTIONS_KEY, JSON.stringify(current));
    return current;
  } catch {
    return getCustomConnections();
  }
}

export function removeCustomConnection(url: string): CustomConnectionRecord[] {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean || typeof localStorage === 'undefined') return [];
    const legacy = getCustomServerIp();
    if (legacy && legacy.trim().replace(/\/+$/, '').toLowerCase() === clean.toLowerCase()) {
      clearCustomServerIp();
    }
    const raw = localStorage.getItem(CUSTOM_CONNECTIONS_KEY);
    const rawList: Array<string | CustomConnectionRecord> = raw ? JSON.parse(raw) : [];
    const current = rawList
      .map((item) => (typeof item === 'string' ? { url: item } : item))
      .filter((item) => Boolean(item && item.url && item.url.trim().replace(/\/+$/, '').toLowerCase() !== clean.toLowerCase()));
    localStorage.setItem(CUSTOM_CONNECTIONS_KEY, JSON.stringify(current));
    return current;
  } catch {
    return getCustomConnections();
  }
}

