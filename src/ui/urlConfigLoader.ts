import { decodeSetupPayload } from '../sync/payloadCodec';
import { setStoredToken } from './authStore';

export interface ParsedMobileConfig {
  gistId?: string;
  token?: string;
  password?: string;
}

export function parseUrlConfig(rawInput: string): ParsedMobileConfig | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const hash = rawInput.includes('#') ? rawInput.slice(rawInput.indexOf('#') + 1) : rawInput.includes('?') ? rawInput.slice(rawInput.indexOf('?') + 1) : rawInput.trim();

  if (hash.startsWith('setup=')) {
    const payload = hash.slice(6).split('&')[0];
    const decoded = decodeSetupPayload(payload);
    if (decoded?.gistId || decoded?.token) {
      return { gistId: decoded.gistId, token: decoded.token, password: decoded.password };
    }
  }

  const directDecoded = decodeSetupPayload(hash);
  if (directDecoded?.gistId || directDecoded?.token) {
    return { gistId: directDecoded.gistId, token: directDecoded.token, password: directDecoded.password };
  }

  const params = new URLSearchParams(hash);
  const gistId = params.get('gistId') || params.get('g') || undefined;
  const token = params.get('token') || params.get('t') || undefined;
  const password = params.get('password') || params.get('p') || undefined;

  if (gistId || token) {
    return { gistId, token, password };
  }

  return null;
}

export function applyConfigToStorage(
  config: ParsedMobileConfig,
  storage: Storage = typeof localStorage !== 'undefined' ? localStorage : ({} as Storage)
): boolean {
  if (!config.gistId && !config.token) return false;
  try {
    const gistSync = { gistId: config.gistId || '', token: config.token || '' };
    storage.setItem('agent_gist_sync', JSON.stringify(gistSync));
    storage.setItem('agent_sync_mode', 'git-backup');
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
} {
  if (typeof window === 'undefined') return { imported: false };
  const raw = window.location.hash || window.location.search;
  const parsed = parseUrlConfig(raw);
  if (!parsed || (!parsed.gistId && !parsed.token)) return { imported: false };

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
    };
  }

  return { imported: false };
}
