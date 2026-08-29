import { decodeSetupPayload } from '../sync/payloadCodec';
import { setStoredToken, setServerBaseUrl } from './authStore';

export interface ParsedMobileConfig {
  gistId?: string;
  token?: string;
  password?: string;
  serverUrl?: string;
  autoFallback?: boolean;
}

export function parseUrlConfig(rawInput: string): ParsedMobileConfig | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const hash = rawInput.includes('#') ? rawInput.slice(rawInput.indexOf('#') + 1) : rawInput.includes('?') ? rawInput.slice(rawInput.indexOf('?') + 1) : rawInput.trim();

  if (hash.startsWith('setup=')) {
    const payload = hash.slice(6).split('&')[0];
    const decoded = decodeSetupPayload(payload);
    if (decoded?.gistId || decoded?.token || decoded?.serverUrl) {
      return { gistId: decoded.gistId, token: decoded.token, password: decoded.password, serverUrl: decoded.serverUrl };
    }
  }

  const directDecoded = decodeSetupPayload(hash);
  if (directDecoded?.gistId || directDecoded?.token || directDecoded?.serverUrl) {
    return { gistId: directDecoded.gistId, token: directDecoded.token, password: directDecoded.password, serverUrl: directDecoded.serverUrl };
  }

  const params = new URLSearchParams(hash);
  const gistId = params.get('gistId') || params.get('g') || undefined;
  const token = params.get('token') || params.get('t') || undefined;
  const password = params.get('password') || params.get('p') || undefined;
  const serverUrl = params.get('server') || params.get('serverUrl') || params.get('s') || undefined;
  const fbParam = params.get('fallback') ?? params.get('autoFallback');
  const autoFallback = fbParam !== null ? (fbParam !== '0' && fbParam !== 'false') : undefined;

  if (gistId || token || serverUrl || autoFallback !== undefined) {
    return { gistId, token, password, serverUrl, autoFallback };
  }

  return null;
}

export function applyConfigToStorage(
  config: ParsedMobileConfig,
  storage: Storage = typeof localStorage !== 'undefined' ? localStorage : ({} as Storage)
): boolean {
  if (!config.gistId && !config.token && !config.serverUrl && config.autoFallback === undefined) return false;
  try {
    if (config.autoFallback !== undefined) {
      storage.setItem('agent_auto_fallback', String(config.autoFallback));
    }
    if (config.serverUrl) {
      storage.setItem('agent_server_url', config.serverUrl);
      setServerBaseUrl(config.serverUrl);
    }
    if (config.gistId && config.token) {
      const gistSync = { gistId: config.gistId, token: config.token };
      storage.setItem('agent_gist_sync', JSON.stringify(gistSync));
      if (!config.serverUrl) storage.setItem('agent_sync_mode', 'git-backup');
    }
    if (config.serverUrl && !config.gistId) {
      storage.setItem('agent_sync_mode', 'live-sse');
    }
    if (config.password) {
      storage.setItem('agent_monitor_token', config.password);
      setStoredToken(config.password);
    }
    return true;
  } catch {
    return false;
  }
}

export function checkAndApplyUrlConfig(): {
  imported: boolean;
  gistConfig?: { token: string; gistId: string };
  password?: string;
  serverUrl?: string;
} {
  if (typeof window === 'undefined') return { imported: false };
  const raw = window.location.hash || window.location.search;
  const parsed = parseUrlConfig(raw);
  if (!parsed || (!parsed.gistId && !parsed.token && !parsed.serverUrl)) return { imported: false };

  const ok = applyConfigToStorage(parsed);
  if (ok) {
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    } catch {}
    return {
      imported: true,
      gistConfig: parsed.gistId && parsed.token ? { gistId: parsed.gistId, token: parsed.token } : undefined,
      password: parsed.password,
      serverUrl: parsed.serverUrl,
    };
  }

  return { imported: false };
}
