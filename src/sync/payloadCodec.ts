import type { GistSyncConfig } from './types';

export function encodeSetupPayload(config: Partial<GistSyncConfig>): string {
  const payload = JSON.stringify({
    g: config.gistId || '',
    t: config.token || '',
    p: config.password || '',
    s: config.serverUrl || '',
  });
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(payload, 'utf8').toString('base64url');
  }
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSetupPayload(raw: string): Partial<GistSyncConfig> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    let jsonStr = '';
    const stdBase64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(stdBase64, 'base64').toString('utf8');
    } else {
      jsonStr = atob(stdBase64);
    }
    const parsed = JSON.parse(jsonStr) as {
      g?: string;
      t?: string;
      p?: string;
      s?: string;
      gistId?: string;
      token?: string;
      password?: string;
      serverUrl?: string;
    };
    const gistId = parsed.g || parsed.gistId;
    const token = parsed.t || parsed.token;
    const password = parsed.p || parsed.password;
    const serverUrl = parsed.s || parsed.serverUrl;
    if (!gistId && !token && !serverUrl && !password) return null;
    const res: Partial<GistSyncConfig> = {};
    if (gistId) res.gistId = gistId;
    if (token) res.token = token;
    if (password) res.password = password;
    if (serverUrl) res.serverUrl = serverUrl;
    return res;
  } catch {
    return null;
  }
}
