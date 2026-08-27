import type { GistSyncConfig } from './types';

export function encodeSetupPayload(config: Partial<GistSyncConfig>): string {
  const payload = JSON.stringify({
    g: config.gistId || '',
    t: config.token || '',
    p: config.password || '',
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
      gistId?: string;
      token?: string;
      password?: string;
    };
    const gistId = parsed.g || parsed.gistId;
    const token = parsed.t || parsed.token;
    const password = parsed.p || parsed.password;
    if (!gistId && !token) return null;
    return {
      gistId: gistId || undefined,
      token: token || undefined,
      password: password || undefined,
    };
  } catch {
    return null;
  }
}
