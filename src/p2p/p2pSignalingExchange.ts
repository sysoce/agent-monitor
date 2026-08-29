import type { P2PSignalMessage } from './types';
import type { GistSyncConfig } from '../sync/types';
import { buildGistHeaders } from '../sync/gistHttp';

export async function postSignalToLan(baseUrl: string, signal: P2PSignalMessage): Promise<boolean> {
  try {
    const url = new URL('/api/p2p/signal', baseUrl).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSignalsFromLan(baseUrl: string, recipientId?: string): Promise<P2PSignalMessage[]> {
  try {
    const url = new URL('/api/p2p/signal', baseUrl);
    if (recipientId) url.searchParams.set('recipientId', recipientId);
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok: boolean; signals?: P2PSignalMessage[] };
    return Array.isArray(data.signals) ? data.signals : [];
  } catch {
    return [];
  }
}

export async function postSignalToGist(
  config: GistSyncConfig,
  signal: P2PSignalMessage,
  baseUrl = 'https://api.github.com'
): Promise<boolean> {
  try {
    const existing = await fetchSignalsFromGist(config, baseUrl);
    const now = Date.now();
    const recent = existing.filter((s) => now - (s.timestamp || 0) < 45_000);
    recent.push(signal);

    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/gists/${config.gistId}`, {
      method: 'PATCH',
      headers: buildGistHeaders(config.token, undefined, true),
      body: JSON.stringify({
        files: {
          'signal.json': {
            content: JSON.stringify({ signals: recent, updatedAt: now }),
          },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSignalsFromGist(
  config: GistSyncConfig,
  baseUrl = 'https://api.github.com'
): Promise<P2PSignalMessage[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/gists/${config.gistId}`, {
      method: 'GET',
      headers: buildGistHeaders(config.token, undefined, false),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { files?: Record<string, { content?: string }> };
    const content = json.files?.['signal.json']?.content;
    if (!content) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.signals) ? parsed.signals : [];
  } catch {
    return [];
  }
}
