import type { GistSyncConfig, SyncGistPayload, SyncInboxMessage, SyncOutboxState } from './types';
import { encryptSyncData, decryptSyncData } from './syncCrypto';
import { compressPayload, decompressPayload } from './payloadCompressor';
import type { SessionSummary } from '../server/types';
import { createRateLimitState, updateRateLimitFromResponse, buildGistHeaders, parseGistError, type RateLimitState } from './gistHttp';

export class GistClient {
  private readonly baseUrl: string;
  private readonly rateLimit: RateLimitState = createRateLimitState();
  private cachedPayload: SyncGistPayload | null = null;

  constructor(private readonly config: GistSyncConfig, baseUrl = 'https://api.github.com') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get rateLimitReset(): number { return this.rateLimit.rateLimitReset; }
  set rateLimitReset(val: number) { this.rateLimit.rateLimitReset = val; }
  get isRateLimited(): boolean { return this.rateLimit.isRateLimited; }
  set isRateLimited(val: boolean) { this.rateLimit.isRateLimited = val; }

  private updateRateLimit(res: Response | { status: number; headers: { get: (k: string) => string | null } }): void {
    updateRateLimitFromResponse(this.rateLimit, res as any);
  }

  isBlockedByRateLimit(): boolean {
    if (this.rateLimit.isRateLimited && Date.now() < this.rateLimit.rateLimitReset) return true;
    this.rateLimit.isRateLimited = false;
    return false;
  }

  getRateLimitInfo(): { remaining: number; limit: number; resetTime: number; isBlocked: boolean } {
    return {
      remaining: this.rateLimit.remaining,
      limit: this.rateLimit.limit,
      resetTime: this.rateLimit.rateLimitReset,
      isBlocked: this.isBlockedByRateLimit(),
    };
  }

  async fetchSyncState(etag?: string): Promise<{ data: SyncGistPayload | null; etag?: string; notModified: boolean }> {
    if (this.isBlockedByRateLimit()) return { data: null, etag, notModified: true };
    const res = await fetch(`${this.baseUrl}/gists/${this.config.gistId}`, { headers: buildGistHeaders(this.config.token, etag) });
    this.updateRateLimit(res);

    if (res.status === 304) return { data: null, etag, notModified: true };
    if (!res.ok) throw new Error(`GitHub Gist API error: ${await parseGistError(res, 'Gist error')}`);

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
      const decrypted = decryptSyncData(raw, this.config.password);
      const decompressed = await decompressPayload(decrypted);
      const p = JSON.parse(decompressed) as SyncGistPayload;
      const data: SyncGistPayload = {
        inbox: Array.isArray(p?.inbox) ? p.inbox : [], sessions: Array.isArray(p?.sessions) ? p.sessions : [],
        version: typeof p?.version === 'number' ? p.version : 1, updatedAt: typeof p?.updatedAt === 'number' ? p.updatedAt : Date.now(),
        sessionDetails: p?.sessionDetails && typeof p.sessionDetails === 'object' ? p.sessionDetails : {}, activeSession: p?.activeSession,
        appVersion: typeof p?.appVersion === 'string' ? p.appVersion : undefined,
      };
      this.cachedPayload = data;
      return { data, etag: newEtag, notModified: false };
    } catch (err: any) {
      if (raw.startsWith('enc:') || raw.startsWith('cz:')) {
        throw new Error(`Failed to decrypt/parse Gist payload: ${err?.message || 'Invalid password or format'}`);
      }
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
    if (this.isBlockedByRateLimit()) {
      const waitMin = Math.max(1, Math.ceil((this.rateLimit.rateLimitReset - Date.now()) / 60000));
      throw new Error(`GitHub API rate limit exceeded. Reset in ${waitMin}m. Please use local LAN / Live connection.`);
    }
    const jsonStr = JSON.stringify(payload);
    const compressed = await compressPayload(jsonStr);
    const content = encryptSyncData(compressed, this.config.password);
    const res = await fetch(`${this.baseUrl}/gists/${this.config.gistId}`, {
      method: 'PATCH',
      headers: buildGistHeaders(this.config.token),
      body: JSON.stringify({ files: { 'agent-sync.json': { content } } }),
    });
    this.updateRateLimit(res);
    if (!res.ok) {
      const err = await parseGistError(res, 'Failed to update Gist');
      throw new Error(`Failed to update Gist: ${err}`);
    }
    this.cachedPayload = payload;
  }
}
