import type { GistSyncConfig } from './types';
import { decryptSyncData } from './syncCrypto';

export interface GistValidationResult {
  ok: boolean;
  error?: string;
}

export async function validateGistCredentials(
  config: Partial<GistSyncConfig>,
  baseUrl = 'https://api.github.com'
): Promise<GistValidationResult> {
  const token = config.token?.trim();
  const gistId = config.gistId?.trim();
  const password = config.password?.trim();

  if (!token) return { ok: false, error: 'GitHub token is required.' };
  if (!gistId) return { ok: false, error: 'Gist ID is required.' };

  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (typeof window === 'undefined') headers['User-Agent'] = 'AgentMonitor-Sync';

    const res = await fetch(`${cleanBase}/gists/${encodeURIComponent(gistId)}`, { headers });

    if (res.status === 401 || res.status === 403) {
      let msg = 'GitHub Token is invalid, expired, or lacking gist permissions.';
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) msg = `GitHub auth error: ${body.message}`;
      } catch {}
      return { ok: false, error: msg };
    }

    if (res.status === 404) {
      return { ok: false, error: `Gist ID "${gistId}" not found. Verify your Gist ID.` };
    }

    if (!res.ok) {
      return { ok: false, error: `GitHub API error (${res.status} ${res.statusText}).` };
    }

    const json = (await res.json()) as { files?: Record<string, { content?: string; raw_url?: string; truncated?: boolean }> };
    const syncFile = json.files?.['agent-sync.json'];
    let raw = syncFile?.content;

    if (syncFile?.truncated && syncFile?.raw_url) {
      try {
        const rawRes = await fetch(syncFile.raw_url, { headers: { Authorization: `Bearer ${token}` } });
        if (rawRes.ok) raw = await rawRes.text();
      } catch {}
    }

    if (raw && raw.startsWith('enc:')) {
      if (!password) {
        return { ok: false, error: 'Vault Password / PIN is required for this encrypted Gist.' };
      }
      try {
        decryptSyncData(raw, password);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `Incorrect Vault Password / PIN: ${msg}` };
      }
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Network connection error: ${msg}` };
  }
}
