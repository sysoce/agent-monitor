import type { GistSyncConfig, SyncGistPayload, SyncInboxMessage, SyncOutboxState } from './types';
import { encryptSyncData, decryptSyncData } from './syncCrypto';
import type { SessionSummary } from '../server/types';

export class GistClient {
  private readonly baseUrl: string;
  private rateLimitReset = 0;
  private isRateLimited = false;
  private cachedPayload: SyncGistPayload | null = null;

  constructor(private readonly config: GistSyncConfig, baseUrl = 'https://api.github.com') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isBlockedByRateLimit(): boolean {
    if (this.isRateLimited && Date.now() < this.rateLimitReset) return true;
    this.isRateLimited = false;
    return false;
  }

  private updateRateLimit(res: Response): void {
    const retryAfter = res.headers.get('retry-after');
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');

    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10) || 60;
      this.rateLimitReset = Date.now() + seconds * 1000;
      this.isRateLimited = true;
      return;
    }

    if (res.status === 403 || res.status === 429) {
      if (remaining && parseInt(remaining, 10) === 0 && reset) {
        this.rateLimitReset = parseInt(reset, 10) * 1000;
      } else {
        this.rateLimitReset = Date.now() + 30_000;
      }
      this.isRateLimited = true;
    } else if (remaining && parseInt(remaining, 10) === 0 && reset) {
      this.rateLimitReset = parseInt(reset, 10) * 1000;
      this.isRateLimited = true;
    } else if (remaining && parseInt(remaining, 10) > 0) {
      this.isRateLimited = false;
    }
  }

  private headers(etag?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
    if (typeof window === 'undefined') {
      h['User-Agent'] = 'AgentMonitor-Sync';
    }
    if (etag) h['If-None-Match'] = etag;
    return h;
  }

  private async parseErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) return `${res.status} (${body.message})`;
    } catch {}
    return `${res.status} ${res.statusText}`.trim() || fallback;
  }

  async fetchSyncState(etag?: string): Promise<{ data: SyncGistPayload | null; etag?: string; notModified: boolean }> {
    if (this.isBlockedByRateLimit()) return { data: null, etag, notModified: true };
    const res = await fetch(`${this.baseUrl}/gists/${this.config.gistId}`, { headers: this.headers(etag) });
    this.updateRateLimit(res);

    if (res.status === 304) return { data: null, etag, notModified: true };
    if (!res.ok) throw new Error(`GitHub Gist API error: ${await this.parseErrorMessage(res, 'Gist error')}`);

    const newEtag = res.headers.get('etag') || undefined;
    const json = (await res.json()) as { files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }> };
    const fileObj = json.files?.['agent-sync.json'];
    let raw = fileObj?.content;
    if (fileObj?.truncated && fileObj?.raw_url) {
      try {
        const rawRes = await fetch(fileObj.raw_url, { headers: { Authorization: `Bearer ${this.config.token}`, 'User-Agent': 'AgentMonitor-Sync' } });
        if (rawRes.ok) raw = await rawRes.text();
      } catch {}
    }
    if (!raw) return { data: { inbox: [], sessions: [], version: 1, updatedAt: Date.now() }, etag: newEtag, notModified: false };

    try {
      const p = JSON.parse(decryptSyncData(raw, this.config.password)) as SyncGistPayload;
      const data: SyncGistPayload = {
        inbox: Array.isArray(p?.inbox) ? p.inbox : [], sessions: Array.isArray(p?.sessions) ? p.sessions : [],
        version: typeof p?.version === 'number' ? p.version : 1, updatedAt: typeof p?.updatedAt === 'number' ? p.updatedAt : Date.now(),
        sessionDetails: p?.sessionDetails && typeof p.sessionDetails === 'object' ? p.sessionDetails : {}, activeSession: p?.activeSession,
        appVersion: typeof p?.appVersion === 'string' ? p.appVersion : undefined,
      };
      this.cachedPayload = data;
      return { data, etag: newEtag, notModified: false };
    } catch {
      return { data: { inbox: [], sessions: [], version: 1, updatedAt: Date.now(), sessionDetails: {} }, etag: newEtag, notModified: false };
    }
  }

  async pushInboxMessage(msg: SyncInboxMessage): Promise<void> {
    const cur = this.cachedPayload || (await this.fetchSyncState()).data || { inbox: [], sessions: [], version: 1, updatedAt: Date.now() };
    if (!Array.isArray(cur.inbox)) cur.inbox = [];
    if (!cur.inbox.some((m) => m.id === msg.id)) cur.inbox.push(msg);
    cur.updatedAt = Date.now();
    await this.saveSyncPayload(cur);
  }

  async updateOutboxAndDrainInbox(
    outbox: SyncOutboxState,
    processedInboxIds: string[],
    sessions: SessionSummary[],
    sessionDetails?: Record<string, import('../server/types').SessionDetail>,
    existingPayload?: SyncGistPayload | null,
    appVersion?: string
  ): Promise<void> {
    const cur = existingPayload || this.cachedPayload || (await this.fetchSyncState()).data || { inbox: [], sessions: [], version: 1, updatedAt: Date.now() };
    cur.inbox = (cur.inbox || []).filter((m: SyncInboxMessage) => !processedInboxIds.includes(m.id));
    cur.activeSession = outbox;
    cur.sessions = sessions;
    if (sessionDetails) cur.sessionDetails = sessionDetails;
    if (appVersion) cur.appVersion = appVersion;
    cur.updatedAt = Date.now();
    await this.saveSyncPayload(cur);
  }

  private async saveSyncPayload(payload: SyncGistPayload): Promise<void> {
    if (this.isBlockedByRateLimit()) return;
    const content = encryptSyncData(JSON.stringify(payload), this.config.password);
    const res = await fetch(`${this.baseUrl}/gists/${this.config.gistId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ files: { 'agent-sync.json': { content } } }),
    });
    this.updateRateLimit(res);
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) return;
      const err = await this.parseErrorMessage(res, 'Failed to update Gist');
      throw new Error(`Failed to update Gist: ${err}`);
    }
    this.cachedPayload = payload;
  }
}
